const express = require("express");
const fs = require("fs/promises");
const path = require("path");
const HoanTien = require("../models/hoan-tien-model");
const ThongBao = require("../models/thong-bao-model");
const DonHang = require("../models/don-hang-models");
const NguoiDung = require("../models/nguoi-dung-model");
const { layPhien, yeuCauDangNhap, yeuCauAdmin } = require("../middleware/xac-thuc-noi-bo");

const router = express.Router();
const thuMucHoaDon = path.join(__dirname, "..", "private_uploads", "hoa-don-hoan-tien");
const cacMimeAnh = new Set(["image/jpeg", "image/png", "image/webp"]);
const toiDaBytes = 5 * 1024 * 1024;

function congMotThang(date) {
  const ketQua = new Date(date);
  const ngay = ketQua.getDate();
  ketQua.setMonth(ketQua.getMonth() + 1);
  if (ketQua.getDate() < ngay) ketQua.setDate(0);
  return ketQua;
}

async function layPhienKhach(req, res) {
  const phien = layPhien(req);
  if (phien?.vaiTro !== "khach-hang") {
    res.status(401).json({ message: "Vui lòng đăng nhập tài khoản khách hàng." });
    return null;
  }
  if (!(await NguoiDung.exists({ email: phien.taiKhoan }))) {
    res.status(401).json({ message: "Tài khoản này không còn hoạt động." });
    return null;
  }
  return phien;
}

function layTrangThaiVip(nguoiDung) {
  if (!nguoiDung) return null;
  const truongTrangThai = Object.entries(nguoiDung).find(([tenTruong]) =>
    tenTruong
      .normalize("NFKC")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/\s+/g, "")
      .toLowerCase() === "viptrangthai",
  );
  return truongTrangThai?.[1] ?? null;
}

function dangLaVip(nguoiDung) {
  const trangThai = String(layTrangThaiVip(nguoiDung) || "").trim().toUpperCase();
  const hetHan = nguoiDung?.vipHetHan ? new Date(nguoiDung.vipHetHan) : null;
  return trangThai === "VIP" && (!hetHan || hetHan > new Date());
}

router.get("/vip-trang-thai", async (req, res) => {
  const phien = await layPhienKhach(req, res);
  if (!phien) return;
  try {
    const email = String(phien.taiKhoan || "").trim().toLowerCase();
    let nguoiDung = await NguoiDung.collection.findOne({ email });

    // Hỗ trợ tài khoản được sửa trực tiếp trên Atlas có email viết hoa hoặc dư khoảng trắng.
    if (!nguoiDung && email) {
      const emailAnToan = email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      nguoiDung = await NguoiDung.collection.findOne({
        email: { $regex: `^\\s*${emailAnToan}\\s*$`, $options: "i" },
      });
    }

    const vip = dangLaVip(nguoiDung);
    const vipTrangThaiTrongDatabase = layTrangThaiVip(nguoiDung);
    res.json({
      vip,
      timThayTaiKhoan: Boolean(nguoiDung),
      trangThai: vipTrangThaiTrongDatabase || "Chưa đăng ký",
      vipTrangThaiTrongDatabase,
      cacTruongLienQuanVip: Object.keys(nguoiDung || {}).filter((tenTruong) => /vip/i.test(tenTruong)),
      taiKhoanId: nguoiDung?._id?.toString() || null,
      vipHetHan: nguoiDung?.vipHetHan || null,
      emailTaiKhoan: nguoiDung?.email || null,
      database: NguoiDung.db.name,
      collection: NguoiDung.collection.name,
    });
  } catch {
    res.status(500).json({ message: "Không thể kiểm tra trạng thái VIP." });
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
  const phien = await layPhienKhach(req, res);
  if (!phien) return;
  try {
    const cacDon = await DonHang.find({ emailKhach: phien.taiKhoan, trangThai: "Đặt phòng thành công" })
      .select("maDon tenQuan thoiGianDat")
      .sort({ thoiGianDat: -1 }).lean();
    const cacYeuCau = await HoanTien.find({ emailKhach: phien.taiKhoan }).select("donHang trangThai").lean();
    const trangThaiTheoDon = new Map(cacYeuCau.map((yc) => [String(yc.donHang), yc.trangThai]));
    res.json(cacDon.map((don) => ({ ...don, yeuCauHoanTien: trangThaiTheoDon.get(String(don._id)) || null })));
  } catch {
    res.status(500).json({ message: "Không thể tải danh sách đơn đủ điều kiện." });
  }
});

router.get("/yeu-cau-cua-toi", async (req, res) => {
  const phien = await layPhienKhach(req, res);
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
  const phien = await layPhienKhach(req, res);
  if (!phien) return;
  const { maDon, nganHang, soTaiKhoan, tenThuHuong, hoaDon } = req.body || {};
  const nguoiDungVip = await NguoiDung.findOne({ email: phien.taiKhoan }).select("vipTrangThai vipHetHan").lean();
  if (!dangLaVip(nguoiDungVip)) {
    return res.status(403).json({ message: "Dịch vụ hoàn tiền dành cho tài khoản VIP. Tích lũy 1.000 điểm tích cực hoặc được Quản trị viên cấp VIP để sử dụng." });
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

router.patch("/yeu-cau/:id/xac-nhan-hoan-tien", yeuCauAdmin, async (req, res) => {
  try {
    const yc = await HoanTien.findOne({ _id: req.params.id, trangThai: "Đã duyệt" });
    if (!yc) {
      return res.status(409).json({ message: "Yêu cầu không ở trạng thái chờ xác nhận hoàn tiền." });
    }

    yc.trangThai = "Đã hoàn tiền";
    yc.adminHoanTien = req.taiKhoanNoiBo?.taiKhoan || "admin";
    yc.thoiGianHoanTien = new Date();
    await yc.save();
    await ThongBao.create({
      emailKhach: yc.emailKhach,
      noiDung: `Yêu cầu hoàn tiền ${yc.phanTramHoan}% cho đơn ${yc.maDon} đã được chuyển tiền hoàn thành công.`,
      loai: "hoan-tien",
    });
    res.json({ message: "Đã xác nhận hoàn tiền thành công.", trangThai: yc.trangThai });
  } catch {
    res.status(500).json({ message: "Không thể xác nhận hoàn tiền lúc này." });
  }
});

router.get("/thong-bao", async (req, res) => {
  const phien = await layPhienKhach(req, res);
  if (!phien) return;
  try {
    const thongBao = await ThongBao.find({ emailKhach: phien.taiKhoan }).sort({ createdAt: -1 }).limit(30).lean();
    res.json(thongBao);
  } catch {
    res.status(500).json({ message: "Không thể tải thông báo." });
  }
});

router.patch("/thong-bao/da-doc", async (req, res) => {
  const phien = await layPhienKhach(req, res);
  if (!phien) return;
  try {
    await ThongBao.updateMany({ emailKhach: phien.taiKhoan, daDoc: false }, { $set: { daDoc: true } });
    res.json({ message: "Đã đánh dấu thông báo đã đọc." });
  } catch {
    res.status(500).json({ message: "Không thể cập nhật thông báo." });
  }
});

module.exports = router;
