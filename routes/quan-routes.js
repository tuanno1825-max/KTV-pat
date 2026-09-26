const express = require("express");
const Quan = require("../models/admin-models");
const { yeuCauAdmin } = require("../middleware/xac-thuc-noi-bo");
const router = express.Router();

function escapeRegex(chuoi) {
  return String(chuoi).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
router.get("/quan/ma-moi", yeuCauAdmin, async (req, res) => {
  try {
    const quanCuoi = await Quan.findOne({ maQuan: /^Q\d+$/ })
      .sort({ maQuan: -1 })
      .select("maQuan")
      .lean();
    const soCuoi = quanCuoi ? Number(quanCuoi.maQuan.slice(1)) : 0;
    res.json({ maQuan: `Q${String(soCuoi + 1).padStart(3, "0")}` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const DanhGia = require("../models/danh-gia-model");

// API cong khai: Lay cac quan dang hoat dong cho trang dat phong
router.get("/quan-cong-khai", async (req, res) => {
  try {
    const [danhSachQuan, thongKeDanhGia] = await Promise.all([
      Quan.find({})
        .select(
          "maQuan tenQuan diaChiChiTiet khuVuc anhQuan chietKhau giaMin giaMax trangThai",
        )
        .sort({ _id: -1 })
        .lean(),
      DanhGia.aggregate([
        {
          $group: {
            _id: "$maQuan",
            diemTrungBinh: { $avg: "$soSao" },
            soDanhGia: { $sum: 1 },
          },
        },
      ]),
    ]);

    const banDoDanhGia = new Map(
      thongKeDanhGia.map((item) => [
        item._id,
        {
          diemTrungBinh: Number(item.diemTrungBinh.toFixed(1)),
          soDanhGia: item.soDanhGia,
        },
      ]),
    );

    res.json(
      danhSachQuan.map((quan) => {
        const danhGia = banDoDanhGia.get(quan.maQuan);
        return {
          maQuan: quan.maQuan,
          ten: quan.tenQuan,
          diaChi: quan.diaChiChiTiet,
          khuVuc: quan.khuVuc,
          anhQuan: quan.anhQuan,
          chietKhau: quan.chietKhau,
          giaMin: quan.giaMin ?? 0,
          giaMax: quan.giaMax ?? 0,
          trangThai: quan.trangThai,
          diemTrungBinh: danhGia ? danhGia.diemTrungBinh : 5.0,
          soDanhGia: danhGia ? danhGia.soDanhGia : 0,
        };
      }),
    );
  } catch (error) {
    res.status(500).json({ message: "Không thể tải danh sách quán." });
  }
});

// API công khai: ghi nhận yêu cầu đặt phòng
// API: Lay danh sach quan
router.get("/quan", yeuCauAdmin, async (req, res) => {
  try {
    const { quanHuyen, trangThai, tuKhoa } = req.query;
    const boLoc = {};

    if (quanHuyen && quanHuyen !== "Tất cả") {
      boLoc.khuVuc = quanHuyen;
    }

    if (trangThai && trangThai !== "Tất cả") {
      boLoc.trangThai = trangThai;
    }

    if (tuKhoa) {
      const tuKhoaAnToan = escapeRegex(tuKhoa);
      boLoc.$or = [
        { tenQuan: { $regex: tuKhoaAnToan, $options: "i" } },
        { soDienThoai: { $regex: tuKhoaAnToan, $options: "i" } },
      ];
    }

    const danhSachQuan = await Quan.find(boLoc).sort({ _id: -1 }).lean();
    res.json(
      danhSachQuan.map((quan) => ({
        ...quan,
        quanHuyen: quan.khuVuc,
      })),
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// API: Them quan moi
router.post("/quan", yeuCauAdmin, async (req, res) => {
  try {
    const { giaMin, giaMax } = req.body;
    if (
      !Number.isFinite(Number(giaMin)) ||
      !Number.isFinite(Number(giaMax)) ||
      Number(giaMin) < 0 ||
      Number(giaMax) < Number(giaMin)
    ) {
      return res.status(400).json({
        message:
          "Giá tối đa phải lớn hơn hoặc bằng giá tối thiểu và cả hai giá phải từ 0 trở lên.",
      });
    }
    const quanMoi = new Quan({
      ...req.body,
      khuVuc: req.body.quanHuyen,
    });
    await quanMoi.save();
    res.status(201).json(quanMoi);
  } catch (error) {
    res.status(400).json({
      message: error.code === 11000 ? "Mã quán đã tồn tại" : error.message,
    });
  }
});

// API: Cap nhat thong tin quan theo ID
router.put("/quan/:id", yeuCauAdmin, async (req, res) => {
  try {
    const { giaMin, giaMax } = req.body;
    if (
      !Number.isFinite(Number(giaMin)) ||
      !Number.isFinite(Number(giaMax)) ||
      Number(giaMin) < 0 ||
      Number(giaMax) < Number(giaMin)
    ) {
      return res.status(400).json({
        message:
          "Giá tối đa phải lớn hơn hoặc bằng giá tối thiểu và cả hai giá phải từ 0 trở lên.",
      });
    }
    const quanDaCapNhat = await Quan.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        khuVuc: req.body.quanHuyen,
      },
      { new: true, runValidators: true },
    );

    if (!quanDaCapNhat) {
      return res.status(404).json({ message: "Không tìm thấy quán" });
    }

    res.json(quanDaCapNhat);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// API: Xoa quan theo ID
router.delete("/quan/:id", yeuCauAdmin, async (req, res) => {
  try {
    const quanDaXoa = await Quan.findByIdAndDelete(req.params.id);

    if (!quanDaXoa) {
      return res.status(404).json({ message: "Không tìm thấy quán" });
    }

    res.json({ message: "Xóa quán thành công" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
