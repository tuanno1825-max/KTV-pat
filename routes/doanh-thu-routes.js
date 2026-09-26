const express = require("express");
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const DonHang = require("../models/don-hang-models");
const Quan = require("../models/admin-models");
const { yeuCauQuanLy } = require("../middleware/xac-thuc-noi-bo");

const router = express.Router();
const thuMucHoaDon = path.join(__dirname, "..", "private_uploads", "hoa-don-doanh-thu");
const gioiHanAnh = 2 * 1024 * 1024;

function docAnh(dataUrl) {
  if (typeof dataUrl !== "string") return null;
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match) return null;
  const duLieu = Buffer.from(match[2], "base64");
  if (!duLieu.length || duLieu.length > gioiHanAnh) return null;
  const hopLe = match[1] === "image/jpeg"
    ? duLieu[0] === 0xff && duLieu[1] === 0xd8 && duLieu[duLieu.length - 2] === 0xff && duLieu[duLieu.length - 1] === 0xd9
    : match[1] === "image/png"
      ? duLieu.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : duLieu.toString("ascii", 0, 4) === "RIFF" && duLieu.toString("ascii", 8, 12) === "WEBP";
  if (!hopLe) return null;
  const ext = match[1] === "image/jpeg" ? ".jpg" : match[1] === "image/png" ? ".png" : ".webp";
  return { duLieu, ext };
}

function thoatRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

router.get("/doanh-thu", yeuCauQuanLy, async (req, res) => {
  try {
    const tuKhoa = String(req.query.tuKhoa || "").trim();
    const trangThaiThu = String(req.query.trangThaiThu || "tat-ca");
    const boLoc = { trangThai: "Đặt phòng thành công", diemCongDaXuLy: true };
    if (trangThaiThu === "da-thu") boLoc.doanhThuDaThu = true;
    if (trangThaiThu === "chua-thu") boLoc.doanhThuDaThu = { $ne: true };
    if (tuKhoa) {
      const regex = new RegExp(thoatRegex(tuKhoa), "i");
      boLoc.$or = [
        { maDon: regex }, { tenKhach: regex }, { tenQuan: regex }, { soDienThoai: regex },
      ];
    }
    const donHangs = await DonHang.find(boLoc)
      .select("maDon maQuan tenKhach emailKhach tenQuan soDienThoai thoiGianCheckIn thoiGianDat thoiGianKhachDen doanhThuDaThu soTienDaThu hoaDonQuanThu hoaDonChuyenTien thoiGianThuTien nhanVienThuTien")
      .sort({ thoiGianDat: -1 })
      .lean();
    const maQuans = [...new Set(donHangs.map((don) => don.maQuan).filter(Boolean))];
    const quans = await Quan.find({ maQuan: { $in: maQuans } }).select("maQuan chietKhau").lean();
    const chietKhauTheoQuan = new Map(quans.map((quan) => [quan.maQuan, Number(quan.chietKhau || 0)]));
    res.json(donHangs.map((don) => {
      const chietKhau = chietKhauTheoQuan.get(don.maQuan) || 0;
      const giamGiaKhach = chietKhau >= 15 ? chietKhau / 2 : 0;
      return { ...don, chietKhau, giamGiaKhach, thucNhanPhanTram: chietKhau - giamGiaKhach };
    }));
  } catch {
    res.status(500).json({ message: "Không thể tải danh sách doanh thu." });
  }
});

router.patch("/doanh-thu/:id/thu-tien", yeuCauQuanLy, async (req, res) => {
  const anhQuan = docAnh(req.body?.hoaDonQuan);
  const anhChuyenTien = docAnh(req.body?.hoaDonChuyenTien);
  const soTienDaThu = Number(req.body?.soTienDaThu);
  if (!anhQuan || !anhChuyenTien || !Number.isSafeInteger(soTienDaThu) || soTienDaThu <= 0) {
    return res.status(400).json({ message: "Nhập số tiền đã thu hợp lệ và đính kèm đủ hai ảnh hóa đơn (JPG, PNG hoặc WEBP, tối đa 2 MB mỗi ảnh)." });
  }

  const tenAnhQuan = `${crypto.randomUUID()}${anhQuan.ext}`;
  const tenAnhChuyenTien = `${crypto.randomUUID()}${anhChuyenTien.ext}`;
  try {
    await fs.mkdir(thuMucHoaDon, { recursive: true });
    await Promise.all([
      fs.writeFile(path.join(thuMucHoaDon, tenAnhQuan), anhQuan.duLieu, { flag: "wx" }),
      fs.writeFile(path.join(thuMucHoaDon, tenAnhChuyenTien), anhChuyenTien.duLieu, { flag: "wx" }),
    ]);
    const donHang = await DonHang.findOneAndUpdate(
      { _id: req.params.id, trangThai: "Đặt phòng thành công", diemCongDaXuLy: true, doanhThuDaThu: { $ne: true } },
      {
        $set: {
          doanhThuDaThu: true,
          soTienDaThu,
          hoaDonQuanThu: tenAnhQuan,
          hoaDonChuyenTien: tenAnhChuyenTien,
          thoiGianThuTien: new Date(),
          nhanVienThuTien: req.taiKhoanNoiBo?.taiKhoan || "",
        },
      },
      { new: true },
    ).select("maDon doanhThuDaThu thoiGianThuTien").lean();
    if (!donHang) {
      await Promise.all([
        fs.unlink(path.join(thuMucHoaDon, tenAnhQuan)).catch(() => {}),
        fs.unlink(path.join(thuMucHoaDon, tenAnhChuyenTien)).catch(() => {}),
      ]);
      return res.status(409).json({ message: "Đơn chưa được ghi nhận khách đến hoặc doanh thu đã được xác nhận thu." });
    }
    res.json({ message: `Đã xác nhận thu tiền cho đơn ${donHang.maDon}.`, donHang });
  } catch {
    await Promise.all([
      fs.unlink(path.join(thuMucHoaDon, tenAnhQuan)).catch(() => {}),
      fs.unlink(path.join(thuMucHoaDon, tenAnhChuyenTien)).catch(() => {}),
    ]);
    res.status(500).json({ message: "Không thể lưu xác nhận thu tiền." });
  }
});

router.get("/doanh-thu/:id/hoa-don/:loai", yeuCauQuanLy, async (req, res) => {
  try {
    const truong = req.params.loai === "quan"
      ? "hoaDonQuanThu"
      : req.params.loai === "chuyen-tien"
        ? "hoaDonChuyenTien"
        : null;
    if (!truong) return res.status(404).json({ message: "Không tìm thấy hóa đơn." });
    const donHang = await DonHang.findOne({ _id: req.params.id, trangThai: "Đặt phòng thành công", diemCongDaXuLy: true }).select(truong).lean();
    const tenTep = donHang?.[truong];
    if (!tenTep || path.basename(tenTep) !== tenTep) return res.status(404).json({ message: "Không tìm thấy hóa đơn." });
    res.sendFile(tenTep, { root: thuMucHoaDon }, (error) => {
      if (error && !res.headersSent) res.status(404).json({ message: "Không tìm thấy hóa đơn." });
    });
  } catch {
    res.status(500).json({ message: "Không thể tải hóa đơn." });
  }
});

module.exports = router;
