const express = require("express");
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const HoanTien = require("../models/hoan-tien-model");
const ThongBao = require("../models/thong-bao-model");
const DonHang = require("../models/don-hang-models");
const NguoiDung = require("../models/nguoi-dung-model");
const GoiVipThanhToan = require("../models/goi-vip-thanh-toan-model");
const { layPhien, yeuCauDangNhap } = require("../middleware/xac-thuc-noi-bo");

const router = express.Router();
const thuMucHoaDon = path.join(__dirname, "..", "private_uploads", "hoa-don-hoan-tien");
const cacMimeAnh = new Set(["image/jpeg", "image/png", "image/webp"]);
const toiDaBytes = 5 * 1024 * 1024;
const giaGoiVip = 100000;

function gioVietNam(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const giaTri = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${giaTri.year}${giaTri.month}${giaTri.day}${giaTri.hour}${giaTri.minute}${giaTri.second}`;
}

function maHoaThamSo(value) {
  return encodeURIComponent(String(value)).replace(/%20/g, "+");
}

function chuoiKy(thamSo) {
  return Object.keys(thamSo).filter((key) => key.startsWith("vnp_") && key !== "vnp_SecureHash" && key !== "vnp_SecureHashType")
    .sort()
    .map((key) => `${maHoaThamSo(key)}=${maHoaThamSo(thamSo[key])}`)
    .join("&");
}

function taoChuKy(thamSo, secret) {
  return crypto.createHmac("sha512", secret).update(chuoiKy(thamSo), "utf8").digest("hex");
}

function chuKyHopLe(thamSo) {
  const secret = process.env.VNPAY_HASH_SECRET;
  const gui = thamSo.vnp_SecureHash;
  if (!secret || typeof gui !== "string") return false;
  const dung = taoChuKy(thamSo, secret);
  const guiBuffer = Buffer.from(gui.toLowerCase(), "hex");
  const dungBuffer = Buffer.from(dung, "hex");
  return guiBuffer.length === dungBuffer.length && crypto.timingSafeEqual(guiBuffer, dungBuffer);
}

function congMotThang(date) {
  const ketQua = new Date(date);
  const ngay = ketQua.getDate();
  ketQua.setMonth(ketQua.getMonth() + 1);
  if (ketQua.getDate() < ngay) ketQua.setDate(0);
  return ketQua;
}

function layPhienKhach(req, res) {
  const phien = layPhien(req);
  if (phien?.vaiTro !== "khach-hang") {
    res.status(401).json({ message: "Vui lòng đăng nhập tài khoản khách hàng." });
    return null;
  }
  return phien;
}

function dangLaVip(nguoiDung) {
  return nguoiDung?.vipTrangThai === "VIP" && (!nguoiDung.vipHetHan || nguoiDung.vipHetHan > new Date());
}

router.get("/vip-trang-thai", async (req, res) => {
  const phien = layPhienKhach(req, res);
  if (!phien) return;
  try {
    const nguoiDung = await NguoiDung.findOne({ email: phien.taiKhoan }).select("vipTrangThai").lean();
    const vip = dangLaVip(nguoiDung);
    res.json({ vip, trangThai: vip ? "VIP" : "Chưa đăng ký", vipHetHan: vip ? nguoiDung.vipHetHan : null });
  } catch {
    res.status(500).json({ message: "Không thể kiểm tra trạng thái VIP." });
  }
});

router.post("/nang-cap-vip", async (req, res) => {
  const phien = layPhienKhach(req, res);
  if (!phien) return;
  const tmnCode = process.env.VNPAY_TMN_CODE;
  const secret = process.env.VNPAY_HASH_SECRET;
  const returnUrl = process.env.VNPAY_RETURN_URL;
  if (!tmnCode || !secret || !returnUrl) {
    return res.status(503).json({ message: "Thanh toán VIP chưa sẵn sàng. Cần cấu hình tài khoản merchant VNPAY trước." });
  }
  try {
    const nguoiDung = await NguoiDung.findOne({ email: phien.taiKhoan }).select("vipTrangThai vipHetHan").lean();
    if (!nguoiDung) return res.status(404).json({ message: "Không tìm thấy tài khoản." });
    if (dangLaVip(nguoiDung)) {
      return res.status(409).json({ message: "Tài khoản của bạn đang có gói VIP còn hạn." });
    }
    const maGiaoDich = `${Date.now()}${crypto.randomBytes(5).toString("hex")}`;
    const now = new Date();
    const params = {
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode: tmnCode,
      vnp_Amount: String(giaGoiVip * 100),
      vnp_CurrCode: "VND",
      vnp_TxnRef: maGiaoDich,
      vnp_OrderInfo: "Karaoke Together VIP monthly experience package",
      vnp_OrderType: "other",
      vnp_Locale: "vn",
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1").split(",")[0].trim().slice(0, 45),
      vnp_CreateDate: gioVietNam(now),
      vnp_ExpireDate: gioVietNam(new Date(now.getTime() + 15 * 60 * 1000)),
    };
    const donThanhToan = await GoiVipThanhToan.create({ maGiaoDich, emailKhach: phien.taiKhoan, soTien: giaGoiVip });
    const query = chuoiKy(params);
    const secureHash = taoChuKy(params, secret);
    const paymentBase = process.env.VNPAY_PAYMENT_URL || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
    return res.json({ paymentUrl: `${paymentBase}?${query}&vnp_SecureHash=${secureHash}`, maGiaoDich: donThanhToan.maGiaoDich });
  } catch {
    return res.status(500).json({ message: "Không thể tạo giao dịch VIP lúc này." });
  }
});

router.get("/vnpay-ipn", async (req, res) => {
  const params = Object.fromEntries(Object.entries(req.query).filter(([key, value]) => key.startsWith("vnp_") && typeof value === "string"));
  if (!chuKyHopLe(params) || params.vnp_TmnCode !== process.env.VNPAY_TMN_CODE) {
    return res.json({ RspCode: "97", Message: "Invalid checksum" });
  }
  try {
    const don = await GoiVipThanhToan.findOne({ maGiaoDich: params.vnp_TxnRef });
    if (!don) return res.json({ RspCode: "01", Message: "Order not found" });
    if (Number(params.vnp_Amount) !== don.soTien * 100) return res.json({ RspCode: "04", Message: "Invalid amount" });
    if (don.trangThai !== "Chờ thanh toán") {
      if (don.trangThai === "Thành công" && don.vipHetHanLuc) {
        await NguoiDung.updateOne(
          { email: don.emailKhach },
          { $set: { vipTrangThai: "VIP" }, $max: { vipHetHan: don.vipHetHanLuc } },
        );
      }
      return res.json({ RspCode: "02", Message: "Order already confirmed" });
    }
    const thanhToanThanhCong = params.vnp_ResponseCode === "00" && params.vnp_TransactionStatus === "00";
    let hetHanVip = null;
    if (thanhToanThanhCong) {
      const taiKhoan = await NguoiDung.findOne({ email: don.emailKhach }).select("vipTrangThai vipHetHan");
      if (!taiKhoan) return res.json({ RspCode: "01", Message: "Account not found" });
      const batDau = taiKhoan.vipHetHan > new Date() ? taiKhoan.vipHetHan : new Date();
      hetHanVip = congMotThang(batDau);
    }
    const capNhat = await GoiVipThanhToan.findOneAndUpdate(
      { _id: don._id, trangThai: "Chờ thanh toán" },
      { $set: {
        trangThai: thanhToanThanhCong ? "Thành công" : "Thất bại",
        maGiaoDichVnpay: params.vnp_TransactionNo || "",
        maPhanHoiVnpay: params.vnp_ResponseCode || "",
        daThanhToanLuc: thanhToanThanhCong ? new Date() : null,
        vipHetHanLuc: hetHanVip,
      } },
      { new: true },
    );
    if (!capNhat) return res.json({ RspCode: "02", Message: "Order already confirmed" });
    if (thanhToanThanhCong) {
      await NguoiDung.updateOne(
        { email: don.emailKhach },
        { $set: { vipTrangThai: "VIP" }, $max: { vipHetHan: hetHanVip } },
      );
    }
    await ThongBao.create({
      emailKhach: don.emailKhach,
      noiDung: thanhToanThanhCong
        ? `Đã thanh toán gói VIP 100.000đ/tháng thành công. Tài khoản VIP có hiệu lực đến ${hetHanVip.toLocaleDateString("vi-VN")}.`
        : "Thanh toán gói VIP chưa thành công. Bạn có thể thử thanh toán lại.",
      loai: "he-thong",
    });
    return res.json({ RspCode: "00", Message: "Confirm Success" });
  } catch {
    return res.json({ RspCode: "99", Message: "Unknown error" });
  }
});

router.get("/vnpay-return", (req, res) => {
  const params = Object.fromEntries(Object.entries(req.query).filter(([key, value]) => key.startsWith("vnp_") && typeof value === "string"));
  if (!chuKyHopLe(params) || params.vnp_TmnCode !== process.env.VNPAY_TMN_CODE) {
    return res.redirect("/html/vip-thanh-toan.html?ketQua=khong-hop-le");
  }
  return res.redirect(`/html/vip-thanh-toan.html?maGiaoDich=${encodeURIComponent(params.vnp_TxnRef || "")}`);
});

router.get("/thanh-toan/:maGiaoDich", async (req, res) => {
  const phien = layPhienKhach(req, res);
  if (!phien) return;
  try {
    const don = await GoiVipThanhToan.findOne({ maGiaoDich: req.params.maGiaoDich, emailKhach: phien.taiKhoan })
      .select("soTien trangThai vipHetHanLuc createdAt").lean();
    if (!don) return res.status(404).json({ message: "Không tìm thấy giao dịch." });
    res.json(don);
  } catch {
    res.status(500).json({ message: "Không thể kiểm tra giao dịch." });
  }
});

function kiemTraAnh(dataUrl) {
  const khop = typeof dataUrl === "string" && dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+=*)$/);
  if (!khop || !cacMimeAnh.has(khop[1])) return null;
  const duLieu = Buffer.from(khop[2], "base64");
  if (!duLieu.length || duLieu.length > toiDaBytes) return null;
  const dungDinhDang = khop[1] === "image/png"
    ? duLieu.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    : khop[1] === "image/jpeg"
      ? duLieu[0] === 255 && duLieu[1] === 216 && duLieu[duLieu.length - 2] === 255 && duLieu[duLieu.length - 1] === 217
      : duLieu.toString("ascii", 0, 4) === "RIFF" && duLieu.toString("ascii", 8, 12) === "WEBP";
  if (!dungDinhDang) return null;
  return { duLieu, duoi: khop[1] === "image/jpeg" ? ".jpg" : khop[1] === "image/png" ? ".png" : ".webp" };
}

router.get("/don-hang-cua-toi", async (req, res) => {
  const phien = layPhienKhach(req, res);
  if (!phien) return;
  try {
    const cacDon = await DonHang.find({ emailKhach: phien.taiKhoan, trangThai: "Đặt phòng thành công" })
      .select("maDon tenQuan thoiGianCheckIn thoiGianDat")
      .sort({ thoiGianDat: -1 }).lean();
    const cacYeuCau = await HoanTien.find({ emailKhach: phien.taiKhoan }).select("donHang trangThai").lean();
    const trangThaiTheoDon = new Map(cacYeuCau.map((yc) => [String(yc.donHang), yc.trangThai]));
    res.json(cacDon.map((don) => ({ ...don, yeuCauHoanTien: trangThaiTheoDon.get(String(don._id)) || null })));
  } catch {
    res.status(500).json({ message: "Không thể tải danh sách đơn đủ điều kiện." });
  }
});

router.get("/yeu-cau-cua-toi", async (req, res) => {
  const phien = layPhienKhach(req, res);
  if (!phien) return;
  try {
    const yeuCaus = await HoanTien.find({ emailKhach: phien.taiKhoan })
      .select("maDon phanTramHoan trangThai createdAt thoiGianDuyet")
      .sort({ createdAt: -1 }).lean();
    res.json(yeuCaus);
  } catch {
    res.status(500).json({ message: "Không thể tải các yêu cầu hoàn tiền." });
  }
});

router.post("/yeu-cau", async (req, res) => {
  const phien = layPhienKhach(req, res);
  if (!phien) return;
  const { maDon, nganHang, soTaiKhoan, tenThuHuong, hoaDon } = req.body || {};
  const nguoiDungVip = await NguoiDung.findOne({ email: phien.taiKhoan }).select("vipTrangThai vipHetHan").lean();
  if (!dangLaVip(nguoiDungVip)) {
    return res.status(403).json({ message: "Vui lòng mua gói trải nghiệm VIP 100.000đ/tháng để sử dụng dịch vụ này." });
  }
  if (!maDon ||
      ![nganHang, soTaiKhoan, tenThuHuong].every((giaTri) => typeof giaTri === "string" && giaTri.trim())) {
    return res.status(400).json({ message: "Vui lòng điền đầy đủ thông tin hoàn tiền." });
  }
  const anh = kiemTraAnh(hoaDon);
  if (!anh) return res.status(400).json({ message: "Hóa đơn phải là ảnh JPG, PNG hoặc WEBP, tối đa 5 MB." });
  let tepHoaDon;
  try {
    const don = await DonHang.findOne({ maDon, emailKhach: phien.taiKhoan, trangThai: "Đặt phòng thành công" }).select("_id maDon").lean();
    if (!don) return res.status(404).json({ message: "Không tìm thấy đơn đủ điều kiện của tài khoản này." });
    if (await HoanTien.exists({ donHang: don._id })) return res.status(409).json({ message: "Đơn này đã có yêu cầu hoàn tiền." });
    await fs.mkdir(thuMucHoaDon, { recursive: true });
    tepHoaDon = `${crypto.randomUUID()}${anh.duoi}`;
    await fs.writeFile(path.join(thuMucHoaDon, tepHoaDon), anh.duLieu, { flag: "wx" });
    const yeuCau = await HoanTien.create({
      emailKhach: phien.taiKhoan,
      donHang: don._id,
      maDon: don.maDon,
      nganHang: nganHang.trim(),
      soTaiKhoan: soTaiKhoan.trim(),
      tenThuHuong: tenThuHuong.trim(),
      tepHoaDon,
    });
    return res.status(201).json({ message: "Đã gửi yêu cầu hoàn tiền. Nhân viên sẽ kiểm tra hóa đơn." , id: yeuCau.id });
  } catch (error) {
    if (tepHoaDon) await fs.unlink(path.join(thuMucHoaDon, tepHoaDon)).catch(() => {});
    if (error.code === 11000) return res.status(409).json({ message: "Đơn này đã có yêu cầu hoàn tiền." });
    return res.status(500).json({ message: "Không thể gửi yêu cầu lúc này." });
  }
});

router.get("/yeu-cau", yeuCauDangNhap, async (_req, res) => {
  try {
    const cacYeuCau = await HoanTien.find().sort({ createdAt: -1 }).limit(300).lean();
    res.json(cacYeuCau.map((yc) => ({ ...yc, linkHoaDon: `/api/hoan-tien/yeu-cau/${yc._id}/hoa-don` })));
  } catch {
    res.status(500).json({ message: "Không thể tải yêu cầu hoàn tiền." });
  }
});

router.get("/yeu-cau/:id/hoa-don", yeuCauDangNhap, async (req, res) => {
  try {
    const yc = await HoanTien.findById(req.params.id).select("tepHoaDon").lean();
    if (!yc) return res.status(404).json({ message: "Không tìm thấy hóa đơn." });
    return res.sendFile(yc.tepHoaDon, { root: thuMucHoaDon });
  } catch {
    res.status(404).json({ message: "Không tìm thấy hóa đơn." });
  }
});

router.patch("/yeu-cau/:id/quyet-dinh", yeuCauDangNhap, async (req, res) => {
  const quyetDinh = req.body?.quyetDinh;
  if (!["duyet", "tu-choi"].includes(quyetDinh)) return res.status(400).json({ message: "Quyết định không hợp lệ." });
  const phanTramHoan = Number(req.body?.phanTramHoan);
  if (quyetDinh === "duyet" && (!Number.isInteger(phanTramHoan) || phanTramHoan < 5 || phanTramHoan > 20)) {
    return res.status(400).json({ message: "Nhập mức hoàn từ 5% đến 20%." });
  }
  try {
    const yc = await HoanTien.findOne({ _id: req.params.id, trangThai: "Chờ duyệt" });
    if (!yc) return res.status(404).json({ message: "Yêu cầu không tồn tại hoặc đã được xử lý." });
    const don = await DonHang.findOne({ _id: yc.donHang, emailKhach: yc.emailKhach, trangThai: "Đặt phòng thành công" }).select("_id").lean();
    if (!don) return res.status(409).json({ message: "Đơn hàng không còn đủ điều kiện hoàn tiền." });
    yc.trangThai = quyetDinh === "duyet" ? "Đã duyệt" : "Từ chối";
    yc.phanTramHoan = quyetDinh === "duyet" ? phanTramHoan : null;
    yc.nhanVienDuyet = req.taiKhoanNoiBo?.taiKhoan || "nhan-vien";
    yc.thoiGianDuyet = new Date();
    await yc.save();
    let noiDung;
    if (quyetDinh === "duyet") {
      noiDung = `Yêu cầu hoàn tiền ${phanTramHoan}% thành công. Tiền sẽ được chuyển về chậm nhất 3 ngày làm việc.`;
    } else {
      noiDung = "Xin lỗi, yêu cầu hoàn tiền chưa đủ điều kiện.";
    }
    await ThongBao.create({ emailKhach: yc.emailKhach, noiDung, loai: "hoan-tien" });
    res.json({ message: "Đã cập nhật yêu cầu hoàn tiền.", trangThai: yc.trangThai });
  } catch {
    res.status(500).json({ message: "Không thể cập nhật yêu cầu hoàn tiền." });
  }
});

router.get("/thong-bao", async (req, res) => {
  const phien = layPhienKhach(req, res);
  if (!phien) return;
  try {
    const thongBao = await ThongBao.find({ emailKhach: phien.taiKhoan }).sort({ createdAt: -1 }).limit(30).lean();
    res.json(thongBao);
  } catch {
    res.status(500).json({ message: "Không thể tải thông báo." });
  }
});

router.patch("/thong-bao/da-doc", async (req, res) => {
  const phien = layPhienKhach(req, res);
  if (!phien) return;
  try {
    await ThongBao.updateMany({ emailKhach: phien.taiKhoan, daDoc: false }, { $set: { daDoc: true } });
    res.json({ message: "Đã đánh dấu thông báo đã đọc." });
  } catch {
    res.status(500).json({ message: "Không thể cập nhật thông báo." });
  }
});

module.exports = router;
