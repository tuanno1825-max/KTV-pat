// $env:MONGODB_URI="mongodb://127.0.0.1:27017/admin"
require("dotenv").config();

// Import cac thu vien can thiet cho ung dung Express
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");

// Import router quan ly quan tu file routes
const xacThucRoutes = require("./routes/xac-thuc-routes");
const quanRoutes = require("./routes/quan-routes");
const donHangRoutes = require("./routes/don-hang-routes");
const hoanTienRoutes = require("./routes/hoan-tien-routes");
const danhGiaRoutes = require("./routes/danh-gia-routes");
const dienDanRoutes = require("./routes/dien-dan-routes");
const quanLyTaiKhoanRoutes = require("./routes/quan-ly-tai-khoan-routes");
const NguoiDung = require("./models/nguoi-dung-model");
const { yeuCauDangNhap, yeuCauAdmin, layPhien } = require("./middleware/xac-thuc-noi-bo");

// Khoi tao ung dung Express
const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

// Middleware: cho phep server doc du lieu JSON tu frontend
app.use(express.json({ limit: "8mb" }));
app.use("/api", async (req, res, next) => {
  const phien = layPhien(req);
  if (phien?.vaiTro !== "khach-hang" || req.method === "GET" || req.path === "/dang-xuat") return next();
  try {
    if (await NguoiDung.exists({ email: phien.taiKhoan })) return next();
    res.setHeader("Set-Cookie", "phien_dang_nhap=; Max-Age=0; HttpOnly; SameSite=Lax; Path=/");
    return res.status(401).json({ message: "Tài khoản này không còn hoạt động. Vui lòng đăng nhập lại." });
  } catch {
    return res.status(503).json({ message: "Không thể xác minh tài khoản lúc này." });
  }
});

// Phuc vu cac file HTML, CSS, JS trong thu muc public
app.use(express.static(path.join(__dirname, "public")));
// Cho phep truy cap cac trang HTML bang ten file ngan, vi du /dangnhap.html.
app.use(express.static(path.join(__dirname, "public", "html")));

// Mo trang chu khi truy cap truc tiep vao http://localhost:3000/
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "html", "index.html"));
});

// Duong dan ngan cho cac trang quan tri va tai khoan
app.get("/admin", yeuCauDangNhap, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "html", "admin.html"));
});
app.get("/admin-tai-khoan", yeuCauAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "html", "admin-tai-khoan.html"));
});
//Đường dẫn trang quản lý đơn hàng cho Nhân viên
app.get("/quan-ly-don-hang", yeuCauDangNhap, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "html", "qldh.html"));
});
app.get("/quan-ly-hoan-tien", yeuCauDangNhap, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "html", "quan-ly-hoan-tien.html"));
});
app.get("/dangnhap", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "html", "dangnhap.html"));
});
app.get("/cong-dong", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "html", "cong-dong.html"));
});
// Su dung router quan ly quan cho cac API
app.use("/api", xacThucRoutes);
app.use("/api", quanRoutes);
app.use("/api", donHangRoutes);
app.use("/api/hoan-tien", hoanTienRoutes);
app.use("/api", danhGiaRoutes);
app.use("/api", dienDanRoutes);
app.use("/api", quanLyTaiKhoanRoutes);

async function khoiDongMayChu() {
  app.listen(PORT, () => {
    console.log(`Server đang chạy tại cổng ${PORT}`);
  });

  if (!MONGODB_URI) {
    console.warn(
      "Thiếu MONGODB_URI; trang web vẫn chạy nhưng các chức năng cần MongoDB sẽ không hoạt động.",
    );
    return;
  }

  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
    console.log(
      `Đã kết nối MongoDB thành công: database ${mongoose.connection.name}`,
    );
  } catch (error) {
    console.error(
      "Không kết nối được MongoDB; trang web vẫn chạy nhưng các chức năng cần dữ liệu sẽ tạm thời không hoạt động:",
      error.message,
    );
  }
}

khoiDongMayChu();
