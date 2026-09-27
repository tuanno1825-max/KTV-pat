const mongoose = require("mongoose");
const PhongSchema = new mongoose.Schema(
  {
    gia: { type: Number, min: 0, default: 0 },
    anh: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const QuanSchema = new mongoose.Schema(
  {
    maQuan: { type: String, required: true, unique: true, trim: true },
    tenQuan: { type: String, required: true, trim: true },
    soDienThoai: { type: String, required: true, trim: true },
    diaChiChiTiet: { type: String, required: true, trim: true },
    khuVuc: { type: String, required: true, trim: true },
    anhQuan: { type: String, trim: true, default: "" },
    giaPhong: {
      be: { type: PhongSchema, default: () => ({}) },
      thuong: { type: PhongSchema, default: () => ({}) },
      lon: { type: PhongSchema, default: () => ({}) },
      vip: { type: PhongSchema, default: () => ({}) },
    },
    giaMin: { type: Number, min: 0, select: false },
    giaMax: { type: Number, min: 0, select: false },
    chietKhau: { type: Number, required: true, min: 0, max: 100 },
    trangThai: {
      type: String,
      enum: ["Đang hoạt động", "Tạm ngưng"],
      default: "Đang hoạt động",
    },
  },
  {
    collection: "qlDSQuan",
  },
);

module.exports = mongoose.model("Quan", QuanSchema);
