function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char],
  );
}

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

function chonTabTaiKhoan(tab) {
  const nut = document.querySelector(`[data-tab-tai-khoan="${tab}"]`);
  if (!nut) return;
  document.querySelectorAll("[data-tab-tai-khoan]").forEach((muc) => {
    const dangChon = muc === nut;
    muc.classList.toggle("dang-chon", dangChon);
    muc.setAttribute("aria-selected", String(dangChon));
  });
  document.querySelectorAll("[data-tab-noi-dung]").forEach((muc) => {
    muc.hidden = muc.dataset.tabNoiDung !== tab;
  });
}

document.querySelectorAll("[data-tab-tai-khoan]").forEach((nut) => {
  nut.addEventListener("click", () => {
    chonTabTaiKhoan(nut.dataset.tabTaiKhoan);
  });
});

function moTabTheoHash() {
  const tabTheoHash =
    {
      "goi-vip": "vip",
      "lich-su": "lich-su",
      "yeu-cau-hoan-tien": "hoan-tien",
      "thong-tin-ca-nhan": "tong-quan",
    }[window.location.hash.slice(1)] || "tong-quan";
  chonTabTaiKhoan(tabTheoHash);
}

moTabTheoHash();
window.addEventListener("hashchange", moTabTheoHash);

async function taiDiemTichCuc() {
  const response = await fetch("/api/thong-tin-ca-nhan", {
    credentials: "same-origin",
    cache: "no-store",
  });
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error(
      "Máy chủ chưa trả dữ liệu điểm tích cực. Hãy tải lại trang sau khi khởi động lại máy chủ.",
    );
  }
  const user = await response.json();
  if (!response.ok)
    throw new Error(user.message || "Không tải được điểm tích cực.");
  document.querySelector("#ma-khach-hang").textContent =
    user.maKhachHang || "—";
  document.querySelector("#biet-danh").value =
    user.bietDanh || user.hoTen || "";
  document.querySelector("#so-dien-thoai-ca-nhan").value =
    user.soDienThoai || "";
  capNhatXemTruocAvatar(
    user.avatarUrl,
    user.bietDanh || user.hoTen,
    user.avatarZoom || 1.4,
  );
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
  if (badgeVip)
    badgeVip.innerHTML = laVip
      ? '<span class="huy-hieu-xac-thuc">👑 Đang là VIP</span>'
      : "";
}

let urlXemTruocTep = "";
let xoaAvatarDaChon = false;
let duongDanAvatarXemTruoc = "";

function capNhatXemTruocAvatar(avatarUrl, bietDanh, avatarZoom = 1.4) {
  const anh = document.querySelector("#xem-truoc-anh-dai-dien");
  const chuCai = document.querySelector("#chu-cai-avatar");
  const nutXoa = document.querySelector("#xoa-anh-dai-dien");
  const thanhZoom = document.querySelector("#zoom-anh-dai-dien");
  const giaTriZoom = document.querySelector("#gia-tri-zoom-avatar");
  duongDanAvatarXemTruoc = avatarUrl || "";
  const coAnh = Boolean(avatarUrl);
  anh.hidden = !coAnh;
  chuCai.hidden = coAnh;
  nutXoa.hidden = !coAnh;
  chuCai.textContent = (bietDanh || "K").trim().charAt(0).toUpperCase();
  if (coAnh) {
    anh.src = avatarUrl;
    anh.style.setProperty("--avatar-zoom", String(avatarZoom));
  } else anh.removeAttribute("src");
  thanhZoom.value = String(avatarZoom);
  giaTriZoom.value = `${Number(avatarZoom).toFixed(1)}×`;
}

document
  .querySelector("#zoom-anh-dai-dien")
  .addEventListener("input", (event) => {
    const mucZoom = Number(event.target.value);
    document.querySelector("#gia-tri-zoom-avatar").value =
      `${mucZoom.toFixed(1)}×`;
    document
      .querySelector("#xem-truoc-anh-dai-dien")
      .style.setProperty("--avatar-zoom", String(mucZoom));
  });

function docAnhDaiDien(tep) {
  return new Promise((resolve, reject) => {
    const doc = new FileReader();
    doc.onload = () => resolve(doc.result);
    doc.onerror = () => reject(new Error("Không đọc được ảnh đại diện."));
    doc.readAsDataURL(tep);
  });
}

const tepAnhDaiDien = document.querySelector("#tep-anh-dai-dien");
const formThongTinCaNhan = document.querySelector("#form-thong-tin-ca-nhan");
const hopXacNhanHoSo = document.querySelector("#hop-xac-nhan-ho-so");
const dongYLuuHoSo = document.querySelector("#dong-y-luu-ho-so");
let dangXacNhanLuuHoSo = false;

function dongHopXacNhanHoSo() {
  hopXacNhanHoSo.hidden = true;
}

const formDoiMatKhau = document.querySelector("#form-doi-mat-khau");
const nutMoDoiMatKhau = document.querySelector("#nut-mo-doi-mat-khau");
nutMoDoiMatKhau?.addEventListener("click", () => {
  const dangMo = formDoiMatKhau.hidden;
  formDoiMatKhau.hidden = !dangMo;
  nutMoDoiMatKhau.setAttribute("aria-expanded", String(dangMo));
  nutMoDoiMatKhau.querySelector("span").textContent = dangMo
    ? "Thu gọn"
    : "Đổi mật khẩu";
  if (dangMo) formDoiMatKhau.querySelector("input")?.focus();
});

document
  .querySelectorAll("#form-doi-mat-khau [data-hien-mat-khau]")
  .forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      checkbox.dataset.hienMatKhau
        .split(",")
        .map((id) => document.getElementById(id))
        .filter(Boolean)
        .forEach((input) => {
          input.type = checkbox.checked ? "text" : "password";
        });
    });
  });

hopXacNhanHoSo?.querySelectorAll("[data-dong-hop-xac-nhan]").forEach((nut) => {
  nut.addEventListener("click", dongHopXacNhanHoSo);
});

dongYLuuHoSo?.addEventListener("click", () => {
  dangXacNhanLuuHoSo = true;
  dongHopXacNhanHoSo();
  formThongTinCaNhan.requestSubmit();
});

tepAnhDaiDien.addEventListener("change", () => {
  const tep = tepAnhDaiDien.files[0];
  if (!tep) return;
  if (
    !/^image\/(jpeg|png|webp)$/.test(tep.type) ||
    tep.size > 2 * 1024 * 1024
  ) {
    document.querySelector("#thong-bao-ho-so").textContent =
      "Ảnh phải là JPG, PNG hoặc WEBP và không vượt quá 2 MB.";
    tepAnhDaiDien.value = "";
    return;
  }
  if (urlXemTruocTep) URL.revokeObjectURL(urlXemTruocTep);
  urlXemTruocTep = URL.createObjectURL(tep);
  xoaAvatarDaChon = false;
  capNhatXemTruocAvatar(
    urlXemTruocTep,
    document.querySelector("#biet-danh").value,
    Number(document.querySelector("#zoom-anh-dai-dien").value),
  );
  document.querySelector("#thong-bao-ho-so").textContent = "";
});

document.querySelector("#biet-danh").addEventListener("input", (event) => {
  if (!document.querySelector("#xem-truoc-anh-dai-dien").hidden) return;
  document.querySelector("#chu-cai-avatar").textContent =
    event.target.value.trim().charAt(0).toUpperCase() || "K";
});

document.querySelector("#xoa-anh-dai-dien").addEventListener("click", () => {
  tepAnhDaiDien.value = "";
  if (urlXemTruocTep) URL.revokeObjectURL(urlXemTruocTep);
  urlXemTruocTep = "";
  xoaAvatarDaChon = true;
  capNhatXemTruocAvatar("", document.querySelector("#biet-danh").value);
});

formThongTinCaNhan.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!dangXacNhanLuuHoSo) {
    hopXacNhanHoSo.hidden = false;
    return;
  }
  dangXacNhanLuuHoSo = false;
  const nutLuu = document.querySelector("#luu-ho-so");
  const thongBao = document.querySelector("#thong-bao-ho-so");
  const tep = tepAnhDaiDien.files[0];
  nutLuu.disabled = true;
  thongBao.textContent = "Đang lưu hồ sơ...";
  try {
    const noiDung = {
      bietDanh: document.querySelector("#biet-danh").value.trim(),
      soDienThoai: document
        .querySelector("#so-dien-thoai-ca-nhan")
        .value.trim(),
      avatarZoom: Number(document.querySelector("#zoom-anh-dai-dien").value),
    };
    if (tep) noiDung.avatarDataUrl = await docAnhDaiDien(tep);
    if (xoaAvatarDaChon) noiDung.xoaAvatar = true;
    const response = await fetch("/api/thong-tin-ca-nhan", {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(noiDung),
    });
    const data = await response.json();
    if (response.status === 401) {
      window.location.replace("/html/dangnhap.html");
      return;
    }
    if (!response.ok) throw new Error(data.message || "Không thể lưu hồ sơ.");
    document.querySelector("#biet-danh").value = data.bietDanh;
    document.querySelector("#so-dien-thoai-ca-nhan").value =
      data.soDienThoai || "";
    capNhatXemTruocAvatar(data.avatarUrl, data.bietDanh, data.avatarZoom);
    window.dispatchEvent(
      new CustomEvent("khachHangDoiAvatar", {
        detail: { avatarUrl: data.avatarUrl, avatarZoom: data.avatarZoom },
      }),
    );
    xoaAvatarDaChon = false;
    tepAnhDaiDien.value = "";
    if (urlXemTruocTep) URL.revokeObjectURL(urlXemTruocTep);
    urlXemTruocTep = "";
    thongBao.textContent = data.message;
  } catch (error) {
    thongBao.textContent = error.message;
  } finally {
    nutLuu.disabled = false;
  }
});

document
  .querySelector("#form-doi-mat-khau")
  ?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const thongBao = document.querySelector("#thong-bao-doi-mat-khau");
    const nutDoi = document.querySelector("#nut-doi-mat-khau");
    const duLieu = new FormData(form);
    const matKhauMoi = duLieu.get("matKhauMoi");
    const xacNhan = duLieu.get("xacNhanMatKhauMoi");
    if (matKhauMoi !== xacNhan) {
      thongBao.textContent = "Mật khẩu mới và phần xác nhận không khớp.";
      return;
    }
    if (!window.confirm("Bạn có chắc muốn đổi mật khẩu không?")) return;
    nutDoi.disabled = true;
    thongBao.textContent = "Đang cập nhật mật khẩu...";
    try {
      const response = await fetch("/api/thong-tin-ca-nhan/mat-khau", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matKhauHienTai: duLieu.get("matKhauHienTai"),
          matKhauMoi,
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Không thể đổi mật khẩu.");
      form.reset();
      thongBao.textContent = data.message;
    } catch (error) {
      thongBao.textContent = error.message;
    } finally {
      nutDoi.disabled = false;
    }
  });

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

let cacDonHangLichSu = [];
let hienTatCaDonHang = false;
let cacYeuCauHoanTien = [];

function lopTrangThaiHoanTien(trangThai) {
  if (trangThai === "Đã duyệt" || trangThai === "Đã hoàn tiền")
    return "da-duyet";
  if (trangThai === "Từ chối") return "tu-choi";
  return "cho-duyet";
}

async function taiYeuCauHoanTien() {
  const phanHoi = await fetch("/api/hoan-tien/yeu-cau-cua-toi", {
    credentials: "same-origin",
    cache: "no-store",
  });
  const yeuCaus = await phanHoi.json();
  if (!phanHoi.ok)
    throw new Error(yeuCaus.message || "Không tải được yêu cầu hoàn tiền.");
  cacYeuCauHoanTien = yeuCaus;
  renderYeuCauHoanTien();
}

function renderYeuCauHoanTien() {
  const vung = document.querySelector("#noi-dung-yeu-cau-hoan-tien");
  const boLoc =
    document.querySelector("#loc-trang-thai-hoan-tien")?.value || "tat-ca";
  const yeuCaus =
    boLoc === "tat-ca"
      ? cacYeuCauHoanTien
      : cacYeuCauHoanTien.filter(
          (yc) => (yc.trangThai || "Chờ duyệt") === boLoc,
        );
  vung.replaceChildren();
  if (!yeuCaus.length) {
    vung.innerHTML = `
      <div class="trang-thai-rong">
        <span class="bieu-tuong-rong">✓</span>
        <strong>${cacYeuCauHoanTien.length ? "Không có yêu cầu phù hợp" : "Chưa có yêu cầu hoàn tiền"}</strong>
        <span>${cacYeuCauHoanTien.length ? "Thử chọn trạng thái khác để xem thêm." : "Các yêu cầu của bạn sẽ xuất hiện tại đây."}</span>
      </div>`;
    return;
  }
  vung.innerHTML = yeuCaus
    .map((yc) => {
      const trangThai = yc.trangThai || "Chờ duyệt";
      const ngay = yc.createdAt
        ? new Date(yc.createdAt).toLocaleDateString("vi-VN")
        : "—";
      return `<article class="the-yeu-cau-hoan-tien">
        <div class="dau-the-yeu-cau">
          <div><span class="nhan-the-phu">MÃ ĐƠN</span><strong>${escapeHtml(yc.maDon || "—")}</strong></div>
          <span class="nhan-trang-thai ${lopTrangThaiHoanTien(trangThai)}">${escapeHtml(trangThai)}</span>
        </div>
        <div class="chi-tiet-yeu-cau">
          <span>Ngày gửi <strong>${ngay}</strong></span>
          <span>Mức hoàn <strong>${yc.phanTramHoan ? `${yc.phanTramHoan}%` : "Đang xét"}</strong></span>
        </div>
      </article>`;
    })
    .join("");
}

async function taiLichSuDatPhong() {
  const vung = document.querySelector("#noi-dung-lich-su");
  const phanHoi = await fetch("/api/don-hang/lich-su-khach", {
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!phanHoi.ok) throw new Error("Không thể tải lịch sử đặt phòng.");
  const donHang = await phanHoi.json();
  cacDonHangLichSu = donHang;
  hienTatCaDonHang = false;
  renderLichSuDatPhong();
}

function renderLichSuDatPhong() {
  const vung = document.querySelector("#noi-dung-lich-su");
  const boLoc =
    document.querySelector("#loc-trang-thai-don")?.value || "tat-ca";
  const donLoc = cacDonHangLichSu.filter((don) => {
    if (boLoc === "tat-ca") return true;
    return don.trangThai === boLoc;
  });
  vung.replaceChildren();
  if (!donLoc.length) {
    vung.innerHTML = `<div class="trang-thai-rong"><span class="bieu-tuong-rong">⌁</span><strong>Không có đơn phù hợp</strong><span>Thử chọn trạng thái khác để xem thêm.</span></div>`;
    return;
  }
  const danhSachHienThi = hienTatCaDonHang ? donLoc : donLoc.slice(0, 5);
  const bang = document.createElement("table");
  bang.className = "bang-lich-su";
  const dau = document.createElement("thead");
  const nhanCot = [
    "Mã đơn",
    "Quán",
    "Ngày đặt",
    "Giờ đến dự kiến",
    "Trạng thái",
  ];
  dau.innerHTML =
    "<tr><th>Mã đơn</th><th>Quán</th><th>Ngày đặt</th><th>Giờ đến dự kiến</th><th>Trạng thái</th></tr>";
  const than = document.createElement("tbody");
  danhSachHienThi.forEach((don) => {
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
    ].forEach((giaTri, viTri) => {
      const o = document.createElement("td");
      o.dataset.label = nhanCot[viTri];
      o.textContent = giaTri || "—";
      hang.append(o);
    });
    than.append(hang);
  });
  bang.append(dau, than);
  vung.append(bang);
  if (donLoc.length > 5) {
    const nutXem = document.createElement("button");
    nutXem.className = "nut-xem-them";
    nutXem.type = "button";
    nutXem.textContent = hienTatCaDonHang
      ? "Thu gọn danh sách"
      : `Xem tất cả ${donLoc.length} đơn`;
    nutXem.addEventListener("click", () => {
      hienTatCaDonHang = !hienTatCaDonHang;
      renderLichSuDatPhong();
    });
    vung.append(nutXem);
  }
}

document
  .querySelector("#loc-trang-thai-don")
  ?.addEventListener("change", () => {
    hienTatCaDonHang = false;
    renderLichSuDatPhong();
  });

document
  .querySelector("#loc-trang-thai-hoan-tien")
  ?.addEventListener("change", renderYeuCauHoanTien);

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
