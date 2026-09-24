const express = require("express");
const crypto = require("crypto");
const BaiViet = require("../models/dien-dan-model");
const Quan = require("../models/admin-models");
const NguoiDung = require("../models/nguoi-dung-model");
const { layPhien } = require("../middleware/xac-thuc-noi-bo");

const router = express.Router();

function dangLaVip(nguoiDung) {
  const trangThai = String(nguoiDung?.vipTrangThai || "")
    .trim()
    .toUpperCase();
  const hetHan = nguoiDung?.vipHetHan ? new Date(nguoiDung.vipHetHan) : null;
  return trangThai === "VIP" && (!hetHan || hetHan > new Date());
}

// Lấy danh sách bài viết diễn đàn cộng đồng
router.get("/dien-dan", async (req, res) => {
  try {
    const { chuDe, tuKhoa, sapXep } = req.query;
    const filter = {};

    if (chuDe && chuDe !== "Tất cả") {
      filter.chuDe = chuDe;
    }

    if (tuKhoa && typeof tuKhoa === "string" && tuKhoa.trim()) {
      filter.$or = [
        { tieuDe: { $regex: tuKhoa.trim(), $options: "i" } },
        { noiDung: { $regex: tuKhoa.trim(), $options: "i" } },
        { tenQuanLienQuan: { $regex: tuKhoa.trim(), $options: "i" } },
        { tenNguoiDang: { $regex: tuKhoa.trim(), $options: "i" } },
      ];
    }

    const sortOption =
      sapXep === "noi-bat"
        ? { "luotThich.length": -1, createdAt: -1 }
        : { createdAt: -1 };
    const danhSach = await BaiViet.find(filter).sort(sortOption).lean();

    const phien = layPhien(req);
    const emailHienTai = phien?.vaiTro === "khach-hang" ? phien.taiKhoan : null;

    const ketQua = danhSach.map((bai) => ({
      _id: bai._id,
      tieuDe: bai.tieuDe,
      noiDung: bai.noiDung,
      chuDe: bai.chuDe,
      tenNguoiDang: bai.tenNguoiDang,
      emailNguoiDang: bai.emailNguoiDang,
      laVip: Boolean(bai.laVip),
      maQuanLienQuan: bai.maQuanLienQuan,
      tenQuanLienQuan: bai.tenQuanLienQuan,
      soLuotThich: (bai.luotThich || []).length,
      daThich: emailHienTai
        ? (bai.luotThich || []).includes(emailHienTai)
        : false,
      laTacGia: emailHienTai ? bai.emailNguoiDang === emailHienTai : false,
      soBinhLuan: (bai.binhLuan || []).length,
      binhLuan: bai.binhLuan || [],
      createdAt: bai.createdAt,
    }));

    res.json(ketQua);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Không thể tải danh sách bài viết cộng đồng." });
  }
});

// Đăng bài viết mới lên diễn đàn
router.post("/dien-dan", async (req, res) => {
  const phien = layPhien(req);
  if (phien?.vaiTro !== "khach-hang") {
    return res
      .status(401)
      .json({
        message:
          "Vui lòng đăng nhập tài khoản khách hàng để chia sẻ trên cộng đồng.",
      });
  }

  try {
    const { tieuDe, noiDung, chuDe, maQuanLienQuan } = req.body;

    if (!tieuDe || typeof tieuDe !== "string" || !tieuDe.trim()) {
      return res
        .status(400)
        .json({ message: "Vui lòng nhập tiêu đề bài viết." });
    }
    if (!noiDung || typeof noiDung !== "string" || !noiDung.trim()) {
      return res
        .status(400)
        .json({ message: "Vui lòng nhập nội dung bài viết." });
    }

    const nguoiDung = await NguoiDung.findOne({ email: phien.taiKhoan })
      .select("hoTen vipTrangThai vipHetHan")
      .lean();
    const tenNguoiDang = nguoiDung?.hoTen || phien.taiKhoan.split("@")[0];
    const laVip = dangLaVip(nguoiDung);

    let tenQuanLienQuan = "";
    if (maQuanLienQuan) {
      const quan = await Quan.findOne({ maQuan: maQuanLienQuan })
        .select("tenQuan")
        .lean();
      if (quan) tenQuanLienQuan = quan.tenQuan;
    }

    const baiViet = await BaiViet.create({
      tieuDe: tieuDe.trim().slice(0, 180),
      noiDung: noiDung.trim().slice(0, 3000),
      chuDe: [
        "Giao lưu",
        "Rủ hát / Bắt kèo",
        "Review quán",
        "Hỏi đáp & Kinh nghiệm",
      ].includes(chuDe)
        ? chuDe
        : "Giao lưu",
      emailNguoiDang: phien.taiKhoan,
      tenNguoiDang,
      laVip,
      maQuanLienQuan: maQuanLienQuan || "",
      tenQuanLienQuan,
      luotThich: [],
      binhLuan: [],
    });

    res.status(201).json({ message: "Đăng bài thành công!", baiViet });
  } catch (error) {
    res.status(500).json({ message: "Không thể đăng bài viết lúc này." });
  }
});

// Thích / Bỏ thích bài viết (Toggle Like)
router.post("/dien-dan/:id/thich", async (req, res) => {
  const phien = layPhien(req);
  if (phien?.vaiTro !== "khach-hang") {
    return res
      .status(401)
      .json({ message: "Vui lòng đăng nhập để bày tỏ cảm xúc." });
  }

  try {
    const baiViet = await BaiViet.findById(req.params.id);
    if (!baiViet) {
      return res
        .status(404)
        .json({ message: "Bài viết không tồn tại hoặc đã bị xóa." });
    }

    const email = phien.taiKhoan;
    const index = baiViet.luotThich.indexOf(email);
    let daThich = false;

    if (index > -1) {
      baiViet.luotThich.splice(index, 1);
      daThich = false;
    } else {
      baiViet.luotThich.push(email);
      daThich = true;
    }

    await baiViet.save();

    res.json({
      daThich,
      soLuotThich: baiViet.luotThich.length,
    });
  } catch (error) {
    res.status(500).json({ message: "Không thể cập nhật lượt thích." });
  }
});

// Gửi bình luận / Trao đổi thảo luận dưới bài viết
router.post("/dien-dan/:id/binh-luan", async (req, res) => {
  const phien = layPhien(req);
  if (phien?.vaiTro !== "khach-hang") {
    return res
      .status(401)
      .json({ message: "Vui lòng đăng nhập để bình luận trao đổi." });
  }

  try {
    const { noiDung } = req.body;
    if (!noiDung || typeof noiDung !== "string" || !noiDung.trim()) {
      return res
        .status(400)
        .json({ message: "Nội dung bình luận không được để trống." });
    }

    const baiViet = await BaiViet.findById(req.params.id);
    if (!baiViet) {
      return res.status(404).json({ message: "Bài viết không tồn tại." });
    }

    const nguoiDung = await NguoiDung.findOne({ email: phien.taiKhoan })
      .select("hoTen vipTrangThai vipHetHan")
      .lean();
    const tenNguoiBinhLuan = nguoiDung?.hoTen || phien.taiKhoan.split("@")[0];
    const laVip = dangLaVip(nguoiDung);

    const binhLuanMoi = {
      id: crypto.randomUUID(),
      emailNguoiBinhLuan: phien.taiKhoan,
      tenNguoiBinhLuan,
      laVip,
      noiDung: noiDung.trim().slice(0, 600),
      createdAt: new Date(),
    };

    baiViet.binhLuan.push(binhLuanMoi);
    await baiViet.save();

    res.status(201).json({
      message: "Đã gửi bình luận!",
      binhLuan: binhLuanMoi,
      soBinhLuan: baiViet.binhLuan.length,
    });
  } catch (error) {
    res.status(500).json({ message: "Không thể gửi bình luận lúc này." });
  }
});

// Xóa bài viết
router.delete("/dien-dan/:id", async (req, res) => {
  const phien = layPhien(req);
  if (!phien) return res.status(401).json({ message: "Vui lòng đăng nhập." });

  try {
    const baiViet = await BaiViet.findById(req.params.id);
    if (!baiViet)
      return res.status(404).json({ message: "Bài viết không tồn tại." });

    const laAdminHoacNhanVien = ["admin", "nhanvien"].includes(phien.vaiTro);
    const laTacGia =
      phien.vaiTro === "khach-hang" &&
      baiViet.emailNguoiDang === phien.taiKhoan;

    if (!laAdminHoacNhanVien && !laTacGia) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền xóa bài viết này." });
    }

    await BaiViet.findByIdAndDelete(req.params.id);
    res.json({ message: "Đã xóa bài viết thành công." });
  } catch (error) {
    res.status(500).json({ message: "Không thể xóa bài viết." });
  }
});

module.exports = router;
