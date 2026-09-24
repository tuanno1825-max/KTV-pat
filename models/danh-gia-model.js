const mongoose = require("mongoose");

const DanhGiaSchema = new mongoose.Schema(
  {
    maQuan: { type: String, required: true, trim: true, index: true },
    tenQuan: { type: String, required: true, trim: true },
    emailKhach: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    tenKhach: { type: String, required: true, trim: true },
    soSao: { type: Number, required: true, min: 1, max: 5 },
    tieuChi: {
      amThanh: { type: Number, min: 1, max: 5, default: 5 },
      anhSang: { type: Number, min: 1, max: 5, default: 5 },
      phucVu: { type: Number, min: 1, max: 5, default: 5 },
      giaCa: { type: Number, min: 1, max: 5, default: 5 },
    },
    noiDung: { type: String, required: true, trim: true, maxlength: 1000 },
    daTungDatPhong: { type: Boolean, default: false },
  },
  {
    collection: "danh_gia_quan",
    timestamps: true,
  },
);

DanhGiaSchema.index({ maQuan: 1, createdAt: -1 });

module.exports = mongoose.model("DanhGia", DanhGiaSchema);
