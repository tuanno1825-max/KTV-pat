const express = require("express");
const fs = require("fs/promises");
const path = require("path");
const HoanTien = require("../models/hoan-tien-model");
const ThongBao = require("../models/thong-bao-model");
const DonHang = require("../models/don-hang-models");
const NguoiDung = require("../models/nguoi-dung-model");
const { layPhien, yeuCauQuanLy } = require("../middleware/xac-thuc-noi-bo");

const router = express.Router();
const thuMucHoaDon = path.join(
  __dirname,
  "..",
  "private_uploads",
  "hoa-don-hoan-tien",
);
const thuMucBillHoanTien = path.join(
  __dirname,
  "..",
  "private_uploads",
  "bill-hoan-tien",
);
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
    res
      .status(401)
      .json({ message: "Vui lòng đăng nhập tài khoản khách hàng." });
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
  const truongTrangThai = Object.entries(nguoiDung).find(
    ([tenTruong]) =>
      tenTruong
        .normalize("NFKC")
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .replace(/\s+/g, "")
        .toLowerCase() === "viptrangthai",
  );
  return truongTrangThai?.[1] ?? null;
}

function dangLaVip(nguoiDung) {
  const trangThai = String(layTrangThaiVip(nguoiDung) || "")
    .trim()
    .toUpperCase();
  const hetHan = nguoiDung?.vipHetHan ? new Date(nguoiDung.vipHetHan) : null;
  return trangThai === "VIP" && (!hetHan || hetHan > new Date());
}

router.get("/vip-trang-thai", async (req, res) => {
  const phien = await layPhienKhach(req, res);
  if (!phien) return;
  try {
    const email = String(phien.taiKhoan || "")
      .trim()
      .toLowerCase();
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
      cacTruongLienQuanVip: Object.keys(nguoiDung || {}).filter((tenTruong) =>
        /vip/i.test(tenTruong),
      ),
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
  const khop =
    typeof dataUrl === "string" &&
    dataUrl.match(
      /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+=*)$/,
    );
  if (!khop || !cacMimeAnh.has(khop[1])) return null;
  const duLieu = Buffer.from(khop[2], "base64");
  if (!duLieu.length || duLieu.length > toiDaBytes) return null;
  const dungDinhDang =
    khop[1] === "image/png"
      ? duLieu
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : khop[1] === "image/jpeg"
        ? duLieu[0] === 255 &&
          duLieu[1] === 216 &&
          duLieu[duLieu.length - 2] === 255 &&
          duLieu[duLieu.length - 1] === 217
        : duLieu.toString("ascii", 0, 4) === "RIFF" &&
          duLieu.toString("ascii", 8, 12) === "WEBP";
  if (!dungDinhDang) return null;
  return {
    duLieu,
    duoi:
      khop[1] === "image/jpeg"
        ? ".jpg"
        : khop[1] === "image/png"
          ? ".png"
          : ".webp",
  };
}

router.get("/don-hang-cua-toi", async (req, res) => {
  const phien = await layPhienKhach(req, res);
  if (!phien) return;
  try {
    const cacDon = await DonHang.find({
      emailKhach: phien.taiKhoan,
      trangThai: "Đặt phòng thành công",
      thoiGianKhachDen: { $ne: null },
      vipConHanKhiKhachDen: true,
    })
      .select("maDon tenQuan thoiGianDat thoiGianKhachDen")
      .sort({ thoiGianDat: -1 })
      .lean();
    const cacYeuCau = await HoanTien.find({ emailKhach: phien.taiKhoan })
      .select("donHang trangThai")
      .lean();
    const trangThaiTheoDon = new Map(
      cacYeuCau.map((yc) => [String(yc.donHang), yc.trangThai]),
    );
    res.json(
      cacDon.map((don) => ({
        ...don,
        yeuCauHoanTien: trangThaiTheoDon.get(String(don._id)) || null,
      })),
    );
  } catch {
    res
      .status(500)
      .json({ message: "Không thể tải danh sách đơn đủ điều kiện." });
  }
});

router.get("/yeu-cau-cua-toi", async (req, res) => {
  const phien = await layPhienKhach(req, res);
  if (!phien) return;
  try {
    const yeuCaus = await HoanTien.find({ emailKhach: phien.taiKhoan })
      .select("maDon phanTramHoan trangThai createdAt thoiGianDuyet")
      .sort({ createdAt: -1 })
      .lean();
    res.json(yeuCaus);
  } catch {
    res.status(500).json({ message: "Không thể tải các yêu cầu hoàn tiền." });
  }
});

router.post("/yeu-cau", async (req, res) => {
  const phien = await layPhienKhach(req, res);
  if (!phien) return;
  const { maDon, nganHang, soTaiKhoan, tenThuHuong, hoaDon } = req.body || {};
  if (
    !maDon ||
    ![nganHang, soTaiKhoan, tenThuHuong].every(
      (giaTri) => typeof giaTri === "string" && giaTri.trim(),
    )
  ) {
    return res
      .status(400)
      .json({ message: "Vui lòng điền đầy đủ thông tin hoàn tiền." });
  }
  const anh = kiemTraAnh(hoaDon);
  if (!anh)
    return res.status(400).json({
      message: "Hóa đơn phải là ảnh JPG, PNG hoặc WEBP, tối đa 5 MB.",
    });
  let tepHoaDon;
  try {
    const don = await DonHang.findOne({
      maDon,
      emailKhach: phien.taiKhoan,
      trangThai: "Đặt phòng thành công",
      thoiGianKhachDen: { $ne: null },
      vipConHanKhiKhachDen: true,
    })
      .select("_id maDon")
      .lean();
    if (!don)
      return res.status(404).json({
        message:
          "Đơn này không đủ điều kiện hoàn tiền: cần check-in thành công khi VIP còn hiệu lực.",
      });
    if (await HoanTien.exists({ donHang: don._id }))
      return res
        .status(409)
        .json({ message: "Đơn này đã có yêu cầu hoàn tiền." });
    await fs.mkdir(thuMucHoaDon, { recursive: true });
    tepHoaDon = `${crypto.randomUUID()}${anh.duoi}`;
    await fs.writeFile(path.join(thuMucHoaDon, tepHoaDon), anh.duLieu, {
      flag: "wx",
    });
    const yeuCau = await HoanTien.create({
      emailKhach: phien.taiKhoan,
      donHang: don._id,
      maDon: don.maDon,
      nganHang: nganHang.trim(),
      soTaiKhoan: soTaiKhoan.trim(),
      tenThuHuong: tenThuHuong.trim(),
      tepHoaDon,
    });
    return res.status(201).json({
      message: "Đã gửi yêu cầu hoàn tiền. Quản lý sẽ kiểm tra hóa đơn.",
      id: yeuCau.id,
    });
  } catch (error) {
    if (tepHoaDon)
      await fs.unlink(path.join(thuMucHoaDon, tepHoaDon)).catch(() => {});
    if (error.code === 11000)
      return res
        .status(409)
        .json({ message: "Đơn này đã có yêu cầu hoàn tiền." });
    return res.status(500).json({ message: "Không thể gửi yêu cầu lúc này." });
  }
});

router.get("/yeu-cau", yeuCauQuanLy, async (_req, res) => {
  try {
    const cacYeuCau = await HoanTien.find()
      .sort({ createdAt: -1 })
      .limit(300)
      .lean();
    const cacEmail = [
      ...new Set(cacYeuCau.map((yc) => yc.emailKhach).filter(Boolean)),
    ];
    const nguoiDungs = await NguoiDung.find({ email: { $in: cacEmail } })
      .select("_id email hoTen maKhachHang")
      .lean();
    await Promise.all(
      nguoiDungs.map(async (user) => {
        user.maKhachHang ||= await NguoiDung.damBaoMaKhachHang(user);
      }),
    );
    const nguoiDungTheoEmail = new Map();
    nguoiDungs.forEach((user) => {
      nguoiDungTheoEmail.set(user.email, user);
    });
    res.json(
      cacYeuCau.map((yc) => ({
        ...yc,
        tenKhach:
          nguoiDungTheoEmail.get(yc.emailKhach)?.hoTen || "Khách hàng đã xóa",
        maKhachHang: nguoiDungTheoEmail.get(yc.emailKhach)?.maKhachHang || "",
        linkHoaDon: `/api/hoan-tien/yeu-cau/${yc._id}/hoa-don`,
        linkBillHoanTien: yc.tepBillHoanTien
          ? `/api/hoan-tien/yeu-cau/${yc._id}/bill-hoan-tien`
          : "",
      })),
    );
  } catch {
    res.status(500).json({ message: "Không thể tải yêu cầu hoàn tiền." });
  }
});

router.get("/yeu-cau/:id/hoa-don", yeuCauQuanLy, async (req, res) => {
  try {
    const yc = await HoanTien.findById(req.params.id)
      .select("tepHoaDon")
      .lean();
    if (!yc)
      return res.status(404).json({ message: "Không tìm thấy hóa đơn." });
    return res.sendFile(yc.tepHoaDon, { root: thuMucHoaDon });
  } catch {
    res.status(404).json({ message: "Không tìm thấy hóa đơn." });
  }
});

router.get("/yeu-cau/:id/bill-hoan-tien", yeuCauQuanLy, async (req, res) => {
  try {
    const yc = await HoanTien.findById(req.params.id)
      .select("tepBillHoanTien")
      .lean();
    if (
      !yc?.tepBillHoanTien ||
      path.basename(yc.tepBillHoanTien) !== yc.tepBillHoanTien
    ) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy bill hoàn tiền." });
    }
    return res.sendFile(yc.tepBillHoanTien, { root: thuMucBillHoanTien });
  } catch {
    res.status(404).json({ message: "Không tìm thấy bill hoàn tiền." });
  }
});

router.patch("/yeu-cau/:id/quyet-dinh", yeuCauQuanLy, async (req, res) => {
  const quyetDinh = req.body?.quyetDinh;
  if (!["duyet", "tu-choi"].includes(quyetDinh))
    return res.status(400).json({ message: "Quyết định không hợp lệ." });
  const phanTramHoan = quyetDinh === "duyet" ? 5 : null;
  try {
    const yc = await HoanTien.findOne({
      _id: req.params.id,
      trangThai: "Chờ duyệt",
    });
    if (!yc)
      return res
        .status(404)
        .json({ message: "Yêu cầu không tồn tại hoặc đã được xử lý." });
    const don = await DonHang.findOne({
      _id: yc.donHang,
      emailKhach: yc.emailKhach,
      trangThai: "Đặt phòng thành công",
      thoiGianKhachDen: { $ne: null },
      vipConHanKhiKhachDen: true,
    })
      .select("_id")
      .lean();
    if (!don)
      return res
        .status(409)
        .json({ message: "Đơn hàng không còn đủ điều kiện hoàn tiền." });
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
    await ThongBao.create({
      emailKhach: yc.emailKhach,
      noiDung,
      loai: "hoan-tien",
    });
    res.json({
      message: "Đã cập nhật yêu cầu hoàn tiền.",
      trangThai: yc.trangThai,
    });
  } catch {
    res.status(500).json({ message: "Không thể cập nhật yêu cầu hoàn tiền." });
  }
});

router.patch(
  "/yeu-cau/:id/xac-nhan-hoan-tien",
  yeuCauQuanLy,
  async (req, res) => {
    const anhBill = kiemTraAnh(req.body?.billHoanTien);
    if (!anhBill) {
      return res.status(400).json({
        message:
          "Vui l\u00f2ng t\u1ea3i \u1ea3nh bill ho\u00e0n ti\u1ec1n h\u1ee3p l\u1ec7 (JPG, PNG, WEBP; t\u1ed1i \u0111a 5 MB).",
      });
    }

    const tenTep = crypto.randomUUID() + anhBill.duoi;
    const duongDanTep = path.join(thuMucBillHoanTien, tenTep);
    let daCapNhat = false;
    try {
      await fs.mkdir(thuMucBillHoanTien, { recursive: true });
      await fs.writeFile(duongDanTep, anhBill.duLieu, { flag: "wx" });
      const yc = await HoanTien.findOneAndUpdate(
        { _id: req.params.id, trangThai: "\u0110\u00e3 duy\u1ec7t" },
        {
          $set: {
            trangThai: "\u0110\u00e3 ho\u00e0n ti\u1ec1n",
            adminHoanTien: req.taiKhoanNoiBo?.taiKhoan || "",
            thoiGianHoanTien: new Date(),
            tepBillHoanTien: tenTep,
          },
        },
        { new: true },
      );
      if (!yc) {
        await fs.unlink(duongDanTep).catch(() => {});
        return res.status(409).json({
          message:
            "Y\u00eau c\u1ea7u kh\u00f4ng c\u00f2n ch\u1edd x\u00e1c nh\u1eadn ho\u00e0n ti\u1ec1n.",
        });
      }
      daCapNhat = true;
      await ThongBao.create({
        emailKhach: yc.emailKhach,
        noiDung:
          "Y\u00eau c\u1ea7u ho\u00e0n ti\u1ec1n " +
          yc.phanTramHoan +
          "% cho \u0111\u01a1n " +
          yc.maDon +
          " \u0111\u00e3 \u0111\u01b0\u1ee3c chuy\u1ec3n ti\u1ec1n ho\u00e0n th\u00e0nh c\u00f4ng.",
        loai: "hoan-tien",
      });
      return res.json({
        message:
          "\u0110\u00e3 x\u00e1c nh\u1eadn ho\u00e0n ti\u1ec1n th\u00e0nh c\u00f4ng.",
        trangThai: yc.trangThai,
      });
    } catch {
      if (!daCapNhat) await fs.unlink(duongDanTep).catch(() => {});
      return res.status(500).json({
        message:
          "Kh\u00f4ng th\u1ec3 x\u00e1c nh\u1eadn ho\u00e0n ti\u1ec1n l\u00fac n\u00e0y.",
      });
    }
  },
);
router.get("/thong-bao", async (req, res) => {
  const phien = await layPhienKhach(req, res);
  if (!phien) return;
  try {
    const thongBao = await ThongBao.find({ emailKhach: phien.taiKhoan })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();
    res.json(thongBao);
  } catch {
    res.status(500).json({ message: "Không thể tải thông báo." });
  }
});

router.patch("/thong-bao/da-doc", async (req, res) => {
  const phien = await layPhienKhach(req, res);
  if (!phien) return;
  try {
    await ThongBao.updateMany(
      { emailKhach: phien.taiKhoan, daDoc: false },
      { $set: { daDoc: true } },
    );
    res.json({ message: "Đã đánh dấu thông báo đã đọc." });
  } catch {
    res.status(500).json({ message: "Không thể cập nhật thông báo." });
  }
});

module.exports = router;
