const mongoose = require("mongoose");

const ThongBaoSchema = new mongoose.Schema(
  {
    emailKhach: { type: String, required: true, lowercase: true, trim: true, index: true },
    noiDung: { type: String, required: true, maxlength: 300 },
    loai: { type: String, enum: ["hoan-tien", "he-thong"], default: "he-thong" },
    daDoc: { type: Boolean, default: false },
  },
  { timestamps: true, collection: "thong_bao_khach" },
);

module.exports = mongoose.model("ThongBao", ThongBaoSchema);
