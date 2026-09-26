const express = require("express");
const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const { promisify } = require("util");
const NguoiDung = require("../models/nguoi-dung-model");
const DonHang = require("../models/don-hang-models");
const TaiKhoan = require("../models/tai-khoan-models");
const YeuCauMatKhau = require("../models/yeu-cau-mat-khau-model");
const {
  taoPhienNoiBo,
  layPhien,
  yeuCauDangNhap,
} = require("../middleware/xac-thuc-noi-bo");
const router = express.Router();
const scrypt = promisify(crypto.scrypt);
const thuMucAvatar = path.join(__dirname, "..", "public", "uploads", "avatars");
const gioiHanAvatar = 2 * 1024 * 1024;

function docAvatar(dataUrl) {
  const khop =
    typeof dataUrl === "string" &&
    dataUrl.match(
      /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+=*)$/,
    );
  if (!khop) return null;
  const duLieu = Buffer.from(khop[2], "base64");
  if (!duLieu.length || duLieu.length > gioiHanAvatar) return null;
  const dungDinhDang =
    khop[1] === "image/png"
      ? duLieu
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : khop[1] === "image/jpeg"
        ? duLieu[0] === 255 &&
          duLieu[1] === 216 &&
          duLieu[duLieu.length - 2] === 255 &&
          duLieu[duLieu.length - 1] === 217
        : duLieu.toString("ascii", 0, 4) === "RIFF" &&
          duLieu.toString("ascii", 8, 12) === "WEBP";
  if (!dungDinhDang) return null;
  return {
    duLieu,
    duoi:
      khop[1] === "image/jpeg"
        ? ".jpg"
        : khop[1] === "image/png"
          ? ".png"
          : ".webp",
  };
}

function duongDanAvatarNoiBo(avatarUrl) {
  const tep = path.basename(String(avatarUrl || ""));
  if (!/^[0-9a-f-]{36}\.(?:jpg|png|webp)$/i.test(tep)) return null;
  return path.join(thuMucAvatar, tep);
}

router.get("/phien-khach-hang", async (req, res) => {
  const phien = layPhien(req);
  const user =
    phien?.vaiTro === "khach-hang"
      ? await NguoiDung.findOne({ email: phien.taiKhoan })
          .select("email hoTen bietDanh avatarUrl avatarZoom")
          .lean()
      : null;
  res.json({
    daDangNhap: Boolean(user),
    email: user?.email || null,
    bietDanh: user?.bietDanh || user?.hoTen || null,
    avatarUrl: user?.avatarUrl || "",
    avatarZoom: user?.avatarZoom || 1.4,
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
      bietDanh: user.bietDanh || user.hoTen,
      avatarUrl: user.avatarUrl || "",
      avatarZoom: user.avatarZoom || 1.4,
      email: user.email,
      soDienThoai: user.soDienThoai || "",
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

router.patch("/thong-tin-ca-nhan", async (req, res) => {
  const phien = layPhien(req);
  if (phien?.vaiTro !== "khach-hang") {
    return res
      .status(401)
      .json({ message: "Vui lòng đăng nhập tài khoản khách hàng." });
  }

  const bietDanh =
    typeof req.body?.bietDanh === "string" ? req.body.bietDanh.trim() : "";
  const soDienThoai = String(req.body?.soDienThoai || "")
    .replace(/[\s().-]/g, "")
    .replace(/^\+84/, "0");
  const avatarZoom = Number(req.body?.avatarZoom ?? 1.4);
  const xoaAvatar = req.body?.xoaAvatar === true;
  const anh = req.body?.avatarDataUrl
    ? docAvatar(req.body.avatarDataUrl)
    : null;
  if (!bietDanh || bietDanh.length > 40) {
    return res
      .status(400)
      .json({ message: "Biệt danh cần từ 1 đến 40 ký tự." });
  }
  if (!/^0\d{9}$/.test(soDienThoai)) {
    return res
      .status(400)
      .json({ message: "Số điện thoại phải có 10 chữ số hợp lệ." });
  }
  if (!Number.isFinite(avatarZoom) || avatarZoom < 1 || avatarZoom > 2.2) {
    return res.status(400).json({ message: "Mức căn ảnh không hợp lệ." });
  }
  if (req.body?.avatarDataUrl && !anh) {
    return res.status(400).json({
      message:
        "Ảnh đại diện phải là JPG, PNG hoặc WEBP và không vượt quá 2 MB.",
    });
  }
  if (xoaAvatar && anh) {
    return res
      .status(400)
      .json({ message: "Chỉ chọn thay ảnh hoặc xóa ảnh trong một lần lưu." });
  }

  let avatarMoi = "";
  let duongDanMoi = null;
  try {
    const user = await NguoiDung.findOne({ email: phien.taiKhoan });
    if (!user)
      return res
        .status(404)
        .json({ message: "Không tìm thấy tài khoản khách hàng." });
    const avatarCu = user.avatarUrl;

    if (anh) {
      await fs.mkdir(thuMucAvatar, { recursive: true });
      const tep = `${crypto.randomUUID()}${anh.duoi}`;
      duongDanMoi = path.join(thuMucAvatar, tep);
      await fs.writeFile(duongDanMoi, anh.duLieu, { flag: "wx" });
      avatarMoi = `/uploads/avatars/${tep}`;
    }

    user.bietDanh = bietDanh;
    user.soDienThoai = soDienThoai;
    user.avatarZoom = avatarZoom;
    if (anh) user.avatarUrl = avatarMoi;
    else if (xoaAvatar) user.avatarUrl = "";
    await user.save();

    if ((anh || xoaAvatar) && avatarCu && avatarCu !== user.avatarUrl) {
      const duongDanCu = duongDanAvatarNoiBo(avatarCu);
      if (duongDanCu) await fs.unlink(duongDanCu).catch(() => {});
    }
    return res.json({
      message: "Đã cập nhật thông tin cá nhân.",
      bietDanh: user.bietDanh,
      soDienThoai: user.soDienThoai || "",
      avatarUrl: user.avatarUrl || "",
      avatarZoom: user.avatarZoom,
    });
  } catch (error) {
    if (duongDanMoi) await fs.unlink(duongDanMoi).catch(() => {});
    console.error("Lỗi cập nhật hồ sơ khách hàng:", error.message);
    return res
      .status(500)
      .json({ message: "Không thể cập nhật hồ sơ lúc này." });
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
    const soDienThoai = String(req.body?.soDienThoai || "")
      .replace(/[\s().-]/g, "")
      .replace(/^\+84/, "0");
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
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !/^0\d{9}$/.test(soDienThoai)
    ) {
      return res.status(400).json({
        message: "Vui lòng nhập họ tên, email và số điện thoại hợp lệ.",
      });
    }
    if (matKhau.length < 6 || matKhau.length > 128) {
      return res
        .status(400)
        .json({ message: "Mật khẩu cần từ 6 đến 128 ký tự." });
    }
    const matKhauDaBam = await bamMatKhau(matKhau);
    await NguoiDung.create({
      hoTen,
      email,
      soDienThoai,
      matKhau: matKhauDaBam,
    });
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

router.post("/yeu-cau-dat-lai-mat-khau", async (req, res) => {
  const email =
    typeof req.body?.email === "string"
      ? req.body.email.trim().toLowerCase()
      : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: "Vui lòng nhập email hợp lệ." });
  }

  try {
    const user = await NguoiDung.exists({ email });
    if (user) {
      await YeuCauMatKhau.findOneAndUpdate(
        { emailKhach: email, trangThai: "cho-xu-ly" },
        { $setOnInsert: { emailKhach: email, trangThai: "cho-xu-ly" } },
        { upsert: true, setDefaultsOnInsert: true },
      );
    }
    return res.json({
      message:
        "Nếu email tồn tại, yêu cầu của bạn đã được ghi nhận. Vui lòng liên hệ bộ phận hỗ trợ để xác minh.",
    });
  } catch (error) {
    console.error("Lỗi tạo yêu cầu đặt lại mật khẩu:", error.message);
    return res
      .status(500)
      .json({ message: "Không thể gửi yêu cầu lúc này. Vui lòng thử lại." });
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
