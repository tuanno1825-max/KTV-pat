const express = require("express");
const crypto = require("crypto");
const { promisify } = require("util");
const NguoiDung = require("../models/nguoi-dung-model");
const DonHang = require("../models/don-hang-models");
const TaiKhoan = require("../models/tai-khoan-models");
const {
  taoPhienNoiBo,
  layPhien,
  yeuCauDangNhap,
} = require("../middleware/xac-thuc-noi-bo");
const router = express.Router();
const scrypt = promisify(crypto.scrypt);

router.get("/phien-khach-hang", async (req, res) => {
  const phien = layPhien(req);
  const daDangNhap =
    phien?.vaiTro === "khach-hang"
      ? Boolean(await NguoiDung.exists({ email: phien.taiKhoan }))
      : false;
  res.json({
    daDangNhap,
    email: daDangNhap ? phien.taiKhoan : null,
  });
});

router.get("/thong-tin-ca-nhan", async (req, res) => {
  const phien = layPhien(req);
  if (phien?.vaiTro !== "khach-hang") {
    return res
      .status(401)
      .json({ message: "Vui lòng đăng nhập tài khoản khách hàng." });
  }
  try {
    const user = await NguoiDung.findOne({ email: phien.taiKhoan }).lean();
    if (!user)
      return res
        .status(404)
        .json({ message: "Không tìm thấy tài khoản khách hàng." });
    const [tongThanhCong, tongKhongDen] = await Promise.all([
      DonHang.countDocuments({
        emailKhach: user.email,
        trangThai: "Đặt phòng thành công",
      }),
      DonHang.countDocuments({
        emailKhach: user.email,
        trangThai: "Khách không đến",
      }),
    ]);
    const maKhachHang = await NguoiDung.damBaoMaKhachHang(user);
    const vipHetHan = user.vipHetHan ? new Date(user.vipHetHan) : null;
    res.json({
      hoTen: user.hoTen,
      email: user.email,
      maKhachHang,
      diemTichLuy: user.diemTichLuy || 0,
      tongThanhCong,
      tongKhongDen,
      vipTrangThai: user.vipTrangThai,
      vipHetHan: user.vipHetHan,
      laVip:
        user.vipTrangThai === "VIP" && (!vipHetHan || vipHetHan > new Date()),
    });
  } catch (error) {
    console.error("Lỗi tải thông tin cá nhân:", error);
    res.status(500).json({ message: "Không thể tải điểm tích cực lúc này." });
  }
});

router.post("/dang-xuat", (req, res) => {
  res.setHeader(
    "Set-Cookie",
    "phien_dang_nhap=; Max-Age=0; HttpOnly; SameSite=Lax; Path=/",
  );
  res.json({ message: "Đã đăng xuất." });
});

function bamMatKhau(matKhau) {
  const muoi = crypto.randomBytes(16).toString("hex");
  return scrypt(matKhau, muoi, 64).then(
    (khoa) => `${muoi}:${khoa.toString("hex")}`,
  );
}

async function soSanhMatKhau(matKhau, giaTriDaBam) {
  const [muoi, khoaHex] = giaTriDaBam.split(":");
  if (!muoi || !khoaHex) return false;
  const khoa = await scrypt(matKhau, muoi, 64);
  const khoaCu = Buffer.from(khoaHex, "hex");
  return khoa.length === khoaCu.length && crypto.timingSafeEqual(khoa, khoaCu);
}

router.post("/dang-ky", async (req, res) => {
  try {
    const hoTen =
      typeof req.body?.hoTen === "string" ? req.body.hoTen.trim() : "";
    const email =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";
    const matKhau =
      typeof req.body?.matKhau === "string" ? req.body.matKhau : "";
    if (req.body?.dongYDieuKhoan !== true) {
      return res
        .status(400)
        .json({ message: "Vui lòng đồng ý với điều khoản sử dụng." });
    }
    if (
      !hoTen ||
      hoTen.length > 100 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return res
        .status(400)
        .json({ message: "Vui lòng nhập họ tên và email hợp lệ." });
    }
    if (matKhau.length < 6 || matKhau.length > 128) {
      return res
        .status(400)
        .json({ message: "Mật khẩu cần từ 6 đến 128 ký tự." });
    }
    const matKhauDaBam = await bamMatKhau(matKhau);
    await NguoiDung.create({ hoTen, email, matKhau: matKhauDaBam });
    return res
      .status(201)
      .json({ message: "Đăng ký thành công. Bạn có thể đăng nhập ngay." });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Email này đã được đăng ký." });
    }
    console.error("Lỗi đăng ký khách hàng:", error);
    return res
      .status(500)
      .json({ message: "Không thể tạo tài khoản lúc này. Vui lòng thử lại." });
  }
});

router.post("/dang-nhap", async (req, res) => {
  try {
    const email =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";
    const matKhau =
      typeof req.body?.matKhau === "string" ? req.body.matKhau : "";
    const nguoiDung = await NguoiDung.findOne({ email }).select("+matKhau");
    if (!nguoiDung || !(await soSanhMatKhau(matKhau, nguoiDung.matKhau))) {
      return res
        .status(401)
        .json({ message: "Email hoặc mật khẩu không đúng." });
    }
    const maPhien = taoPhienNoiBo(nguoiDung.email, "khach-hang");
    res.setHeader(
      "Set-Cookie",
      `phien_dang_nhap=${maPhien}; Max-Age=86400; HttpOnly; SameSite=Lax; Path=/`,
    );
    return res.json({ message: "Đăng nhập thành công." });
  } catch (error) {
    console.error("Lỗi đăng nhập khách hàng:", error);
    return res
      .status(500)
      .json({ message: "Không thể đăng nhập lúc này. Vui lòng thử lại." });
  }
});

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

module.exports = router;
