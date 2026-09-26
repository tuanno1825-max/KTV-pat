const express = require("express");
const Quan = require("../models/admin-models");
const DonHang = require("../models/don-hang-models");
const NguoiDung = require("../models/nguoi-dung-model");
const ThongBao = require("../models/thong-bao-model");
const { yeuCauDangNhap, layPhien } = require("../middleware/xac-thuc-noi-bo");
const router = express.Router();
router.post("/don-hang", async (req, res) => {
  try {
    const { maQuan, tenKhach, xungHo, soDienThoai, thoiGianCheckIn, soNguoi } =
      req.body;
    if (
      ![maQuan, tenKhach, xungHo, soDienThoai, thoiGianCheckIn, soNguoi].every(
        (v) => typeof v === "string" && v.trim(),
      )
    ) {
      return res
        .status(400)
        .json({ message: "Vui lòng điền đầy đủ thông tin đặt phòng." });
    }
    if (!/^[0-9+ ()-]{9,15}$/.test(soDienThoai)) {
      return res.status(400).json({ message: "Số điện thoại không hợp lệ." });
    }
    const quan = await Quan.findOne({ maQuan, trangThai: "Đang hoạt động" })
      .select("maQuan tenQuan")
      .lean();
    if (!quan)
      return res
        .status(404)
        .json({ message: "Quán không tồn tại hoặc đang tạm ngưng." });

    const donCuoi = await DonHang.findOne({ maDon: /^DH\d+$/ })
      .sort({ maDon: -1 })
      .select("maDon")
      .lean();
    const soTiepTheo = donCuoi ? Number(donCuoi.maDon.slice(2)) + 1 : 1;
    const donHang = await DonHang.create({
      maDon: `DH${String(soTiepTheo).padStart(6, "0")}`,
      maQuan: quan.maQuan,
      tenQuan: quan.tenQuan,
      tenKhach: tenKhach.trim(),
      xungHo,
      soDienThoai: soDienThoai.trim(),
      thoiGianCheckIn,
      emailKhach:
        layPhien(req)?.vaiTro === "khach-hang" ? layPhien(req).taiKhoan : "",
      soNguoi,
    });
    res.status(201).json({
      message: "Đã ghi nhận yêu cầu đặt phòng.",
      maDon: donHang.maDon,
    });
  } catch (error) {
    res.status(500).json({ message: "Không thể lưu yêu cầu đặt phòng." });
  }
});

// Lịch sử đặt phòng chỉ trả về các đơn gắn với phiên khách hàng hiện tại.
router.get("/don-hang/lich-su-khach", async (req, res) => {
  const phien = layPhien(req);
  if (phien?.vaiTro !== "khach-hang")
    return res.status(401).json({ message: "Vui lòng đăng nhập." });
  try {
    if (!(await NguoiDung.exists({ email: phien.taiKhoan }))) {
      return res
        .status(401)
        .json({ message: "Tài khoản này không còn hoạt động." });
    }
    const donHang = await DonHang.find({ emailKhach: phien.taiKhoan })
      .select("maDon tenQuan thoiGianCheckIn trangThai thoiGianDat")
      .sort({ thoiGianDat: -1 })
      .lean();
    res.json(donHang);
  } catch {
    res.status(500).json({ message: "Không thể tải lịch sử đặt phòng." });
  }
});

// API công khai: khách tra cứu phản hồi bằng mã đơn và số điện thoại
router.get("/don-hang/tra-cuu", async (req, res) => {
  try {
    const { maDon, soDienThoai } = req.query;
    if (!maDon || !soDienThoai)
      return res
        .status(400)
        .json({ message: "Thiếu mã đơn hoặc số điện thoại." });
    const don = await DonHang.findOne({
      maDon,
      soDienThoai: String(soDienThoai).trim(),
    })
      .select(
        "maDon trangThai tenQuan tenQuanDeXuat maQuanDeXuat maDonTiepTheo thoiGianDat daHuy",
      )
      .lean();
    if (!don)
      return res
        .status(404)
        .json({ message: "Không tìm thấy đơn với thông tin này." });
    let diaChiDeXuat = "";
    if (don.trangThai === "Đề xuất quán mới" && don.maQuanDeXuat) {
      const quanDeXuat = await Quan.findOne({ maQuan: don.maQuanDeXuat })
        .select("diaChiChiTiet")
        .lean();
      diaChiDeXuat = quanDeXuat?.diaChiChiTiet || "";
    }
    res.json({ ...don, diaChiDeXuat });
  } catch (error) {
    res.status(500).json({ message: "Không thể tra cứu trạng thái đơn." });
  }
});

// API công khai: khách chấp nhận hoặc từ chối quán được đề xuất
router.post("/don-hang/phan-hoi", async (req, res) => {
  try {
    const { maDon, soDienThoai, chapNhan, hanhDong } = req.body;
    if (
      !maDon ||
      !soDienThoai ||
      (typeof chapNhan !== "boolean" && hanhDong !== "huy")
    ) {
      return res.status(400).json({ message: "Thiếu thông tin phản hồi." });
    }
    const donGoc = await DonHang.findOne({
      maDon,
      soDienThoai: String(soDienThoai).trim(),
    });
    if (!donGoc)
      return res
        .status(404)
        .json({ message: "Không tìm thấy đơn với thông tin này." });
    if (donGoc.trangThai !== "Đề xuất quán mới") {
      return res
        .status(409)
        .json({ message: "Đơn này hiện không chờ phản hồi đề xuất." });
    }
    if (hanhDong === "huy") {
      donGoc.trangThai = "Đặt phòng thất bại";
      donGoc.daHuy = true;
      await donGoc.save();
      return res.json({ message: "Bạn đã hủy đặt phòng." });
    }
    if (!chapNhan) {
      donGoc.trangThai = "Khách từ chối đề xuất";
      await donGoc.save();
      return res.json({
        message:
          "Bạn đã bỏ qua quán được đề xuất. Nhân viên có thể gửi đề xuất khác.",
      });
    }
    if (donGoc.maDonTiepTheo) {
      return res.json({
        message: "Bạn đã chấp nhận đề xuất.",
        maDonMoi: donGoc.maDonTiepTheo,
      });
    }

    const quan = await Quan.findOne({
      maQuan: donGoc.maQuanDeXuat,
      trangThai: "Đang hoạt động",
    })
      .select("maQuan tenQuan")
      .lean();
    if (!quan)
      return res
        .status(409)
        .json({ message: "Quán được đề xuất hiện không còn hoạt động." });
    const donCuoi = await DonHang.findOne({ maDon: /^DH\d+$/ })
      .sort({ maDon: -1 })
      .select("maDon")
      .lean();
    const soTiepTheo = donCuoi ? Number(donCuoi.maDon.slice(2)) + 1 : 1;
    const maDonMoi = `DH${String(soTiepTheo).padStart(6, "0")}`;
    const donMoi = await DonHang.create({
      maDon: maDonMoi,
      maDonGoc: donGoc.maDon,
      maQuan: quan.maQuan,
      tenQuan: quan.tenQuan,
      tenKhach: donGoc.tenKhach,
      emailKhach: donGoc.emailKhach,
      xungHo: donGoc.xungHo,
      soDienThoai: donGoc.soDienThoai,
      thoiGianCheckIn: donGoc.thoiGianCheckIn,
      soNguoi: donGoc.soNguoi,
      trangThai: "Đang chờ xử lý",
    });
    donGoc.trangThai = "Khách đã chấp nhận đề xuất";
    donGoc.maDonTiepTheo = donMoi.maDon;
    await donGoc.save();
    res
      .status(201)
      .json({ message: "Đã chấp nhận quán đề xuất.", maDonMoi: donMoi.maDon });
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
    if (tuKhoa)
      boLoc.$or = [
        { maDon: { $regex: tuKhoa, $options: "i" } },
        { tenKhach: { $regex: tuKhoa, $options: "i" } },
      ];
    const donHangs = await DonHang.find(boLoc)
      .select(
        "maDon maQuan tenQuan tenKhach emailKhach xungHo soDienThoai thoiGianCheckIn soNguoi trangThai maQuanDeXuat tenQuanDeXuat maDonGoc maDonTiepTheo daHuy diemCongDaXuLy diemTruDaXuLy thoiGianDat",
      )
      .sort({ thoiGianDat: -1 })
      .lean();
    const maQuans = [
      ...new Set(donHangs.map((don) => don.maQuan).filter(Boolean)),
    ];
    const quans = await Quan.find({ maQuan: { $in: maQuans } })
      .select("maQuan soDienThoai")
      .lean();
    const soDienThoaiTheoQuan = new Map(
      quans.map((quan) => [quan.maQuan, quan.soDienThoai]),
    );
    res.json(
      donHangs.map((don) => ({
        ...don,
        soDienThoaiQuan: soDienThoaiTheoQuan.get(don.maQuan) || "",
      })),
    );
  } catch (error) {
    res.status(500).json({ message: "Không thể tải danh sách đơn hàng." });
  }
});

function ngayBangkokTuChuoi(ngayChuoi, congNgay = 0) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ngayChuoi || "")) return null;
  const [nam, thang, ngay] = ngayChuoi.split("-").map(Number);
  const mocUtcGoc = Date.UTC(nam, thang - 1, ngay);
  const ngayUtc = new Date(mocUtcGoc);
  if (
    ngayUtc.getUTCFullYear() !== nam ||
    ngayUtc.getUTCMonth() !== thang - 1 ||
    ngayUtc.getUTCDate() !== ngay
  )
    return null;
  const mocUtc = Date.UTC(nam, thang - 1, ngay + congNgay);
  return new Date(mocUtc - 7 * 60 * 60 * 1000);
}

function ngayHienTaiBangkok() {
  const cacPhanNgay = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const phanNgay = Object.fromEntries(
    cacPhanNgay.map((phan) => [phan.type, phan.value]),
  );
  return `${phanNgay.year}-${phanNgay.month}-${phanNgay.day}`;
}

router.get("/don-hang/thong-ke", yeuCauDangNhap, async (req, res) => {
  try {
    const tuNgay = String(req.query.tuNgay || "");
    const denNgay = String(req.query.denNgay || "");
    const mocTuNgay = tuNgay ? ngayBangkokTuChuoi(tuNgay) : null;
    const mocDenNgay = denNgay ? ngayBangkokTuChuoi(denNgay, 1) : null;
    if ((tuNgay && !mocTuNgay) || (denNgay && !mocDenNgay)) {
      return res.status(400).json({ message: "Ngày lọc không hợp lệ." });
    }
    if (mocTuNgay && mocDenNgay && mocTuNgay >= mocDenNgay) {
      return res
        .status(400)
        .json({ message: "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc." });
    }

    const ngayCuoiBieuDo = denNgay || ngayHienTaiBangkok();
    const mocCuoiBieuDo = ngayBangkokTuChuoi(ngayCuoiBieuDo, 1);
    const mocDauMacDinh = ngayBangkokTuChuoi(ngayCuoiBieuDo, -6);
    const dieuKienNgay = {};
    if (mocTuNgay) dieuKienNgay.$gte = mocTuNgay;
    if (mocDenNgay) dieuKienNgay.$lt = mocDenNgay;
    const cacBuocThongKe = [];
    if (Object.keys(dieuKienNgay).length)
      cacBuocThongKe.push({ $match: { thoiGianDat: dieuKienNgay } });
    cacBuocThongKe.push({
      $facet: {
        theoTrangThai: [
          { $group: { _id: "$trangThai", soLuong: { $sum: 1 } } },
        ],
        theoGio: [
          {
            $group: {
              _id: {
                $hour: { date: "$thoiGianDat", timezone: "Asia/Bangkok" },
              },
              soLuong: { $sum: 1 },
            },
          },
          { $sort: { soLuong: -1, _id: 1 } },
          { $limit: 1 },
        ],
        theoNgay: [
          ...(!Object.keys(dieuKienNgay).length
            ? [
                {
                  $match: {
                    thoiGianDat: { $gte: mocDauMacDinh, $lt: mocCuoiBieuDo },
                  },
                },
              ]
            : []),
          {
            $group: {
              _id: {
                ngay: {
                  $dateToString: {
                    format: "%Y-%m-%d",
                    date: "$thoiGianDat",
                    timezone: "Asia/Bangkok",
                  },
                },
                trangThai: "$trangThai",
              },
              soLuong: { $sum: 1 },
            },
          },
          { $sort: { "_id.ngay": 1 } },
        ],
        tong: [{ $count: "soLuong" }],
      },
    });
    const thongKe = await DonHang.aggregate(cacBuocThongKe);
    const ketQua = thongKe[0] || {};
    res.json({
      tongDon: ketQua.tong?.[0]?.soLuong || 0,
      theoTrangThai: ketQua.theoTrangThai || [],
      theoNgay: ketQua.theoNgay || [],
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
    const { maQuanDeXuat, xacNhanKhachDen } = req.body;
    const cacMaTrangThai = {
      pending: "Đang chờ xử lý",
      confirmed: "Đã xác nhận",
      success: "Đặt phòng thành công",
      failed: "Đặt phòng thất bại",
      proposal: "Đề xuất quán mới",
      noshow: "Khách không đến",
    };
    const trangThai = cacMaTrangThai[req.body.trangThai] || req.body.trangThai;
    if (!Object.values(cacMaTrangThai).includes(trangThai)) {
      return res.status(400).json({ message: "Trạng thái đơn không hợp lệ." });
    }
    const donHienTai = await DonHang.findById(req.params.id)
      .select("trangThai daHuy diemCongDaXuLy diemTruDaXuLy")
      .lean();
    if (!donHienTai)
      return res.status(404).json({ message: "Không tìm thấy đơn hàng." });
    if (
      ["Đặt phòng thành công", "Đặt phòng thất bại"].includes(trangThai) &&
      donHienTai.trangThai !== "Đã xác nhận" &&
      !(
        trangThai === "Đặt phòng thành công" &&
        donHienTai.trangThai === trangThai &&
        xacNhanKhachDen
      )
    ) {
      return res.status(409).json({
        message: "Hãy xác nhận đơn trước khi chọn kết quả đặt phòng.",
      });
    }
    if (
      trangThai === "Khách không đến" &&
      donHienTai.trangThai !== "Đặt phòng thành công"
    ) {
      return res
        .status(409)
        .json({
          message:
            "Chỉ có thể ghi nhận khách không đến sau khi đơn đã đặt phòng thành công.",
        });
    }
    if (
      xacNhanKhachDen &&
      (trangThai !== "Đặt phòng thành công" ||
        donHienTai.trangThai !== "Đặt phòng thành công")
    ) {
      return res
        .status(409)
        .json({
          message: "Chỉ xác nhận khách đã đến cho đơn đặt phòng thành công.",
        });
    }
    const capNhat = { trangThai, maQuanDeXuat: "", tenQuanDeXuat: "" };
    if (xacNhanKhachDen) capNhat.thoiGianKhachDen = new Date();
    if (trangThai === "Đề xuất quán mới") {
      if (donHienTai.daHuy) {
        return res.status(409).json({
          message: "Khách đã hủy đặt phòng, không thể gửi đề xuất mới.",
        });
      }
      if (
        !["Đặt phòng thất bại", "Khách từ chối đề xuất"].includes(
          donHienTai.trangThai,
        )
      ) {
        return res.status(409).json({
          message:
            "Chỉ có thể đề xuất quán sau khi đặt phòng thất bại hoặc khách từ chối đề xuất trước.",
        });
      }
    }
    if (trangThai === "Đề xuất quán mới") {
      if (!maQuanDeXuat)
        return res.status(400).json({ message: "Hãy chọn quán muốn đề xuất." });
      const quan = await Quan.findOne({
        maQuan: maQuanDeXuat,
        trangThai: "Đang hoạt động",
      })
        .select("maQuan tenQuan")
        .lean();
      if (!quan)
        return res.status(404).json({
          message: "Quán được chọn không tồn tại hoặc đang tạm ngưng.",
        });
      capNhat.maQuanDeXuat = quan.maQuan;
      capNhat.tenQuanDeXuat = quan.tenQuan;
    }
    const donHang = await DonHang.findByIdAndUpdate(req.params.id, capNhat, {
      new: true,
      runValidators: true,
    }).lean();
    if (!donHang)
      return res.status(404).json({ message: "Không tìm thấy đơn hàng." });
    if (xacNhanKhachDen && !donHienTai.diemCongDaXuLy && donHang.emailKhach) {
      const user = await NguoiDung.findOne({ email: donHang.emailKhach });
      if (user) {
        user.diemTichLuy = (user.diemTichLuy || 0) + 100;
        if (user.diemTichLuy >= 600) {
          const now = new Date();
          const start = user.vipHetHan > now ? user.vipHetHan : now;
          const end = new Date(start);
          const day = end.getDate();
          end.setMonth(end.getMonth() + 1);
          if (end.getDate() < day) end.setDate(0);
          user.vipTrangThai = "VIP";
          user.vipHetHan = end;
          user.diemTichLuy = 0;
        }
        await user.save();
        await ThongBao.create({
          emailKhach: user.email,
          noiDung: `Đơn ${donHang.maDon} thành công: +100 điểm. Số dư ${user.diemTichLuy} điểm.${user.diemTichLuy === 0 && user.vipTrangThai === "VIP" ? ` Bạn được tự động cấp VIP đến ${user.vipHetHan.toLocaleDateString("vi-VN")}.` : ""}`,
          loai: "he-thong",
        });
      }
      await DonHang.updateOne(
        { _id: donHang._id },
        { $set: { diemCongDaXuLy: true } },
      );
    } else if (
      trangThai === "Khách không đến" &&
      donHienTai.trangThai !== trangThai &&
      !donHienTai.diemTruDaXuLy &&
      donHang.emailKhach
    ) {
      const user = await NguoiDung.findOne({ email: donHang.emailKhach });
      if (user) {
        user.soLanKhongDen = (user.soLanKhongDen || 0) + 1;
        user.canhBao = `Đơn ${donHang.maDon}: khách đã đặt nhưng không đến.`;
        await user.save();
        await ThongBao.create({
          emailKhach: user.email,
          noiDung: `Quán đã ghi nhận bạn không đến theo đặt phòng ${donHang.maDon}. Điểm tích lũy không bị trừ.`,
          loai: "he-thong",
        });
      }
      await DonHang.updateOne(
        { _id: donHang._id },
        { $set: { diemTruDaXuLy: true } },
      );
    }
    res.json(donHang);
  } catch (error) {
    res.status(400).json({ message: "Không thể cập nhật đơn hàng." });
  }
});

module.exports = router;
