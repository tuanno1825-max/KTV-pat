async function taiThongTinTaiKhoan() {
  const phanHoi = await fetch("/api/phien-khach-hang", {
    credentials: "same-origin",
    cache: "no-store",
  });
  const phien = await phanHoi.json();
  if (!phien.daDangNhap) {
    window.location.replace("/html/dangnhap.html");
    return;
  }
  document.querySelector("#email-tai-khoan").textContent = phien.email || "";
  try {
    await Promise.all([
      taiDiemTichCuc(),
      taiLichSuDatPhong(),
      taiTrangThaiGoiVip(),
      taiYeuCauHoanTien(),
    ]);
  } catch (error) {
    document.querySelector("#thong-bao").textContent = error.message;
  }
}

async function taiDiemTichCuc() {
  const response = await fetch("/api/thong-tin-ca-nhan", { credentials: "same-origin", cache: "no-store" });
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error("Máy chủ chưa trả dữ liệu điểm tích cực. Hãy tải lại trang sau khi khởi động lại máy chủ.");
  }
  const user = await response.json();
  if (!response.ok) throw new Error(user.message || "Không tải được điểm tích cực.");
  const diem = Number(user.diemTichLuy || 0);
  const diemEl = document.querySelector("#diem-so-hien-tai");
  if (diemEl) diemEl.innerHTML = `${diem} <span>/ 600 điểm</span>`;
  const phanTram = Math.min(100, Math.round((diem / 600) * 100));
  const thanhTienDo = document.querySelector("#thanh-tien-do-diem");
  if (thanhTienDo) {
    thanhTienDo.style.width = `${phanTram}%`;
    thanhTienDo.parentElement.setAttribute("aria-valuenow", String(diem));
  }
  const laVip = Boolean(user.laVip);
  const conThieu = Math.max(0, 600 - diem);
  const moTa = document.querySelector("#mo-ta-tien-do");
  if (moTa) {
    moTa.innerHTML = laVip
      ? `🎉 Bạn đang sở hữu gói <strong>VIP</strong>! Điểm tích cực hiện tại: <strong>${diem}/600</strong>.`
      : `Bạn cần thêm <strong>${conThieu} điểm</strong> để tự động nhận <strong>VIP 1 tháng</strong>. Điểm sẽ được đặt lại sau khi nhận VIP.`;
  }
  const badgeVip = document.querySelector("#badge-vip-nho");
  if (badgeVip) badgeVip.innerHTML = laVip ? '<span class="huy-hieu-xac-thuc">👑 Đang là VIP</span>' : "";
}

async function taiTrangThaiGoiVip() {
  const phanHoi = await fetch("/api/hoan-tien/vip-trang-thai", {
    credentials: "same-origin",
    cache: "no-store",
  });
  const vip = await phanHoi.json();
  if (!phanHoi.ok)
    throw new Error(vip.message || "Không tải được trạng thái gói VIP.");
  const trangThai = document.querySelector("#trang-thai-goi-vip");
  if (vip.vip) {
    trangThai.textContent = vip.vipHetHan
      ? `Đang hoạt động · hết hạn ngày ${new Date(vip.vipHetHan).toLocaleDateString("vi-VN")}.`
      : "Đang hoạt động · tài khoản VIP đã được cấp trước đây, chưa có ngày hết hạn.";
  } else {
    trangThai.textContent = "Chưa có gói VIP đang hoạt động.";
    document.querySelector("#yeu-cau-dang-ky-vip").hidden = false;
  }
}

async function taiYeuCauHoanTien() {
  const vung = document.querySelector("#noi-dung-yeu-cau-hoan-tien");
  const phanHoi = await fetch("/api/hoan-tien/yeu-cau-cua-toi", {
    credentials: "same-origin",
    cache: "no-store",
  });
  const yeuCaus = await phanHoi.json();
  if (!phanHoi.ok)
    throw new Error(yeuCaus.message || "Không tải được yêu cầu hoàn tiền.");
  vung.replaceChildren();
  if (!yeuCaus.length) {
    vung.textContent = "Bạn chưa gửi yêu cầu hoàn tiền nào.";
    return;
  }
  const bang = document.createElement("table");
  bang.className = "bang-lich-su";
  const dau = document.createElement("thead");
  dau.innerHTML =
    "<tr><th>Mã đơn</th><th>Ngày gửi</th><th>Mức hoàn</th><th>Trạng thái</th></tr>";
  const than = document.createElement("tbody");
  yeuCaus.forEach((yc) => {
    const hang = document.createElement("tr");
    const ngay = yc.createdAt
      ? new Date(yc.createdAt).toLocaleDateString("vi-VN")
      : "—";
    const mucHoan = yc.phanTramHoan
      ? `${yc.phanTramHoan}%`
      : "Chờ nhân viên xét";
    [yc.maDon, ngay, mucHoan, yc.trangThai].forEach((giaTri) => {
      const o = document.createElement("td");
      o.textContent = giaTri || "—";
      hang.append(o);
    });
    than.append(hang);
  });
  bang.append(dau, than);
  vung.append(bang);
}

async function taiLichSuDatPhong() {
  const vung = document.querySelector("#noi-dung-lich-su");
  const phanHoi = await fetch("/api/don-hang/lich-su-khach", {
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!phanHoi.ok) throw new Error("Không thể tải lịch sử đặt phòng.");
  const donHang = await phanHoi.json();
  vung.replaceChildren();
  if (!donHang.length) {
    vung.textContent = "Chưa có đơn đặt gắn với tài khoản này.";
    return;
  }
  const bang = document.createElement("table");
  bang.className = "bang-lich-su";
  const dau = document.createElement("thead");
  dau.innerHTML =
    "<tr><th>Mã đơn</th><th>Quán</th><th>Ngày đặt</th><th>Giờ đến dự kiến</th><th>Trạng thái</th></tr>";
  const than = document.createElement("tbody");
  donHang.forEach((don) => {
    const hang = document.createElement("tr");
    const ngayDat = don.thoiGianDat
      ? new Date(don.thoiGianDat).toLocaleDateString("vi-VN")
      : "—";
    [
      don.maDon,
      don.tenQuan,
      ngayDat,
      don.thoiGianCheckIn,
      don.trangThai,
    ].forEach((giaTri) => {
      const o = document.createElement("td");
      o.textContent = giaTri || "—";
      hang.append(o);
    });
    than.append(hang);
  });
  bang.append(dau, than);
  vung.append(bang);
}

document.querySelector("#nut-dang-xuat").addEventListener("click", async () => {
  const nut = document.querySelector("#nut-dang-xuat");
  const thongBao = document.querySelector("#thong-bao");
  nut.disabled = true;
  try {
    const phanHoi = await fetch("/api/dang-xuat", {
      method: "POST",
      credentials: "same-origin",
    });
    if (!phanHoi.ok) throw new Error("Không thể đăng xuất lúc này.");
    window.location.replace("/");
  } catch (error) {
    thongBao.textContent = error.message;
    nut.disabled = false;
  }
});

taiThongTinTaiKhoan().catch((error) => {
  document.querySelector("#thong-bao").textContent =
    error.message || "Không tải được thông tin tài khoản.";
});
