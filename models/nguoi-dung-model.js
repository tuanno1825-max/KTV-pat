const mongoose = require("mongoose");

const NguoiDungSchema = new mongoose.Schema(
  {
    hoTen: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true },
    matKhau: { type: String, required: true, select: false },
    diemTichLuy: { type: Number, default: 0, min: 0 },
    vipTrangThai: { type: String, enum: ["Chưa đăng ký", "Đang chờ duyệt", "VIP"], default: "Chưa đăng ký" },
    vipHetHan: { type: Date, default: null },
  },
  { collection: "user", timestamps: true },
);

NguoiDungSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model("NguoiDung", NguoiDungSchema);
