// Import Express va router de tao cac API quan ly quan
const express = require("express");
const crypto = require("crypto");
const router = express.Router();

// Import model Quan de thao tac voi collection admin trong MongoDB
const Quan = require("../models/admin-models");
const TaiKhoan = require("../models/tai-khoan-models");

const BI_MAT_PHien = process.env.SESSION_SECRET || "ktv-session-secret-local";

function taoPhienNoiBo(taiKhoan, vaiTro) {
  const duLieu = Buffer.from(
    JSON.stringify({
      taiKhoan,
      vaiTro,
      hetHan: Date.now() + 24 * 60 * 60 * 1000,
    }),
  ).toString("base64url");
  const chuKy = crypto
    .createHmac("sha256", BI_MAT_PHien)
    .update(duLieu)
    .digest("base64url");
  return `${duLieu}.${chuKy}`;
}

function layPhien(req) {
  const cookie = req.headers.cookie || "";
  const cap = cookie.match(/phien_dang_nhap=([^;]+)/);
  if (!cap) return null;

  const [duLieu, chuKy] = cap[1].split(".");
  if (!duLieu || !chuKy) return null;

  const chuKyDung = crypto
    .createHmac("sha256", BI_MAT_PHien)
    .update(duLieu)
    .digest("base64url");
  if (chuKy !== chuKyDung) return null;

  try {
    const phien = JSON.parse(Buffer.from(duLieu, "base64url").toString("utf8"));
    return phien.hetHan > Date.now() ? phien : null;
  } catch {
    return null;
  }
}

function yeuCauDangNhap(req, res, next) {
  const phien = layPhien(req);
  if (!phien) {
    return res.status(401).json({ message: "Bạn cần đăng nhập nội bộ." });
  }
  req.taiKhoanNoiBo = phien;
  next();
}

function yeuCauAdmin(req, res, next) {
  yeuCauDangNhap(req, res, () => {
    if (req.taiKhoanNoiBo.vaiTro !== "admin") {
      return res
        .status(403)
        .json({ message: "Chỉ Admin được thực hiện thao tác này." });
    }
    next();
  });
}

// API: Dang nhap tai khoan admin/nhan vien
router.post("/dang-nhap-noi-bo", async (req, res) => {
  try {
    const { taiKhoan, matKhau, vaiTro } = req.body;
    const taiKhoanTimDuoc = await TaiKhoan.findOne({
      tendangnhap: taiKhoan,
      matkhau: matKhau,
      vaitro: vaiTro,
    }).lean();

    if (!taiKhoanTimDuoc) {
      return res
        .status(401)
        .json({ message: "Tài khoản hoặc mật khẩu không đúng." });
    }

    const maPhien = taoPhienNoiBo(
      taiKhoanTimDuoc.tendangnhap,
      taiKhoanTimDuoc.vaitro,
    );
    res.setHeader(
      "Set-Cookie",
      `phien_dang_nhap=${maPhien}; Max-Age=86400; HttpOnly; SameSite=Lax; Path=/`,
    );

    res.json({
      message: "Đăng nhập thành công.",
      vaiTro: taiKhoanTimDuoc.vaitro,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// API: Lay quyen cua phien hien tai
router.get("/quyen-noi-bo", yeuCauDangNhap, (req, res) => {
  res.json(req.taiKhoanNoiBo);
});

// API: Tao ma quan ke tiep
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

// API: Lay danh sach quan
router.get("/quan", yeuCauDangNhap, async (req, res) => {
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
      boLoc.$or = [
        { tenQuan: { $regex: tuKhoa, $options: "i" } },
        { soDienThoai: { $regex: tuKhoa, $options: "i" } },
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

// Xuat router de server.js su dung
router.yeuCauDangNhap = yeuCauDangNhap;
module.exports = router;
