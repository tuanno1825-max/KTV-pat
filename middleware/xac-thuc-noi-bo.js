// Middleware xac thuc phien noi bo
const crypto = require("crypto");
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
  if (!["admin", "manager", "nhanvien"].includes(phien.vaiTro)) {
    return res.status(403).json({ message: "Tài khoản khách không có quyền truy cập khu vực nội bộ." });
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

function yeuCauQuanLy(req, res, next) {
  yeuCauDangNhap(req, res, () => {
    if (!["admin", "manager"].includes(req.taiKhoanNoiBo.vaiTro)) {
      return res
        .status(403)
        .json({ message: "Chỉ Quản lý hoặc Admin được truy cập chức năng này." });
    }
    next();
  });
}


module.exports = { taoPhienNoiBo, layPhien, yeuCauDangNhap, yeuCauAdmin, yeuCauQuanLy };
