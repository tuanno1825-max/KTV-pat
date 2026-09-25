const danhSachEl = document.querySelector("#danh-sach-doanh-thu");
const tuKhoaEl = document.querySelector("#tu-khoa-doanh-thu");
const locThuTienEl = document.querySelector("#loc-thu-tien");
const thongBaoEl = document.querySelector("#thong-bao-doanh-thu");
const hopThoai = document.querySelector("#hop-thoai-thu-tien");
const formThuTien = document.querySelector("#form-thu-tien");
const nutXacNhan = document.querySelector("#xac-nhan-thu-tien");
let donDangThu = null;
let danhSachDuLieu = [];

const dinhDangTien = (soTien) => `${Number(soTien || 0).toLocaleString("vi-VN")} ₫`;
const dinhDangNgay = (ngay) => ngay ? new Date(ngay).toLocaleString("vi-VN") : "—";

function taoNutLienKet(nhan, url) {
  const link = document.createElement("a");
  link.className = "link-hoa-don-doanh-thu";
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = nhan;
  return link;
}

function ngayTheoMay(date) {
  const ngay = new Date(date);
  if (Number.isNaN(ngay.getTime())) return "";
  return `${ngay.getFullYear()}-${String(ngay.getMonth() + 1).padStart(2, "0")}-${String(ngay.getDate()).padStart(2, "0")}`;
}

function apDungThongKe() {
  const tuNgay = document.querySelector("#thong-ke-tu-ngay").value;
  const denNgay = document.querySelector("#thong-ke-den-ngay").value;
  const donDenTrongKy = danhSachDuLieu.filter((don) => {
    const ngayDen = ngayTheoMay(don.thoiGianKhachDen || don.thoiGianDat);
    return ngayDen && (!tuNgay || ngayDen >= tuNgay) && (!denNgay || ngayDen <= denNgay);
  });
  const donDaThuTrongKy = danhSachDuLieu.filter((don) => {
    if (!don.doanhThuDaThu) return false;
    const ngayThu = ngayTheoMay(don.thoiGianThuTien || don.thoiGianKhachDen || don.thoiGianDat);
    return ngayThu && (!tuNgay || ngayThu >= tuNgay) && (!denNgay || ngayThu <= denNgay);
  });
  document.querySelector("#tong-don").textContent = String(donDenTrongKy.length);
  document.querySelector("#don-da-thu").textContent = String(donDaThuTrongKy.length);
  document.querySelector("#don-chua-thu").textContent = String(donDenTrongKy.filter((don) => !don.doanhThuDaThu).length);
  const tongTien = donDaThuTrongKy.reduce((tong, don) => tong + Number(don.soTienDaThu || 0), 0);
  document.querySelector("#tong-tien-da-thu").textContent = dinhDangTien(tongTien);
}

function apDungLocDanhSach() {
  const trangThai = locThuTienEl.value;
  const donHienThi = danhSachDuLieu.filter((don) => trangThai === "tat-ca"
    || (trangThai === "da-thu" && don.doanhThuDaThu)
    || (trangThai === "chua-thu" && !don.doanhThuDaThu));
  veDanhSach(donHienThi);
  thongBaoEl.textContent = `${donHienThi.length} đơn khách đã đến`;
}

function veDanhSach(donHangs) {
  danhSachEl.replaceChildren();
  if (!donHangs.length) {
    const dong = document.createElement("tr");
    const oTrong = document.createElement("td");
    oTrong.colSpan = 10;
    oTrong.textContent = "Chưa có đơn khách đến phù hợp.";
    dong.append(oTrong);
    danhSachEl.append(dong);
    return;
  }

  for (const don of donHangs) {
    const dong = document.createElement("tr");
    const maDon = document.createElement("td");
    maDon.className = "ma-don-doanh-thu";
    maDon.textContent = don.maDon;
    const khach = document.createElement("td");
    khach.textContent = `${don.tenKhach || "—"}${don.soDienThoai ? ` · ${don.soDienThoai}` : ""}`;
    const quan = document.createElement("td");
    quan.textContent = don.tenQuan || "—";
    const thoiGianDat = document.createElement("td");
    thoiGianDat.textContent = dinhDangNgay(don.thoiGianDat);
    const chietKhau = document.createElement("td");
    chietKhau.textContent = `${Number(don.chietKhau || 0)}%`;
    const giamGiaKhach = document.createElement("td");
    giamGiaKhach.textContent = `${Number(don.giamGiaKhach || 0)}%`;
    const thucNhan = document.createElement("td");
    thucNhan.textContent = `${Number(don.thucNhanPhanTram ?? 100)}%`;
    const tien = document.createElement("td");
    tien.textContent = don.doanhThuDaThu ? dinhDangTien(don.soTienDaThu) : "—";
    const trangThai = document.createElement("td");
    const nhan = document.createElement("span");
    nhan.className = `nhan-thu-tien${don.doanhThuDaThu ? " da-thu" : ""}`;
    nhan.textContent = don.doanhThuDaThu ? `Đã thu · ${dinhDangNgay(don.thoiGianThuTien)}` : "Chưa thu tiền";
    trangThai.append(nhan);
    const thaoTac = document.createElement("td");
    if (don.doanhThuDaThu) {
      thaoTac.append(
        taoNutLienKet("Hóa đơn quán", `/api/doanh-thu/${encodeURIComponent(don._id)}/hoa-don/quan`),
        taoNutLienKet("Chứng từ chuyển tiền", `/api/doanh-thu/${encodeURIComponent(don._id)}/hoa-don/chuyen-tien`),
      );
    } else {
      const nutThu = document.createElement("button");
      nutThu.type = "button";
      nutThu.className = "nut-thu-tien";
      nutThu.textContent = "Đã thu tiền";
      nutThu.addEventListener("click", () => moHopThoai(don));
      thaoTac.append(nutThu);
    }
    dong.append(maDon, khach, quan, thoiGianDat, chietKhau, giamGiaKhach, thucNhan, tien, trangThai, thaoTac);
    danhSachEl.append(dong);
  }
}

async function taiDoanhThu() {
  thongBaoEl.textContent = "Đang tải dữ liệu doanh thu...";
  danhSachEl.replaceChildren();
  const thamSo = new URLSearchParams({ tuKhoa: tuKhoaEl.value.trim() });
  try {
    const response = await fetch(`/api/doanh-thu?${thamSo}`, { credentials: "same-origin", cache: "no-store" });
    const data = await response.json();
    if (response.status === 401) {
      window.location.href = "/html/dangnhap-private.html";
      return;
    }
    if (!response.ok) throw new Error(data.message || "Không tải được dữ liệu doanh thu.");
    danhSachDuLieu = data;
    apDungThongKe();
    apDungLocDanhSach();
  } catch (error) {
    thongBaoEl.textContent = error.message;
    danhSachDuLieu = [];
    apDungThongKe();
    danhSachEl.innerHTML = '<tr><td colspan="10">Không thể tải dữ liệu doanh thu.</td></tr>';
  }
}

function moHopThoai(don) {
  donDangThu = don;
  formThuTien.reset();
  document.querySelector("#loi-thu-tien").textContent = "";
  document.querySelector("#don-dang-xac-nhan").textContent = `Đơn ${don.maDon} · ${don.tenKhach} · ${don.tenQuan}`;
  hopThoai.showModal();
}

function docTep(tep) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(`Không đọc được tệp ${tep.name}.`));
    reader.readAsDataURL(tep);
  });
}

formThuTien.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!donDangThu) return;
  const loi = document.querySelector("#loi-thu-tien");
  const tepQuan = document.querySelector("#anh-hoa-don-quan").files[0];
  const tepChuyenTien = document.querySelector("#anh-hoa-don-chuyen-tien").files[0];
  const soTienDaThu = Number(document.querySelector("#so-tien-da-thu").value);
  if (!tepQuan || !tepChuyenTien) {
    loi.textContent = "Vui lòng chọn đủ ảnh hóa đơn quán và chứng từ chuyển tiền.";
    return;
  }
  for (const tep of [tepQuan, tepChuyenTien]) {
    if (!/^image\/(jpeg|png|webp)$/.test(tep.type) || tep.size > 2 * 1024 * 1024) {
      loi.textContent = "Mỗi ảnh phải là JPG, PNG hoặc WEBP và không vượt quá 2 MB.";
      return;
    }
  }
  if (!Number.isSafeInteger(soTienDaThu) || soTienDaThu <= 0) {
    loi.textContent = "Nhập số tiền đã thu hợp lệ.";
    return;
  }

  nutXacNhan.disabled = true;
  loi.textContent = "Đang tải chứng từ và lưu xác nhận...";
  try {
    const [hoaDonQuan, hoaDonChuyenTien] = await Promise.all([docTep(tepQuan), docTep(tepChuyenTien)]);
    const response = await fetch(`/api/doanh-thu/${encodeURIComponent(donDangThu._id)}/thu-tien`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hoaDonQuan, hoaDonChuyenTien, soTienDaThu }),
    });
    const data = await response.json();
    if (response.status === 401) {
      window.location.href = "/html/dangnhap-private.html";
      return;
    }
    if (!response.ok) throw new Error(data.message || "Không lưu được xác nhận thu tiền.");
    hopThoai.close();
    thongBaoEl.textContent = data.message;
    await taiDoanhThu();
  } catch (error) {
    loi.textContent = error.message;
  } finally {
    nutXacNhan.disabled = false;
  }
});

document.querySelector("#dong-hop-thoai").addEventListener("click", () => hopThoai.close());
document.querySelector("#huy-thu-tien").addEventListener("click", () => hopThoai.close());
document.querySelector("#tim-doanh-thu").addEventListener("click", taiDoanhThu);
document.querySelector("#ap-dung-loc-ngay").addEventListener("click", () => {
  const tuNgay = document.querySelector("#thong-ke-tu-ngay").value;
  const denNgay = document.querySelector("#thong-ke-den-ngay").value;
  if (tuNgay && denNgay && tuNgay > denNgay) {
    thongBaoEl.textContent = "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.";
    return;
  }
  apDungThongKe();
});
document.querySelector("#xoa-loc-ngay").addEventListener("click", () => {
  document.querySelector("#thong-ke-tu-ngay").value = "";
  document.querySelector("#thong-ke-den-ngay").value = "";
  apDungThongKe();
});
document.querySelector("#lam-moi-doanh-thu").addEventListener("click", () => {
  tuKhoaEl.value = "";
  locThuTienEl.value = "tat-ca";
  taiDoanhThu();
});
tuKhoaEl.addEventListener("keydown", (event) => { if (event.key === "Enter") taiDoanhThu(); });
locThuTienEl.addEventListener("change", apDungLocDanhSach);
taiDoanhThu();
