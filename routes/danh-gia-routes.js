const express = require("express");
const DanhGia = require("../models/danh-gia-model");
const Quan = require("../models/admin-models");
const DonHang = require("../models/don-hang-models");
const { layPhien } = require("../middleware/xac-thuc-noi-bo");

const router = express.Router();

// Lấy danh sách đánh giá & thống kê điểm của quán
router.get("/quan/:maQuan/danh-gia", async (req, res) => {
  try {
    const { maQuan } = req.params;
    const danhSach = await DanhGia.find({ maQuan })
      .sort({ createdAt: -1 })
      .lean();

    const tongDanhGia = danhSach.length;
    let diemTrungBinh = 0;
    const phanBoSao = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const diemChiTiet = { amThanh: 0, anhSang: 0, phucVu: 0, giaCa: 0 };

    if (tongDanhGia > 0) {
      let tongDiem = 0;
      let tongAmThanh = 0;
      let tongAnhSang = 0;
      let tongPhucVu = 0;
      let tongGiaCa = 0;

      danhSach.forEach((dg) => {
        tongDiem += dg.soSao;
        const sao = Math.min(5, Math.max(1, Math.round(dg.soSao)));
        phanBoSao[sao] = (phanBoSao[sao] || 0) + 1;

        tongAmThanh += dg.tieuChi?.amThanh || dg.soSao;
        tongAnhSang += dg.tieuChi?.anhSang || dg.soSao;
        tongPhucVu += dg.tieuChi?.phucVu || dg.soSao;
        tongGiaCa += dg.tieuChi?.giaCa || dg.soSao;
      });

      diemTrungBinh = Number((tongDiem / tongDanhGia).toFixed(1));
      diemChiTiet.amThanh = Number((tongAmThanh / tongDanhGia).toFixed(1));
      diemChiTiet.anhSang = Number((tongAnhSang / tongDanhGia).toFixed(1));
      diemChiTiet.phucVu = Number((tongPhucVu / tongDanhGia).toFixed(1));
      diemChiTiet.giaCa = Number((tongGiaCa / tongDanhGia).toFixed(1));
    }

    res.json({
      danhSach,
      thongKe: {
        tongDanhGia,
        diemTrungBinh,
        phanBoSao,
        diemChiTiet,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Không thể tải danh sách đánh giá của quán." });
  }
});

// Gửi đánh giá cho quán
router.post("/quan/:maQuan/danh-gia", async (req, res) => {
  const phien = layPhien(req);
  if (phien?.vaiTro !== "khach-hang") {
    return res
      .status(401)
      .json({
        message: "Vui lòng đăng nhập tài khoản khách hàng để đánh giá quán.",
      });
  }

  try {
    const { maQuan } = req.params;
    const { soSao, noiDung, tieuChi } = req.body;

    const soSaoNum = Number(soSao);
    if (!soSaoNum || soSaoNum < 1 || soSaoNum > 5) {
      return res.status(400).json({ message: "Số sao phải từ 1 đến 5." });
    }
    if (!noiDung || typeof noiDung !== "string" || !noiDung.trim()) {
      return res
        .status(400)
        .json({
          message: "Vui lòng viết nội dung nhận xét (tối thiểu vài từ).",
        });
    }

    const quan = await Quan.findOne({ maQuan }).select("maQuan tenQuan").lean();
    if (!quan) {
      return res
        .status(404)
        .json({ message: "Quán không tồn tại trong hệ thống." });
    }

    const nguoiDung = await NguoiDung.findOne({ email: phien.taiKhoan })
      .select("hoTen email")
      .lean();
    const tenKhach = nguoiDung?.hoTen || phien.taiKhoan.split("@")[0];

    // Kiểm tra xem khách đã từng hoàn thành đơn đặt phòng tại quán này chưa
    const daTungDatPhong = Boolean(
      await DonHang.exists({
        emailKhach: phien.taiKhoan,
        maQuan,
        trangThai: "Đặt phòng thành công",
      }),
    );

    const danhGiaMoi = await DanhGia.create({
      maQuan: quan.maQuan,
      tenQuan: quan.tenQuan,
      emailKhach: phien.taiKhoan,
      tenKhach,
      soSao: soSaoNum,
      tieuChi: {
        amThanh: Math.min(5, Math.max(1, Number(tieuChi?.amThanh) || soSaoNum)),
        anhSang: Math.min(5, Math.max(1, Number(tieuChi?.anhSang) || soSaoNum)),
        phucVu: Math.min(5, Math.max(1, Number(tieuChi?.phucVu) || soSaoNum)),
        giaCa: Math.min(5, Math.max(1, Number(tieuChi?.giaCa) || soSaoNum)),
      },
      noiDung: noiDung.trim().slice(0, 1000),
      daTungDatPhong,
    });

    res.status(201).json({
      message: "Cảm ơn bạn đã gửi đánh giá.",
      danhGia: danhGiaMoi,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Không thể lưu đánh giá của bạn lúc này." });
  }
});

module.exports = router;
