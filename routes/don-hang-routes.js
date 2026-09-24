const express = require("express");
const Quan = require("../models/admin-models");
const DonHang = require("../models/don-hang-models");
const { yeuCauDangNhap, layPhien } = require("../middleware/xac-thuc-noi-bo");
const router = express.Router();
router.post("/don-hang", async (req, res) => {
  try {
    const { maQuan, tenKhach, xungHo, soDienThoai, thoiGianCheckIn, soNguoi } = req.body;
    if (![maQuan, tenKhach, xungHo, soDienThoai, thoiGianCheckIn, soNguoi].every((v) => typeof v === "string" && v.trim())) {
      return res.status(400).json({ message: "Vui lòng điền đầy đủ thông tin đặt phòng." });
    }
    if (!/^[0-9+ ()-]{9,15}$/.test(soDienThoai)) {
      return res.status(400).json({ message: "Số điện thoại không hợp lệ." });
    }
    const quan = await Quan.findOne({ maQuan, trangThai: "Đang hoạt động" }).select("maQuan tenQuan").lean();
    if (!quan) return res.status(404).json({ message: "Quán không tồn tại hoặc đang tạm ngưng." });

    const donCuoi = await DonHang.findOne({ maDon: /^DH\d+$/ }).sort({ maDon: -1 }).select("maDon").lean();
    const soTiepTheo = donCuoi ? Number(donCuoi.maDon.slice(2)) + 1 : 1;
    const donHang = await DonHang.create({
      maDon: `DH${String(soTiepTheo).padStart(6, "0")}`,
      maQuan: quan.maQuan,
      tenQuan: quan.tenQuan,
      tenKhach: tenKhach.trim(), xungHo, soDienThoai: soDienThoai.trim(),
      emailKhach: layPhien(req)?.vaiTro === "khach-hang" ? layPhien(req).taiKhoan : "",
      thoiGianCheckIn, soNguoi,
    });
    res.status(201).json({ message: "Đã ghi nhận yêu cầu đặt phòng.", maDon: donHang.maDon });
  } catch (error) {
    res.status(500).json({ message: "Không thể lưu yêu cầu đặt phòng." });
  }
});

// Lịch sử đặt phòng chỉ trả về các đơn gắn với phiên khách hàng hiện tại.
router.get("/don-hang/lich-su-khach", async (req, res) => {
  const phien = layPhien(req);
  if (phien?.vaiTro !== "khach-hang") return res.status(401).json({ message: "Vui lòng đăng nhập." });
  try {
    const donHang = await DonHang.find({ emailKhach: phien.taiKhoan })
      .select("maDon tenQuan thoiGianCheckIn trangThai thoiGianDat")
      .sort({ thoiGianDat: -1 }).lean();
    res.json(donHang);
  } catch {
    res.status(500).json({ message: "Không thể tải lịch sử đặt phòng." });
  }
});

// API công khai: khách tra cứu phản hồi bằng mã đơn và số điện thoại
router.get("/don-hang/tra-cuu", async (req, res) => {
  try {
    const { maDon, soDienThoai } = req.query;
    if (!maDon || !soDienThoai) return res.status(400).json({ message: "Thiếu mã đơn hoặc số điện thoại." });
    const don = await DonHang.findOne({ maDon, soDienThoai: String(soDienThoai).trim() })
      .select("maDon trangThai tenQuan tenQuanDeXuat maDonTiepTheo thoiGianDat daHuy").lean();
    if (!don) return res.status(404).json({ message: "Không tìm thấy đơn với thông tin này." });
    res.json(don);
  } catch (error) {
    res.status(500).json({ message: "Không thể tra cứu trạng thái đơn." });
  }
});

// API công khai: khách chấp nhận hoặc từ chối quán được đề xuất
router.post("/don-hang/phan-hoi", async (req, res) => {
  try {
    const { maDon, soDienThoai, chapNhan, hanhDong } = req.body;
    if (!maDon || !soDienThoai || (typeof chapNhan !== "boolean" && hanhDong !== "huy")) {
      return res.status(400).json({ message: "Thiếu thông tin phản hồi." });
    }
    const donGoc = await DonHang.findOne({ maDon, soDienThoai: String(soDienThoai).trim() });
    if (!donGoc) return res.status(404).json({ message: "Không tìm thấy đơn với thông tin này." });
    if (donGoc.trangThai !== "Đề xuất quán mới") {
      return res.status(409).json({ message: "Đơn này hiện không chờ phản hồi đề xuất." });
    }
    if (hanhDong === "huy") {
      donGoc.trangThai = "Đặt phòng thất bại";
      donGoc.daHuy = true;
      await donGoc.save();
      return res.json({ message: "Bạn đã hủy đặt phòng." });
    }
    if (!chapNhan) {
      donGoc.trangThai = "Đặt phòng thất bại";
      await donGoc.save();
      return res.json({ message: "Bạn đã bỏ qua quán được đề xuất. Nhân viên có thể gửi đề xuất khác." });
    }
    if (donGoc.maDonTiepTheo) {
      return res.json({ message: "Bạn đã chấp nhận đề xuất.", maDonMoi: donGoc.maDonTiepTheo });
    }

    const quan = await Quan.findOne({ maQuan: donGoc.maQuanDeXuat, trangThai: "Đang hoạt động" }).select("maQuan tenQuan").lean();
    if (!quan) return res.status(409).json({ message: "Quán được đề xuất hiện không còn hoạt động." });
    const donCuoi = await DonHang.findOne({ maDon: /^DH\d+$/ }).sort({ maDon: -1 }).select("maDon").lean();
    const soTiepTheo = donCuoi ? Number(donCuoi.maDon.slice(2)) + 1 : 1;
    const maDonMoi = `DH${String(soTiepTheo).padStart(6, "0")}`;
    const donMoi = await DonHang.create({
      maDon: maDonMoi, maDonGoc: donGoc.maDon,
      maQuan: quan.maQuan, tenQuan: quan.tenQuan,
      tenKhach: donGoc.tenKhach, xungHo: donGoc.xungHo,
      soDienThoai: donGoc.soDienThoai, thoiGianCheckIn: donGoc.thoiGianCheckIn,
      soNguoi: donGoc.soNguoi, trangThai: "Đang chờ xử lý",
    });
    donGoc.trangThai = "Đặt phòng thất bại";
    donGoc.maDonTiepTheo = donMoi.maDon;
    await donGoc.save();
    res.status(201).json({ message: "Đã chấp nhận quán đề xuất.", maDonMoi: donMoi.maDon });
  } catch (error) {
    res.status(500).json({ message: "Không thể ghi nhận phản hồi của bạn." });
  }
});

// API nội bộ: danh sách đơn và cập nhật trạng thái
router.get("/don-hang", yeuCauDangNhap, async (req, res) => {
  try {
    const { tuKhoa = "", trangThai = "Tất cả" } = req.query;
    const boLoc = {};
    if (trangThai !== "Tất cả") boLoc.trangThai = trangThai;
    if (tuKhoa) boLoc.$or = [
      { maDon: { $regex: tuKhoa, $options: "i" } },
      { tenKhach: { $regex: tuKhoa, $options: "i" } },
    ];
    res.json(await DonHang.find(boLoc).sort({ thoiGianDat: -1 }).lean());
  } catch (error) {
    res.status(500).json({ message: "Không thể tải danh sách đơn hàng." });
  }
});

router.get("/don-hang/thong-ke", yeuCauDangNhap, async (req, res) => {
  try {
    const thongKe = await DonHang.aggregate([
      {
        $facet: {
          theoTrangThai: [
            { $group: { _id: "$trangThai", soLuong: { $sum: 1 } } },
          ],
          theoGio: [
            {
              $group: {
                _id: { $hour: { date: "$thoiGianDat", timezone: "Asia/Bangkok" } },
                soLuong: { $sum: 1 },
              },
            },
            { $sort: { soLuong: -1, _id: 1 } },
            { $limit: 1 },
          ],
          tong: [{ $count: "soLuong" }],
        },
      },
    ]);
    const ketQua = thongKe[0] || {};
    res.json({
      tongDon: ketQua.tong?.[0]?.soLuong || 0,
      theoTrangThai: ketQua.theoTrangThai || [],
      gioCaoDiem: ketQua.theoGio?.[0]
        ? { gio: ketQua.theoGio[0]._id, soLuong: ketQua.theoGio[0].soLuong }
        : null,
    });
  } catch (error) {
    res.status(500).json({ message: "Không thể tải thống kê đơn hàng." });
  }
});

router.patch("/don-hang/:id", yeuCauDangNhap, async (req, res) => {
  try {
    const { maQuanDeXuat } = req.body;
    const cacMaTrangThai = {
      pending: "Đang chờ xử lý",
      confirmed: "Đã xác nhận",
      success: "Đặt phòng thành công",
      failed: "Đặt phòng thất bại",
      proposal: "Đề xuất quán mới",
    };
    const trangThai = cacMaTrangThai[req.body.trangThai] || req.body.trangThai;
    if (!Object.values(cacMaTrangThai).includes(trangThai)) {
      return res.status(400).json({ message: "Trạng thái đơn không hợp lệ." });
    }
    const donHienTai = await DonHang.findById(req.params.id).select("trangThai daHuy").lean();
    if (!donHienTai) return res.status(404).json({ message: "Không tìm thấy đơn hàng." });
    if (["Đặt phòng thành công", "Đặt phòng thất bại"].includes(trangThai) && donHienTai.trangThai !== "Đã xác nhận") {
      return res.status(409).json({ message: "Hãy xác nhận đơn trước khi chọn kết quả đặt phòng." });
    }
    const capNhat = { trangThai, maQuanDeXuat: "", tenQuanDeXuat: "" };
    if (trangThai === "Đề xuất quán mới") {
      if (donHienTai.daHuy) {
        return res.status(409).json({ message: "Khách đã hủy đặt phòng, không thể gửi đề xuất mới." });
      }
      if (!["Đặt phòng thất bại", "Khách từ chối đề xuất"].includes(donHienTai.trangThai)) {
        return res.status(409).json({ message: "Chỉ có thể đề xuất quán sau khi đặt phòng thất bại hoặc khách từ chối đề xuất trước." });
      }
    }
    if (trangThai === "Đề xuất quán mới") {
      if (!maQuanDeXuat) return res.status(400).json({ message: "Hãy chọn quán muốn đề xuất." });
      const quan = await Quan.findOne({ maQuan: maQuanDeXuat, trangThai: "Đang hoạt động" }).select("maQuan tenQuan").lean();
      if (!quan) return res.status(404).json({ message: "Quán được chọn không tồn tại hoặc đang tạm ngưng." });
      capNhat.maQuanDeXuat = quan.maQuan;
      capNhat.tenQuanDeXuat = quan.tenQuan;
    }
    const donHang = await DonHang.findByIdAndUpdate(req.params.id, capNhat, { new: true, runValidators: true }).lean();
    if (!donHang) return res.status(404).json({ message: "Không tìm thấy đơn hàng." });
    res.json(donHang);
  } catch (error) {
    res.status(400).json({ message: "Không thể cập nhật đơn hàng." });
  }
});


module.exports = router;
