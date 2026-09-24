const formHoanTien = document.querySelector("#form-hoan-tien");
const thongBaoHoanTien = document.querySelector("#thong-bao-hoan-tien");
const chonDonHoanTien = document.querySelector("#don-hoan-tien");

async function docAnhThanhDataUrl(tep) {
  return new Promise((resolve, reject) => {
    const doc = new FileReader();
    doc.onload = () => resolve(doc.result);
    doc.onerror = () => reject(new Error("Không thể đọc ảnh hóa đơn."));
    doc.readAsDataURL(tep);
  });
}

async function taiDonDuDieuKien() {
  const phanHoi = await fetch("/api/hoan-tien/don-hang-cua-toi", { credentials: "same-origin", cache: "no-store" });
  const donHangs = await phanHoi.json();
  if (!phanHoi.ok) throw new Error(donHangs.message || "Không tải được đơn hàng.");
  chonDonHoanTien.replaceChildren(new Option("Chọn đơn đã hát", ""));
  donHangs.forEach((don) => {
    const nhan = `${don.maDon} · ${don.tenQuan} · ${new Date(don.thoiGianDat).toLocaleDateString("vi-VN")}`;
    const muc = new Option(nhan, don.maDon);
    if (don.yeuCauHoanTien) {
      muc.disabled = true;
      muc.textContent += ` (${don.yeuCauHoanTien})`;
    }
    chonDonHoanTien.add(muc);
  });
  const nutGui = formHoanTien.querySelector("button[type=submit]");
  nutGui.disabled = !donHangs.some((don) => !don.yeuCauHoanTien);
  if (!donHangs.length) {
    chonDonHoanTien.replaceChildren(new Option("Chưa có đơn đặt phòng thành công", ""));
    nutGui.disabled = true;
  }
}

async function khoiTaoUuDaiVip() {
  const trangThai = document.querySelector("#trang-thai-vip");
  const phanHoi = await fetch("/api/phien-khach-hang", { credentials: "same-origin", cache: "no-store" });
  const phien = await phanHoi.json();
  if (!phien.daDangNhap) {
    trangThai.textContent = "Đăng nhập tài khoản khách hàng để tham gia chương trình VIP.";
    document.querySelector("#yeu-cau-vip-dang-xuat").hidden = false;
    return;
  }
  const phanHoiVip = await fetch("/api/hoan-tien/vip-trang-thai", { credentials: "same-origin", cache: "no-store" });
  const tinhTrangVip = await phanHoiVip.json();
  if (!phanHoiVip.ok) throw new Error(tinhTrangVip.message || "Không kiểm tra được trạng thái VIP.");
  if (!tinhTrangVip.vip) {
    trangThai.textContent = `Tài khoản ${phien.email} chưa đăng ký VIP.`;
    const vungNangCap = document.querySelector("#yeu-cau-nang-cap-vip");
    vungNangCap.hidden = false;
    return;
  }
  trangThai.textContent = `Tài khoản ${phien.email} là thành viên VIP · Mức hoàn 5–20% do nhân viên xét duyệt.`;
  formHoanTien.hidden = false;
  try {
    await taiDonDuDieuKien();
  } catch (error) {
    thongBaoHoanTien.textContent = error.message;
    chonDonHoanTien.replaceChildren(new Option("Không tải được đơn hàng", ""));
  }
}

formHoanTien.addEventListener("submit", async (event) => {
  event.preventDefault();
  const nutGui = formHoanTien.querySelector("button[type=submit]");
  const tep = formHoanTien.elements.hoaDon.files[0];
  if (!tep || tep.size > 5 * 1024 * 1024) {
    thongBaoHoanTien.textContent = "Chọn ảnh hóa đơn có dung lượng tối đa 5 MB.";
    return;
  }
  nutGui.disabled = true;
  thongBaoHoanTien.textContent = "Đang gửi yêu cầu...";
  try {
    const hoaDon = await docAnhThanhDataUrl(tep);
    const duLieu = {
      maDon: formHoanTien.elements.maDon.value,
      nganHang: formHoanTien.elements.nganHang.value.trim(),
      soTaiKhoan: formHoanTien.elements.soTaiKhoan.value.trim(),
      tenThuHuong: formHoanTien.elements.tenThuHuong.value.trim(),
      hoaDon,
    };
    const phanHoi = await fetch("/api/hoan-tien/yeu-cau", {
      method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(duLieu),
    });
    const ketQua = await phanHoi.json();
    if (!phanHoi.ok) throw new Error(ketQua.message || "Không gửi được yêu cầu.");
    thongBaoHoanTien.textContent = ketQua.message;
    formHoanTien.reset();
    await taiDonDuDieuKien();
  } catch (error) {
    thongBaoHoanTien.textContent = error.message;
  } finally {
    nutGui.disabled = !chonDonHoanTien.options.some((muc) => muc.value && !muc.disabled);
  }
});

khoiTaoUuDaiVip().catch(() => {
  document.querySelector("#trang-thai-vip").textContent = "Không thể tải chương trình VIP lúc này.";
});
