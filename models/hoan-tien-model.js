const mongoose = require("mongoose");

const HoanTienSchema = new mongoose.Schema(
  {
    emailKhach: { type: String, required: true, lowercase: true, trim: true, index: true },
    donHang: { type: mongoose.Schema.Types.ObjectId, ref: "DonHang", required: true },
    maDon: { type: String, required: true, trim: true },
    phanTramHoan: { type: Number, default: null, min: 5, max: 5 },
    nganHang: { type: String, required: true, trim: true, maxlength: 100 },
    soTaiKhoan: { type: String, required: true, trim: true, maxlength: 40 },
    tenThuHuong: { type: String, required: true, trim: true, maxlength: 100 },
    tepHoaDon: { type: String, required: true },
    trangThai: { type: String, enum: ["Chờ duyệt", "Đã duyệt", "Đã hoàn tiền", "Từ chối"], default: "Chờ duyệt", index: true },
    nhanVienDuyet: { type: String, default: "" },
    thoiGianDuyet: { type: Date, default: null },
    adminHoanTien: { type: String, default: "" },
    thoiGianHoanTien: { type: Date, default: null },
  },
  { timestamps: true, collection: "yeu_cau_hoan_tien" },
);

HoanTienSchema.index({ donHang: 1 }, { unique: true });

module.exports = mongoose.model("HoanTien", HoanTienSchema);
