const mongoose = require("mongoose");

const DonHangSchema = new mongoose.Schema(
  {
    maDon: { type: String, required: true, unique: true, trim: true },
    maQuan: { type: String, required: true, trim: true },
    tenQuan: { type: String, required: true, trim: true },
    tenKhach: { type: String, required: true, trim: true },
    emailKhach: { type: String, default: "", trim: true, lowercase: true },
    xungHo: { type: String, required: true, enum: ["Anh", "Chị"] },
    soDienThoai: { type: String, required: true, trim: true },
    thoiGianCheckIn: { type: String, required: true },
    soNguoi: { type: String, required: true },
    trangThai: {
      type: String,
      enum: [
        "Đang chờ xử lý",
        "Đã xác nhận",
        "Đặt phòng thành công",
        "Đặt phòng thất bại",
        "Đề xuất quán mới",
        "Khách đã chấp nhận đề xuất",
        "Khách từ chối đề xuất",
        "Khách không đến",
        "Khách đã hủy đặt phòng",
      ],
      default: "Đang chờ xử lý",
    },
    maQuanDeXuat: { type: String, default: "" },
    tenQuanDeXuat: { type: String, default: "" },
    maDonGoc: { type: String, default: "" },
    maDonTiepTheo: { type: String, default: "" },
    daHuy: { type: Boolean, default: false },
    diemCongDaXuLy: { type: Boolean, default: false },
    diemTruDaXuLy: { type: Boolean, default: false },
    thoiGianDat: { type: Date, default: Date.now },
  },
  { collection: "qldh" },
);

module.exports = mongoose.model("DonHang", DonHangSchema);
