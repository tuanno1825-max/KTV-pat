// Import Express va router de tao cac API quan ly quan
const express = require("express");
const crypto = require("crypto");
const router = express.Router();

// Import model Quan de thao tac voi collection admin trong MongoDB
const Quan = require("../models/admin-models");
const TaiKhoan = require("../models/tai-khoan-models");
const DonHang = require("../models/don-hang-models");
const NguoiDung = require("../models/nguoi-dung-model");
const { promisify } = require("util");
const scrypt = promisify(crypto.scrypt);

const BI_MAT_PHien = process.env.SESSION_SECRET || "ktv-session-secret-local";

function taoPhienNoiBo(taiKhoan, vaiTro) {
  const duLieu = Buffer.from(
    JSON.stringify({
      taiKhoan,
      vaiTro,
      hetHan: Date.now() + 24 * 60 * 60 * 1000,
    }),
  ).toString("base64url");
  const chuKy = crypto
    .createHmac("sha256", BI_MAT_PHien)
    .update(duLieu)
    .digest("base64url");
  return `${duLieu}.${chuKy}`;
}

function bamMatKhau(matKhau) {
  const muoi = crypto.randomBytes(16).toString("hex");
  return scrypt(matKhau, muoi, 64).then((khoa) => `${muoi}:${khoa.toString("hex")}`);
}

async function soSanhMatKhau(matKhau, giaTriDaBam) {
  const [muoi, khoaHex] = giaTriDaBam.split(":");
  if (!muoi || !khoaHex) return false;
  const khoa = await scrypt(matKhau, muoi, 64);
  const khoaCu = Buffer.from(khoaHex, "hex");
  return khoa.length === khoaCu.length && crypto.timingSafeEqual(khoa, khoaCu);
}

router.post("/dang-ky", async (req, res) => {
  try {
    const hoTen = typeof req.body?.hoTen === "string" ? req.body.hoTen.trim() : "";
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const matKhau = typeof req.body?.matKhau === "string" ? req.body.matKhau : "";
    if (req.body?.dongYDieuKhoan !== true) {
      return res.status(400).json({ message: "Vui lòng đồng ý với điều khoản sử dụng." });
    }
    if (!hoTen || hoTen.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Vui lòng nhập họ tên và email hợp lệ." });
    }
    if (matKhau.length < 6 || matKhau.length > 128) {
      return res.status(400).json({ message: "Mật khẩu cần từ 6 đến 128 ký tự." });
    }
    const matKhauDaBam = await bamMatKhau(matKhau);
    await NguoiDung.create({ hoTen, email, matKhau: matKhauDaBam });
    return res.status(201).json({ message: "Đăng ký thành công. Bạn có thể đăng nhập ngay." });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Email này đã được đăng ký." });
    }
    console.error("Lỗi đăng ký khách hàng:", error);
    return res.status(500).json({ message: "Không thể tạo tài khoản lúc này. Vui lòng thử lại." });
  }
});

router.post("/dang-nhap", async (req, res) => {
  try {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const matKhau = typeof req.body?.matKhau === "string" ? req.body.matKhau : "";
    const nguoiDung = await NguoiDung.findOne({ email }).select("+matKhau");
    if (!nguoiDung || !(await soSanhMatKhau(matKhau, nguoiDung.matKhau))) {
      return res.status(401).json({ message: "Email hoặc mật khẩu không đúng." });
    }
    const maPhien = taoPhienNoiBo(nguoiDung.email, "khach-hang");
    res.setHeader("Set-Cookie", `phien_dang_nhap=${maPhien}; Max-Age=86400; HttpOnly; SameSite=Lax; Path=/`);
    return res.json({ message: "Đăng nhập thành công." });
  } catch (error) {
    console.error("Lỗi đăng nhập khách hàng:", error);
    return res.status(500).json({ message: "Không thể đăng nhập lúc này. Vui lòng thử lại." });
  }
});

function layPhien(req) {
  const cookie = req.headers.cookie || "";
  const cap = cookie.match(/phien_dang_nhap=([^;]+)/);
  if (!cap) return null;

  const [duLieu, chuKy] = cap[1].split(".");
  if (!duLieu || !chuKy) return null;

  const chuKyDung = crypto
    .createHmac("sha256", BI_MAT_PHien)
    .update(duLieu)
    .digest("base64url");
  if (chuKy !== chuKyDung) return null;

  try {
    const phien = JSON.parse(Buffer.from(duLieu, "base64url").toString("utf8"));
    return phien.hetHan > Date.now() ? phien : null;
  } catch {
    return null;
  }
}

function yeuCauDangNhap(req, res, next) {
  const phien = layPhien(req);
  if (!phien) {
    return res.status(401).json({ message: "Bạn cần đăng nhập nội bộ." });
  }
  if (!["admin", "nhanvien"].includes(phien.vaiTro)) {
    return res.status(403).json({ message: "Tài khoản khách không có quyền truy cập khu vực nội bộ." });
  }
  req.taiKhoanNoiBo = phien;
  next();
}

function yeuCauAdmin(req, res, next) {
  yeuCauDangNhap(req, res, () => {
    if (req.taiKhoanNoiBo.vaiTro !== "admin") {
      return res
        .status(403)
        .json({ message: "Chỉ Admin được thực hiện thao tác này." });
    }
    next();
  });
}

// API: Dang nhap tai khoan admin/nhan vien
router.post("/dang-nhap-noi-bo", async (req, res) => {
  try {
    const { taiKhoan, matKhau, vaiTro } = req.body;
    const taiKhoanTimDuoc = await TaiKhoan.findOne({
      tendangnhap: taiKhoan,
      matkhau: matKhau,
      vaitro: vaiTro,
    }).lean();

    if (!taiKhoanTimDuoc) {
      return res
        .status(401)
        .json({ message: "Tài khoản hoặc mật khẩu không đúng." });
    }

    const maPhien = taoPhienNoiBo(
      taiKhoanTimDuoc.tendangnhap,
      taiKhoanTimDuoc.vaitro,
    );
    res.setHeader(
      "Set-Cookie",
      `phien_dang_nhap=${maPhien}; Max-Age=86400; HttpOnly; SameSite=Lax; Path=/`,
    );

    res.json({
      message: "Đăng nhập thành công.",
      vaiTro: taiKhoanTimDuoc.vaitro,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// API: Lay quyen cua phien hien tai
router.get("/quyen-noi-bo", yeuCauDangNhap, (req, res) => {
  res.json(req.taiKhoanNoiBo);
});

// API: Tao ma quan ke tiep
router.get("/quan/ma-moi", yeuCauAdmin, async (req, res) => {
  try {
    const quanCuoi = await Quan.findOne({ maQuan: /^Q\d+$/ })
      .sort({ maQuan: -1 })
      .select("maQuan")
      .lean();
    const soCuoi = quanCuoi ? Number(quanCuoi.maQuan.slice(1)) : 0;
    res.json({ maQuan: `Q${String(soCuoi + 1).padStart(3, "0")}` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// API cong khai: Lay cac quan dang hoat dong cho trang dat phong
router.get("/quan-cong-khai", async (req, res) => {
  try {
    const danhSachQuan = await Quan.find({})
      .select("maQuan tenQuan diaChiChiTiet khuVuc anhQuan chietKhau giaMin giaMax trangThai")
      .sort({ _id: -1 })
      .lean();

    res.json(
      danhSachQuan.map((quan) => ({
        maQuan: quan.maQuan,
        ten: quan.tenQuan,
        diaChi: quan.diaChiChiTiet,
        khuVuc: quan.khuVuc,
        anhQuan: quan.anhQuan,
        chietKhau: quan.chietKhau,
        giaMin: quan.giaMin ?? 0,
        giaMax: quan.giaMax ?? 0,
        trangThai: quan.trangThai,
      })),
    );
  } catch (error) {
    res.status(500).json({ message: "Không thể tải danh sách quán." });
  }
});

// API công khai: ghi nhận yêu cầu đặt phòng
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
      thoiGianCheckIn, soNguoi,
    });
    res.status(201).json({ message: "Đã ghi nhận yêu cầu đặt phòng.", maDon: donHang.maDon });
  } catch (error) {
    res.status(500).json({ message: "Không thể lưu yêu cầu đặt phòng." });
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

// API: Lay danh sach quan
router.get("/quan", yeuCauDangNhap, async (req, res) => {
  try {
    const { quanHuyen, trangThai, tuKhoa } = req.query;
    const boLoc = {};

    if (quanHuyen && quanHuyen !== "Tất cả") {
      boLoc.khuVuc = quanHuyen;
    }

    if (trangThai && trangThai !== "Tất cả") {
      boLoc.trangThai = trangThai;
    }

    if (tuKhoa) {
      boLoc.$or = [
        { tenQuan: { $regex: tuKhoa, $options: "i" } },
        { soDienThoai: { $regex: tuKhoa, $options: "i" } },
      ];
    }

    const danhSachQuan = await Quan.find(boLoc).sort({ _id: -1 }).lean();
    res.json(
      danhSachQuan.map((quan) => ({
        ...quan,
        quanHuyen: quan.khuVuc,
      })),
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// API: Them quan moi
router.post("/quan", yeuCauAdmin, async (req, res) => {
  try {
    const { giaMin, giaMax } = req.body;
    if (!Number.isFinite(Number(giaMin)) || !Number.isFinite(Number(giaMax)) || Number(giaMin) < 0 || Number(giaMax) < Number(giaMin)) {
      return res.status(400).json({ message: "Giá tối đa phải lớn hơn hoặc bằng giá tối thiểu và cả hai giá phải từ 0 trở lên." });
    }
    const quanMoi = new Quan({
      ...req.body,
      khuVuc: req.body.quanHuyen,
    });
    await quanMoi.save();
    res.status(201).json(quanMoi);
  } catch (error) {
    res.status(400).json({
      message: error.code === 11000 ? "Mã quán đã tồn tại" : error.message,
    });
  }
});

// API: Cap nhat thong tin quan theo ID
router.put("/quan/:id", yeuCauAdmin, async (req, res) => {
  try {
    const { giaMin, giaMax } = req.body;
    if (!Number.isFinite(Number(giaMin)) || !Number.isFinite(Number(giaMax)) || Number(giaMin) < 0 || Number(giaMax) < Number(giaMin)) {
      return res.status(400).json({ message: "Giá tối đa phải lớn hơn hoặc bằng giá tối thiểu và cả hai giá phải từ 0 trở lên." });
    }
    const quanDaCapNhat = await Quan.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        khuVuc: req.body.quanHuyen,
      },
      { new: true, runValidators: true },
    );

    if (!quanDaCapNhat) {
      return res.status(404).json({ message: "Không tìm thấy quán" });
    }

    res.json(quanDaCapNhat);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// API: Xoa quan theo ID
router.delete("/quan/:id", yeuCauAdmin, async (req, res) => {
  try {
    const quanDaXoa = await Quan.findByIdAndDelete(req.params.id);

    if (!quanDaXoa) {
      return res.status(404).json({ message: "Không tìm thấy quán" });
    }

    res.json({ message: "Xóa quán thành công" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Xuat router de server.js su dung
router.yeuCauDangNhap = yeuCauDangNhap;
module.exports = router;
