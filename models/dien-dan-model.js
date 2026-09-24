const mongoose = require("mongoose");
const crypto = require("crypto");

const BinhLuanSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => crypto.randomUUID() },
    emailNguoiBinhLuan: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    tenNguoiBinhLuan: { type: String, required: true, trim: true },
    laVip: { type: Boolean, default: false },
    noiDung: { type: String, required: true, trim: true, maxlength: 600 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const BaiVietSchema = new mongoose.Schema(
  {
    tieuDe: { type: String, required: true, trim: true, maxlength: 180 },
    noiDung: { type: String, required: true, trim: true, maxlength: 3000 },
    chuDe: {
      type: String,
      enum: [
        "Giao lưu",
        "Rủ hát / Bắt kèo",
        "Review quán",
        "Hỏi đáp & Kinh nghiệm",
      ],
      default: "Giao lưu",
      index: true,
    },
    emailNguoiDang: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    tenNguoiDang: { type: String, required: true, trim: true },
    laVip: { type: Boolean, default: false },
    maQuanLienQuan: { type: String, default: "", trim: true },
    tenQuanLienQuan: { type: String, default: "", trim: true },
    luotThich: [{ type: String, lowercase: true, trim: true }],
    binhLuan: [BinhLuanSchema],
  },
  {
    collection: "dien_dan_bai_viet",
    timestamps: true,
  },
);

BaiVietSchema.index({ createdAt: -1 });

module.exports = mongoose.model("BaiViet", BaiVietSchema);
