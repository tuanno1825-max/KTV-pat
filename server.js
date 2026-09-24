require("dotenv").config();

// Import cac thu vien can thiet cho ung dung Express
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");

// Import router quan ly quan tu file routes
const adminRoutes = require("./routes/admin-routes");

// Khoi tao ung dung Express
const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

// Middleware: cho phep server doc du lieu JSON tu frontend
app.use(express.json());

// Phuc vu cac file HTML, CSS, JS trong thu muc public
app.use(express.static(path.join(__dirname, "public")));
// Cho phep truy cap cac trang HTML bang ten file ngan, vi du /dangnhap.html.
app.use(express.static(path.join(__dirname, "public", "html")));

// Mo trang chu khi truy cap truc tiep vao http://localhost:3000/
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "html", "index.html"));
});

// Duong dan ngan cho cac trang quan tri va tai khoan
app.get("/admin", adminRoutes.yeuCauDangNhap, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "html", "admin.html"));
});
//Đường dẫn trang quản lý đơn hàng cho Nhân viên
app.get("/quan-ly-don-hang", adminRoutes.yeuCauDangNhap, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "html", "qldh.html"));
});
app.get("/dangnhap", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "html", "dangnhap.html"));
});
// Su dung router quan ly quan cho cac API
app.use("/api", adminRoutes);

async function khoiDongMayChu() {
  app.listen(PORT, () => {
    console.log(`Server đang chạy tại cổng ${PORT}`);
  });

  if (!MONGODB_URI) {
    console.warn("Thiếu MONGODB_URI; trang web vẫn chạy nhưng các chức năng cần MongoDB sẽ không hoạt động.");
    return;
  }

  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
    console.log(`Đã kết nối MongoDB thành công: database ${mongoose.connection.name}`);
  } catch (error) {
    console.error("Không kết nối được MongoDB; trang web vẫn chạy nhưng các chức năng cần dữ liệu sẽ tạm thời không hoạt động:", error.message);
  }
}

khoiDongMayChu();
