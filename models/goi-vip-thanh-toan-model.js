const mongoose = require("mongoose");

const GoiVipThanhToanSchema = new mongoose.Schema(
  {
    maGiaoDich: { type: String, required: true, unique: true, index: true },
    emailKhach: { type: String, required: true, lowercase: true, trim: true, index: true },
    soTien: { type: Number, required: true, default: 100000 },
    trangThai: { type: String, enum: ["Chờ thanh toán", "Thành công", "Thất bại"], default: "Chờ thanh toán", index: true },
    maGiaoDichVnpay: { type: String, default: "" },
    maPhanHoiVnpay: { type: String, default: "" },
    daThanhToanLuc: { type: Date, default: null },
    vipHetHanLuc: { type: Date, default: null },
  },
  { timestamps: true, collection: "thanh_toan_goi_vip" },
);

module.exports = mongoose.model("GoiVipThanhToan", GoiVipThanhToanSchema);
