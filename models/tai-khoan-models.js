const mongoose = require("mongoose");

const TaiKhoanSchema = new mongoose.Schema(
  {
    tendangnhap: { type: String, required: true, trim: true },
    matkhau: { type: String, required: true },
    vaitro: { type: String, required: true, trim: true },
  },
  {
    collection: "TK-admin",
  },
);

module.exports = mongoose.model("TaiKhoan", TaiKhoanSchema);
