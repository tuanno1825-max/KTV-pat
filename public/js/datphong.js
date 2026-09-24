let danhSachQuan = [];

const boLoc = document.querySelector("#bo-loc-quan");
const oTuKhoa = document.querySelector("#tu-khoa");
const oKhuVuc = document.querySelector("#khu-vuc");
const noiDanhSach = document.querySelector("#danh-sach-quan");
const soLuong = document.querySelector("#so-luong-quan");
const khongCoKetQua = document.querySelector("#khong-co-ket-qua");
const nutXoaLoc = document.querySelector("#xoa-loc");
const lopPhu = document.querySelector("#lop-phu-dat-phong");
const bieuMauDatPhong = document.querySelector("#bieu-mau-dat-phong");
const tenQuanChon = document.querySelector("#ten-quan-chon");
const giaQuanChon = document.querySelector("#gia-quan-chon");
const thongBaoDatPhong = document.querySelector("#thong-bao-dat-phong");
const khuVucPhanHoiDeXuat = document.querySelector("#phan-hoi-de-xuat");
let maDonDangTheoDoi = "";
let soDienThoaiTheoDoi = "";
let boDemTheoDoi = null;
let trangThaiDaHien = "";
let choHuyKhiRoiTrang = false;

function moTaPhanHoiKhach(don) {
  if (don.daHuy) return "Bạn đã hủy đặt phòng.";
  if (don.trangThai === "Đặt phòng thành công") {
    return `Chúc mừng! Bạn đã đặt phòng thành công tại ${don.tenQuan}. Vui lòng đợi ít phút để cộng tác viên liên hệ xác nhận.`;
  }
  if (don.trangThai === "Đề xuất quán mới") {
    return `Quán hiện tại chưa thể xác nhận. Nhân viên đề xuất ${don.tenQuanDeXuat}. Bạn muốn chấp nhận quán này không?`;
  }
  if (don.trangThai === "Đặt phòng thất bại") {
    return "Rất tiếc, quán chưa thể xác nhận đặt phòng. Nhân viên đang tìm quán phù hợp để đề xuất cho bạn.";
  }
  if (don.trangThai === "Đã xác nhận") return "Yêu cầu đã được xác nhận. Vui lòng đợi ít phút để cộng tác viên liên hệ.";
  if (don.trangThai === "Khách đã chấp nhận đề xuất") return `Bạn đã chấp nhận quán đề xuất. Mã đơn mới: ${don.maDonTiepTheo}.`;
  if (don.trangThai === "Khách từ chối đề xuất") return "Bạn đã bỏ qua quán được đề xuất. Nhân viên sẽ tìm phương án khác nếu có.";
  if (don.trangThai === "Khách đã hủy đặt phòng") return "Bạn đã hủy đặt phòng.";
  return `Yêu cầu ${don.maDon} đang chờ nhân viên xử lý. Trang sẽ tự cập nhật khi có phản hồi.`;
}

async function capNhatPhanHoiKhach() {
  if (!maDonDangTheoDoi) return;
  try {
    const qs = new URLSearchParams({ maDon: maDonDangTheoDoi, soDienThoai: soDienThoaiTheoDoi });
    const response = await fetch(`/api/don-hang/tra-cuu?${qs}`);
    if (!response.ok) return;
    const don = await response.json();
    thongBaoDatPhong.textContent = moTaPhanHoiKhach(don);
    if (don.trangThai !== trangThaiDaHien) {
      trangThaiDaHien = don.trangThai;
      khuVucPhanHoiDeXuat.replaceChildren();
      if (don.trangThai === "Đề xuất quán mới") {
        choHuyKhiRoiTrang = true;
        const taoNutPhanHoi = (nhan, duLieu) => {
          const nut = document.createElement("button");
          nut.type = "button";
          nut.className = "nut-phan-hoi-de-xuat";
          nut.textContent = nhan;
          nut.addEventListener("click", async () => {
            nut.disabled = true;
            try {
              choHuyKhiRoiTrang = false;
              const phanHoi = await fetch("/api/don-hang/phan-hoi", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ maDon: maDonDangTheoDoi, soDienThoai: soDienThoaiTheoDoi, ...duLieu }),
              });
              const ketQua = await phanHoi.json();
              if (!phanHoi.ok) throw new Error(ketQua.message || "Không thể gửi phản hồi.");
              if (duLieu.chapNhan && ketQua.maDonMoi) maDonDangTheoDoi = ketQua.maDonMoi;
              thongBaoDatPhong.textContent = duLieu.chapNhan
                ? `${ketQua.message} Mã đơn mới: ${ketQua.maDonMoi}.`
                : ketQua.message;
              khuVucPhanHoiDeXuat.replaceChildren();
              trangThaiDaHien = "";
              if (duLieu.chapNhan) await capNhatPhanHoiKhach();
            } catch (error) {
              choHuyKhiRoiTrang = true;
              thongBaoDatPhong.textContent = error.message;
              nut.disabled = false;
            }
          });
          khuVucPhanHoiDeXuat.append(nut);
        };
        taoNutPhanHoi("Bỏ chọn quán đề xuất", { chapNhan: false });
        taoNutPhanHoi("Chấp nhận quán", { chapNhan: true });
        taoNutPhanHoi("Hủy đặt phòng", { chapNhan: false, hanhDong: "huy" });
      }
    }
    if (["Đặt phòng thành công", "Khách đã chấp nhận đề xuất"].includes(don.trangThai) && boDemTheoDoi) {
      clearInterval(boDemTheoDoi);
      boDemTheoDoi = null;
    }
  } catch {}
}

window.addEventListener("pagehide", () => {
  if (!choHuyKhiRoiTrang || !maDonDangTheoDoi || !soDienThoaiTheoDoi) return;
  const payload = new Blob([JSON.stringify({
    maDon: maDonDangTheoDoi,
    soDienThoai: soDienThoaiTheoDoi,
    hanhDong: "huy",
  })], { type: "application/json" });
  navigator.sendBeacon("/api/don-hang/phan-hoi", payload);
});

function taoTheQuan(quan) {
  const the = document.createElement("article");
  the.className = "the-quan";
  const dinhDangTien = (gia) => `${Number(gia || 0).toLocaleString("vi-VN")} ₫`;
  const noiDungAnh = quan.anhQuan
    ? `<img src="../image/${quan.anhQuan}" alt="Ảnh ${quan.ten}" />`
    : "<span>Chưa có ảnh quán</span>";
  the.innerHTML = `
    <div class="khung-anh-quan" aria-label="Ảnh của ${quan.ten}">
      ${noiDungAnh}
    </div>
    <div class="dau-the-quan">
      <span class="nhan-trang-thai">${quan.trangThai || "Đang hoạt động"}</span>
    </div>
    <h3>${quan.ten}</h3>
    <p class="dia-chi">${quan.diaChi}</p>
    <div class="chi-tiet-quan">
      <div><span>Giá phòng / giờ</span><strong>${dinhDangTien(quan.giaMin)} - ${dinhDangTien(quan.giaMax)}</strong></div>
      <div><span>Giảm giá trực tiếp</span><strong>${quan.chietKhau ?? 0}%</strong></div>
    </div>
    <button class="nut-dat-phong" type="button" data-ten-quan="${quan.ten}">Chọn quán này <span aria-hidden="true">→</span></button>
  `;
  return the;
}

function hienThiDanhSach() {
  const tuKhoa = oTuKhoa.value.trim().toLocaleLowerCase("vi");
  const khuVuc = oKhuVuc.value;
  const ketQua = danhSachQuan.filter((quan) => {
    const noiDung =
      `${quan.ten} ${quan.khuVuc} ${quan.diaChi}`.toLocaleLowerCase("vi");
    const dungTuKhoa = !tuKhoa || noiDung.includes(tuKhoa);
    const dungKhuVuc = khuVuc === "tat-ca" || quan.khuVuc === khuVuc;
    return dungTuKhoa && dungKhuVuc;
  });

  noiDanhSach.replaceChildren(...ketQua.map(taoTheQuan));
  soLuong.textContent = `${ketQua.length} quán phù hợp`;
  khongCoKetQua.hidden = ketQua.length > 0;
}

async function taiDanhSachQuan() {
  try {
    const phanHoi = await fetch("/api/quan-cong-khai");
    if (!phanHoi.ok) throw new Error("Không thể tải danh sách quán.");
    danhSachQuan = await phanHoi.json();
    capNhatDanhSachKhuVuc();
    hienThiDanhSach();
  } catch (error) {
    noiDanhSach.replaceChildren();
    soLuong.textContent = "";
    khongCoKetQua.hidden = false;
    khongCoKetQua.querySelector("h3").textContent =
      "Chưa thể tải danh sách quán";
    khongCoKetQua.querySelector("p").textContent =
      "Vui lòng kiểm tra kết nối máy chủ rồi thử lại.";
  }
}

function capNhatDanhSachKhuVuc() {
  const khuVucDangChon = oKhuVuc.value;
  const cacKhuVuc = [...new Set(danhSachQuan.map((quan) => quan.khuVuc))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "vi"));
  oKhuVuc.replaceChildren(new Option("Tất cả quận", "tat-ca"));
  cacKhuVuc.forEach((khuVuc) => {
    oKhuVuc.append(new Option(khuVuc, khuVuc));
  });
  oKhuVuc.value = cacKhuVuc.includes(khuVucDangChon)
    ? khuVucDangChon
    : "tat-ca";
}

function moBieuMau(tenQuan) {
  tenQuanChon.textContent = tenQuan;
  const quan = danhSachQuan.find((item) => item.ten === tenQuan);
  const dinhDangTien = (gia) => `${Number(gia || 0).toLocaleString("vi-VN")} ₫`;
  giaQuanChon.textContent = quan
    ? `Giá phòng: ${dinhDangTien(quan.giaMin)} - ${dinhDangTien(quan.giaMax)} / giờ`
    : "";
  bieuMauDatPhong.dataset.maQuan = quan?.maQuan || "";
  thongBaoDatPhong.textContent = "";
  bieuMauDatPhong.reset();
  lopPhu.hidden = false;
  document.body.classList.add("khoa-cuon");
  document.querySelector("#so-dien-thoai-nguoi-dat").focus();
}

function dongBieuMau() {
  lopPhu.hidden = true;
  document.body.classList.remove("khoa-cuon");
}

boLoc.addEventListener("submit", (suKien) => {
  suKien.preventDefault();
  hienThiDanhSach();
});
oTuKhoa.addEventListener("input", hienThiDanhSach);
oKhuVuc.addEventListener("change", hienThiDanhSach);
noiDanhSach.addEventListener("click", (suKien) => {
  const nutDatPhong = suKien.target.closest("[data-ten-quan]");
  if (nutDatPhong) moBieuMau(nutDatPhong.dataset.tenQuan);
});
document.querySelector("#dong-bieu-mau").addEventListener("click", dongBieuMau);
lopPhu.addEventListener("click", (suKien) => {
  if (suKien.target === lopPhu) dongBieuMau();
});
document.addEventListener("keydown", (suKien) => {
  if (suKien.key === "Escape" && !lopPhu.hidden) dongBieuMau();
});
bieuMauDatPhong.addEventListener("submit", async (suKien) => {
  suKien.preventDefault();
  const nutGui = bieuMauDatPhong.querySelector('[type="submit"]');
  nutGui.disabled = true;
  thongBaoDatPhong.textContent = "Đang gửi yêu cầu...";
  if (boDemTheoDoi) clearInterval(boDemTheoDoi);
  maDonDangTheoDoi = "";
  try {
    const phanHoi = await fetch("/api/don-hang", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        maQuan: bieuMauDatPhong.dataset.maQuan,
        tenKhach: bieuMauDatPhong.elements.tenKhach.value.trim(),
        xungHo: bieuMauDatPhong.elements.xungHo.value,
        soDienThoai: bieuMauDatPhong.elements.soDienThoai.value.trim(),
        thoiGianCheckIn: bieuMauDatPhong.elements.thoiGianCheckIn.value,
        soNguoi: bieuMauDatPhong.elements.soNguoi.value,
      }),
    });
    const ketQua = await phanHoi.json();
    if (!phanHoi.ok) throw new Error(ketQua.message || "Không thể gửi yêu cầu.");
    maDonDangTheoDoi = ketQua.maDon;
    soDienThoaiTheoDoi = bieuMauDatPhong.elements.soDienThoai.value.trim();
    thongBaoDatPhong.textContent = `${ketQua.message} Mã đơn: ${ketQua.maDon}. Đang chờ nhân viên phản hồi...`;
    bieuMauDatPhong.reset();
    boDemTheoDoi = setInterval(capNhatPhanHoiKhach, 5000);
  } catch (error) {
    thongBaoDatPhong.textContent = error.message || "Không thể gửi yêu cầu, vui lòng thử lại.";
  } finally {
    nutGui.disabled = false;
  }
});
nutXoaLoc.addEventListener("click", () => {
  oTuKhoa.value = "";
  oKhuVuc.value = "tat-ca";
  hienThiDanhSach();
  oTuKhoa.focus();
});

taiDanhSachQuan();
