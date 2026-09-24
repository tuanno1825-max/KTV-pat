const mongoose = require("mongoose");
const QuanSchema = new mongoose.Schema(
  {
    maQuan: { type: String, required: true, unique: true, trim: true },
    tenQuan: { type: String, required: true, trim: true },
    soDienThoai: { type: String, required: true, trim: true },
    diaChiChiTiet: { type: String, required: true, trim: true },
    khuVuc: { type: String, required: true, trim: true },
    anhQuan: { type: String, trim: true, default: "" },
    giaMin: { type: Number, required: true, min: 0, default: 0 },
    giaMax: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
      validate: {
        validator(value) {
          return value >= (this.giaMin ?? 0);
        },
        message: "Giá tối đa phải lớn hơn hoặc bằng giá tối thiểu.",
      },
    },
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
