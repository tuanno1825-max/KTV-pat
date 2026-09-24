const express = require("express");
const NguoiDung = require("../models/nguoi-dung-model");
const DonHang = require("../models/don-hang-models");
const ThongBao = require("../models/thong-bao-model");
const HoanTien = require("../models/hoan-tien-model");
const DanhGia = require("../models/danh-gia-model");
const BaiViet = require("../models/dien-dan-model");
const { yeuCauAdmin } = require("../middleware/xac-thuc-noi-bo");
const router = express.Router();

function congMotThang(date) { const d = new Date(date); const day = d.getDate(); d.setMonth(d.getMonth() + 1); if (d.getDate() < day) d.setDate(0); return d; }

router.get("/admin/tai-khoan", yeuCauAdmin, async (req, res) => {
  try {
    const tuKhoa = String(req.query.tuKhoa || "").trim();
    const filter = tuKhoa ? { $or: [{ hoTen: { $regex: tuKhoa, $options: "i" } }, { email: { $regex: tuKhoa, $options: "i" } }] } : {};
    const users = await NguoiDung.find(filter).sort({ createdAt: -1 }).lean();
    const grouped = await DonHang.aggregate([{ $group: { _id: { email: "$emailKhach", trangThai: "$trangThai" }, soLuong: { $sum: 1 } } }]);
    const stats = new Map();
    for (const row of grouped) {
      const email = row._id.email?.toLowerCase(); if (!email) continue;
      const s = stats.get(email) || { tongDon: 0, thanhCong: 0, khongDen: 0, daHuy: 0, choXuLy: 0, thatBai: 0 };
      s.tongDon += row.soLuong;
      if (row._id.trangThai === "Đặt phòng thành công") s.thanhCong += row.soLuong;
      else if (row._id.trangThai === "Khách không đến") s.khongDen += row.soLuong;
      else if (row._id.trangThai === "Khách đã hủy đặt phòng") s.daHuy += row.soLuong;
      else if (["Đang chờ xử lý", "Đã xác nhận"].includes(row._id.trangThai)) s.choXuLy += row.soLuong;
      else if (row._id.trangThai === "Đặt phòng thất bại") s.thatBai += row.soLuong;
      stats.set(email, s);
    }
    res.json(users.map(u => ({ _id: u._id, hoTen: u.hoTen, email: u.email, diemTichLuy: u.diemTichLuy || 0, vipTrangThai: u.vipTrangThai, vipHetHan: u.vipHetHan, laVip: u.vipTrangThai === "VIP" && (!u.vipHetHan || new Date(u.vipHetHan) > new Date()), canhBao: u.canhBao || "", thongKeDonHang: stats.get(u.email.toLowerCase()) || { tongDon: 0, thanhCong: 0, khongDen: 0, daHuy: 0, choXuLy: 0, thatBai: 0 } })));
  } catch { res.status(500).json({ message: "Không thể tải danh sách tài khoản." }); }
});

router.get("/admin/tai-khoan/:email/lich-su", yeuCauAdmin, async (req, res) => {
  try { res.json(await DonHang.find({ emailKhach: req.params.email.toLowerCase() }).select("maDon tenQuan thoiGianDat trangThai").sort({ thoiGianDat: -1 }).lean()); }
  catch { res.status(500).json({ message: "Không thể tải lịch sử đặt phòng." }); }
});

router.post("/admin/tai-khoan/:email/cap-vip", yeuCauAdmin, async (req, res) => {
  try {
    const user = await NguoiDung.findOne({ email: req.params.email.toLowerCase() }); if (!user) return res.status(404).json({ message: "Không tìm thấy khách hàng." });
    const now = new Date(); user.vipTrangThai = "VIP"; user.vipHetHan = congMotThang(user.vipHetHan > now ? user.vipHetHan : now); await user.save();
    await ThongBao.create({ emailKhach: user.email, noiDung: `Quản trị viên đã cấp VIP cho bạn đến ${user.vipHetHan.toLocaleDateString("vi-VN")}.`, loai: "he-thong" });
    res.json({ message: `Đã cấp VIP đến ${user.vipHetHan.toLocaleDateString("vi-VN")}.` });
  } catch { res.status(500).json({ message: "Không thể cấp VIP." }); }
});

router.post("/admin/tai-khoan/:email/cong-diem", yeuCauAdmin, async (req, res) => {
  try {
    const soDiem = Number(req.body?.soDiem);
    if (!Number.isSafeInteger(soDiem) || soDiem < 1 || soDiem > 1000000) {
      return res.status(400).json({ message: "Số điểm phải là số nguyên từ 1 đến 1.000.000." });
    }
    const user = await NguoiDung.findOne({ email: req.params.email.toLowerCase() });
    if (!user) return res.status(404).json({ message: "Không tìm thấy khách hàng." });

    user.diemTichLuy = (user.diemTichLuy || 0) + soDiem;
    let duocCapVip = false;
    if (user.diemTichLuy >= 1000) {
      const now = new Date();
      user.vipTrangThai = "VIP";
      user.vipHetHan = congMotThang(user.vipHetHan > now ? user.vipHetHan : now);
      user.diemTichLuy = 0;
      duocCapVip = true;
    }
    await user.save();
    const noiDung = duocCapVip
      ? `Quản trị viên đã cộng ${soDiem} điểm cho bạn. Bạn đạt mốc 1.000 điểm và được tự động cấp VIP đến ${user.vipHetHan.toLocaleDateString("vi-VN")}; điểm đã được đặt lại.`
      : `Quản trị viên đã cộng ${soDiem} điểm tích cực cho bạn. Số dư hiện tại: ${user.diemTichLuy} điểm.`;
    await ThongBao.create({ emailKhach: user.email, noiDung, loai: "he-thong" });
    res.json({ message: duocCapVip
      ? `Đã cộng điểm và tự động cấp VIP đến ${user.vipHetHan.toLocaleDateString("vi-VN")}; điểm đã được đặt lại.`
      : `Đã cộng ${soDiem} điểm cho ${user.hoTen}. Số dư hiện tại: ${user.diemTichLuy} điểm.`,
      diemTichLuy: user.diemTichLuy, laVip: duocCapVip || user.vipTrangThai === "VIP", vipHetHan: user.vipHetHan });
  } catch {
    res.status(500).json({ message: "Không thể cộng điểm cho khách hàng." });
  }
});

router.post("/admin/tai-khoan/:email/thu-hoi-vip", yeuCauAdmin, async (req, res) => {
  try {
    const email = req.params.email.toLowerCase();
    const user = await NguoiDung.findOne({ email }); if (!user) return res.status(404).json({ message: "Không tìm thấy khách hàng." });
    if (user.vipTrangThai !== "VIP") return res.status(409).json({ message: "Tài khoản này hiện không có VIP để thu hồi." });
    user.vipTrangThai = "Chưa đăng ký";
    user.vipHetHan = null;
    await user.save();
    await ThongBao.create({ emailKhach: email, noiDung: "Quyền VIP của bạn đã được Quản trị viên thu hồi.", loai: "he-thong" });
    res.json({ message: `Đã thu hồi VIP của ${user.hoTen}.` });
  } catch { res.status(500).json({ message: "Không thể thu hồi VIP." }); }
});

router.delete("/admin/tai-khoan/:email", yeuCauAdmin, async (req, res) => {
  try {
    const email = req.params.email.toLowerCase();
    const user = await NguoiDung.findOne({ email }).select("_id").lean();
    if (!user) return res.status(404).json({ message: "Không tìm thấy tài khoản khách hàng." });
    await Promise.all([
      ThongBao.deleteMany({ emailKhach: email }),
      DonHang.updateMany({ emailKhach: email }, { $set: { emailKhach: "" } }),
      HoanTien.updateMany({ emailKhach: email }, { $set: { emailKhach: "tai-khoan-da-xoa" } }),
      DanhGia.deleteMany({ emailKhach: email }),
      BaiViet.deleteMany({ emailNguoiDang: email }),
      BaiViet.updateMany({ "binhLuan.emailNguoiBinhLuan": email }, { $pull: { binhLuan: { emailNguoiBinhLuan: email } } }),
      BaiViet.updateMany({ luotThich: email }, { $pull: { luotThich: email } }),
    ]);
    await NguoiDung.deleteOne({ _id: user._id });
    res.json({ message: `Đã xóa tài khoản ${email} cùng thông báo, đánh giá và nội dung cộng đồng. Lịch sử đặt phòng/hoàn tiền vẫn được giữ cho quản trị và đã gỡ liên kết với email.` });
  } catch {
    res.status(500).json({ message: "Không thể xóa tài khoản khách hàng." });
  }
});

module.exports = router;
