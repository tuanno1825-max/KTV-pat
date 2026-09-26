const mongoose = require("mongoose");

const YeuCauMatKhauSchema = new mongoose.Schema(
  {
    emailKhach: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    trangThai: {
      type: String,
      enum: ["cho-xu-ly", "da-cap", "tu-choi"],
      default: "cho-xu-ly",
      index: true,
    },
    nguoiXuLy: { type: String, default: "", trim: true },
    thoiGianXuLy: { type: Date, default: null },
  },
  { collection: "yeu_cau_dat_lai_mat_khau", timestamps: true },
);

YeuCauMatKhauSchema.index({ emailKhach: 1, trangThai: 1 });

module.exports = mongoose.model("YeuCauMatKhau", YeuCauMatKhauSchema);
