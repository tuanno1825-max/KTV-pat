const mongoose = require("mongoose");
const BoDem = require("./bo-dem-model");

async function taoMaKhachHang() {
  const boDem = await BoDem.findOneAndUpdate(
    { _id: "ma-khach-hang" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  return `KH-${String(boDem.seq).padStart(6, "0")}`;
}

const NguoiDungSchema = new mongoose.Schema(
  {
    hoTen: { type: String, required: true, trim: true, maxlength: 100 },
    maKhachHang: { type: String },
    email: { type: String, required: true, trim: true, lowercase: true },
    matKhau: { type: String, required: true, select: false },
    diemTichLuy: { type: Number, default: 0, min: 0 },
    vipTrangThai: {
      type: String,
      enum: ["Chưa đăng ký", "Đang chờ duyệt", "VIP"],
      default: "Chưa đăng ký",
    },
    vipHetHan: { type: Date, default: null },
  },
  { collection: "user", timestamps: true },
);

NguoiDungSchema.index({ email: 1 }, { unique: true });
NguoiDungSchema.index({ maKhachHang: 1 }, { unique: true, sparse: true });

NguoiDungSchema.pre("validate", async function () {
  if (this.isNew && !this.maKhachHang) {
    this.maKhachHang = await taoMaKhachHang();
  }
});

NguoiDungSchema.statics.damBaoMaKhachHang = async function (user) {
  if (user.maKhachHang) return user.maKhachHang;
  const maKhachHang = await taoMaKhachHang();
  const capNhat = await this.findOneAndUpdate(
    {
      _id: user._id,
      $or: [
        { maKhachHang: { $exists: false } },
        { maKhachHang: null },
        { maKhachHang: "" },
      ],
    },
    { $set: { maKhachHang } },
    { new: true },
  ).select("maKhachHang");
  if (capNhat) return capNhat.maKhachHang;
  const taiKhoan = await this.findById(user._id).select("maKhachHang").lean();
  return taiKhoan?.maKhachHang || null;
};

NguoiDungSchema.statics.capMaKhachHangChoTaiKhoanCu = async function () {
  const taiKhoanCu = await this.find({
    $or: [
      { maKhachHang: { $exists: false } },
      { maKhachHang: null },
      { maKhachHang: "" },
    ],
  })
    .select("_id")
    .lean();
  for (const user of taiKhoanCu) {
    await this.damBaoMaKhachHang(user);
  }
};

module.exports = mongoose.model("NguoiDung", NguoiDungSchema);
