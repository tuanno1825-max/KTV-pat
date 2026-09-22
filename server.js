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

// Mo trang chu khi truy cap truc tiep vao http://localhost:3000/
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "html", "index.html"));
});

// Duong dan ngan cho cac trang quan tri va tai khoan
app.get("/admin", adminRoutes.yeuCauDangNhap, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "html", "admin.html"));
});

app.get("/dangnhap", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "html", "dangnhap.html"));
});

app.get("/dangnhap-private", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "html", "dangnhap-private.html"));
});
// Su dung router quan ly quan cho cac API
app.use("/api", adminRoutes);

async function khoiDongMayChu() {
  if (!MONGODB_URI) {
    throw new Error(
      "Thiếu biến môi trường MONGODB_URI. Hãy thêm MongoDB connection string trong Render.",
    );
  }

  await mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
  });
  console.log(
    `Đã kết nối MongoDB thành công: database ${mongoose.connection.name}, collection tài khoản TK-admin`,
  );

  app.listen(PORT, () => {
    console.log(`Server đang chạy tại cổng ${PORT}`);
  });
}

khoiDongMayChu().catch((error) => {
  console.error(
    "Không thể khởi động server hoặc kết nối MongoDB:",
    error.message,
  );
  process.exitCode = 1;
});
