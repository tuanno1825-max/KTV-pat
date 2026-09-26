const danhSachEl = document.querySelector("#danh-sach-doanh-thu");
const tuKhoaEl = document.querySelector("#tu-khoa-doanh-thu");
const locThuTienEl = document.querySelector("#loc-thu-tien");
const thongBaoEl = document.querySelector("#thong-bao-doanh-thu");
const bieuDoDoanhThuEl = document.querySelector("#bieu-do-doanh-thu");
const moTaBieuDoDoanhThuEl = document.querySelector("#mo-ta-bieu-do-doanh-thu");
const hopThoai = document.querySelector("#hop-thoai-thu-tien");
const formThuTien = document.querySelector("#form-thu-tien");
const nutXacNhan = document.querySelector("#xac-nhan-thu-tien");
let donDangThu = null;
let danhSachDuLieu = [];

const dinhDangTien = (soTien) =>
  `${Number(soTien || 0).toLocaleString("vi-VN")} ₫`;
const dinhDangNgay = (ngay) =>
  ngay ? new Date(ngay).toLocaleString("vi-VN") : "—";

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

function donTrongKhoangNgay(don, tuNgay, denNgay) {
  const ngayDat = ngayTheoMay(don.thoiGianDat);
  return (
    ngayDat &&
    (!tuNgay || ngayDat >= tuNgay) &&
    (!denNgay || ngayDat <= denNgay)
  );
}

function taoDanhSachNgay(tuNgay, denNgay) {
  if (!tuNgay || !denNgay) return [];
  const [namDau, thangDau, ngayDau] = tuNgay.split("-").map(Number);
  const [namCuoi, thangCuoi, ngayCuoi] = denNgay.split("-").map(Number);
  const mocCuoi = Date.UTC(namCuoi, thangCuoi - 1, ngayCuoi);
  const cacNgay = [];
  for (
    let mocUtc = Date.UTC(namDau, thangDau - 1, ngayDau);
    mocUtc <= mocCuoi;
    mocUtc += 24 * 60 * 60 * 1000
  ) {
    const ngay = new Date(mocUtc);
    cacNgay.push(
      `${ngay.getUTCFullYear()}-${String(ngay.getUTCMonth() + 1).padStart(2, "0")}-${String(ngay.getUTCDate()).padStart(2, "0")}`,
    );
  }
  return cacNgay;
}

function veBieuDoDoanhThu() {
  const tuNgay = document.querySelector("#thong-ke-tu-ngay").value;
  const denNgay = document.querySelector("#thong-ke-den-ngay").value;
  const homNay = ngayTheoMay(new Date());
  const duLieuTheoNgay = new Map();

  danhSachDuLieu.forEach((don) => {
    if (!don.doanhThuDaThu) return;
    const ngayDat = ngayTheoMay(don.thoiGianDat);
    if (
      !ngayDat ||
      (tuNgay && ngayDat < tuNgay) ||
      (denNgay && ngayDat > denNgay)
    )
      return;
    const muc = duLieuTheoNgay.get(ngayDat) || { soTien: 0, soDon: 0 };
    muc.soTien += Number(don.soTienDaThu || 0);
    muc.soDon += 1;
    duLieuTheoNgay.set(ngayDat, muc);
  });

  let ngayBatDau = tuNgay;
  let ngayKetThuc = denNgay || homNay;
  if (!tuNgay && denNgay)
    ngayBatDau = [...duLieuTheoNgay.keys()].sort()[0] || "";
  if (!tuNgay && !denNgay) {
    ngayKetThuc = homNay;
    ngayBatDau = new Date(
      Date.parse(`${homNay}T00:00:00Z`) - 6 * 24 * 60 * 60 * 1000,
    )
      .toISOString()
      .slice(0, 10);
  }
  const cacNgay = ngayBatDau ? taoDanhSachNgay(ngayBatDau, ngayKetThuc) : [];
  if (!cacNgay.length) {
    const thongBao = document.createElement("p");
    thongBao.className = "thong-bao-bieu-do-doanh-thu";
    thongBao.textContent = "Chưa có khoản thu phù hợp để hiển thị.";
    bieuDoDoanhThuEl.replaceChildren(thongBao);
    moTaBieuDoDoanhThuEl.textContent =
      "Chưa có dữ liệu trong khoảng ngày đã chọn.";
    return;
  }

  moTaBieuDoDoanhThuEl.textContent =
    !tuNgay && !denNgay
      ? "Tiền đã thu của các đơn đặt trong 7 ngày gần nhất."
      : "Tiền đã thu của các đơn đặt trong khoảng ngày đã lọc.";
  const cacCot = cacNgay.map((ngay) => ({
    ngay,
    ...(duLieuTheoNgay.get(ngay) || { soTien: 0, soDon: 0 }),
  }));
  const tienLonNhat = Math.max(1, ...cacCot.map((cot) => cot.soTien));
  const hangCot = document.createElement("div");
  hangCot.className = "hang-cot-doanh-thu";
  hangCot.style.gridTemplateColumns = `repeat(${cacCot.length}, minmax(52px, 1fr))`;
  hangCot.style.minWidth =
    cacCot.length > 7 ? `${cacCot.length * 66}px` : "100%";

  cacCot.forEach((cot) => {
    const cotEl = document.createElement("div");
    cotEl.className = "cot-ngay-doanh-thu";
    const giaTri = document.createElement("span");
    giaTri.className = "gia-tri-ngay-doanh-thu";
    giaTri.textContent = new Intl.NumberFormat("vi-VN", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(cot.soTien);
    const cotBar = document.createElement("div");
    cotBar.className = "than-cot-doanh-thu";
    const thanh = document.createElement("span");
    thanh.className = "thanh-ngay-doanh-thu";
    thanh.style.height = `${(cot.soTien / tienLonNhat) * 145}px`;
    if (cot.soTien > 0) thanh.style.minHeight = "3px";
    cotBar.append(thanh);
    const nhanNgay = document.createElement("span");
    nhanNgay.className = "nhan-ngay-doanh-thu";
    nhanNgay.textContent = new Date(`${cot.ngay}T00:00:00`).toLocaleDateString(
      "vi-VN",
      { day: "2-digit", month: "2-digit" },
    );
    cotEl.title = `${new Date(`${cot.ngay}T00:00:00`).toLocaleDateString("vi-VN")}: ${dinhDangTien(cot.soTien)} · ${cot.soDon} đơn đã thu`;
    cotEl.setAttribute("aria-label", cotEl.title);
    cotEl.append(giaTri, cotBar, nhanNgay);
    hangCot.append(cotEl);
  });

  bieuDoDoanhThuEl.replaceChildren(hangCot);
}

function apDungThongKe() {
  const tuNgay = document.querySelector("#thong-ke-tu-ngay").value;
  const denNgay = document.querySelector("#thong-ke-den-ngay").value;
  const donDenTrongKy = danhSachDuLieu.filter((don) =>
    donTrongKhoangNgay(don, tuNgay, denNgay),
  );
  const donDaThuTrongKy = danhSachDuLieu.filter((don) => {
    if (!don.doanhThuDaThu) return false;
    const ngayDat = ngayTheoMay(don.thoiGianDat);
    return (
      ngayDat &&
      (!tuNgay || ngayDat >= tuNgay) &&
      (!denNgay || ngayDat <= denNgay)
    );
  });
  document.querySelector("#tong-don").textContent = String(
    donDenTrongKy.length,
  );
  document.querySelector("#don-da-thu").textContent = String(
    donDaThuTrongKy.length,
  );
  document.querySelector("#don-chua-thu").textContent = String(
    donDenTrongKy.filter((don) => !don.doanhThuDaThu).length,
  );
  const tongTien = donDaThuTrongKy.reduce(
    (tong, don) => tong + Number(don.soTienDaThu || 0),
    0,
  );
  document.querySelector("#tong-tien-da-thu").textContent =
    dinhDangTien(tongTien);
  veBieuDoDoanhThu();
}

function apDungLocDanhSach() {
  const trangThai = locThuTienEl.value;
  const tuNgay = document.querySelector("#thong-ke-tu-ngay").value;
  const denNgay = document.querySelector("#thong-ke-den-ngay").value;
  const donHienThi = danhSachDuLieu.filter(
    (don) =>
      donTrongKhoangNgay(don, tuNgay, denNgay) &&
      (trangThai === "tat-ca" ||
        (trangThai === "da-thu" && don.doanhThuDaThu) ||
        (trangThai === "chua-thu" && !don.doanhThuDaThu)),
  );
  veDanhSach(donHienThi);
  thongBaoEl.textContent = `${donHienThi.length} đơn khách đã đến phù hợp bộ lọc`;
}

function veDanhSach(donHangs) {
  danhSachEl.replaceChildren();
  if (!donHangs.length) {
    const dong = document.createElement("tr");
    const oTrong = document.createElement("td");
    oTrong.colSpan = 11;
    oTrong.textContent = "Chưa có đơn khách đến phù hợp.";
    dong.append(oTrong);
    danhSachEl.append(dong);
    return;
  }

  for (const [index, don] of donHangs.entries()) {
    const dong = document.createElement("tr");
    const stt = document.createElement("td");
    stt.textContent = String(index + 1);
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
    nhan.textContent = don.doanhThuDaThu
      ? `Đã thu · ${dinhDangNgay(don.thoiGianThuTien)}`
      : "Chưa thu tiền";
    trangThai.append(nhan);
    const thaoTac = document.createElement("td");
    if (don.doanhThuDaThu) {
      thaoTac.append(
        taoNutLienKet(
          "Hóa đơn quán",
          `/api/doanh-thu/${encodeURIComponent(don._id)}/hoa-don/quan`,
        ),
        taoNutLienKet(
          "Chứng từ chuyển tiền",
          `/api/doanh-thu/${encodeURIComponent(don._id)}/hoa-don/chuyen-tien`,
        ),
      );
    } else {
      const nutThu = document.createElement("button");
      nutThu.type = "button";
      nutThu.className = "nut-thu-tien";
      nutThu.textContent = "Đã thu tiền";
      nutThu.addEventListener("click", () => moHopThoai(don));
      thaoTac.append(nutThu);
    }
    dong.append(
      stt,
      maDon,
      khach,
      quan,
      thoiGianDat,
      chietKhau,
      giamGiaKhach,
      thucNhan,
      tien,
      trangThai,
      thaoTac,
    );
    danhSachEl.append(dong);
  }
}

async function taiDoanhThu() {
  thongBaoEl.textContent = "Đang tải dữ liệu doanh thu...";
  danhSachEl.replaceChildren();
  const thamSo = new URLSearchParams({ tuKhoa: tuKhoaEl.value.trim() });
  try {
    const response = await fetch(`/api/doanh-thu?${thamSo}`, {
      credentials: "same-origin",
      cache: "no-store",
    });
    const data = await response.json();
    if (response.status === 401) {
      window.location.href = "/html/dangnhap-private.html";
      return;
    }
    if (!response.ok)
      throw new Error(data.message || "Không tải được dữ liệu doanh thu.");
    danhSachDuLieu = data;
    apDungThongKe();
    apDungLocDanhSach();
  } catch (error) {
    thongBaoEl.textContent = error.message;
    danhSachDuLieu = [];
    apDungThongKe();
    danhSachEl.innerHTML =
      '<tr><td colspan="11">Không thể tải dữ liệu doanh thu.</td></tr>';
  }
}

function moHopThoai(don) {
  donDangThu = don;
  formThuTien.reset();
  document.querySelector("#loi-thu-tien").textContent = "";
  document.querySelector("#don-dang-xac-nhan").textContent =
    `Đơn ${don.maDon} · ${don.tenKhach} · ${don.tenQuan}`;
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
  const tepChuyenTien = document.querySelector("#anh-hoa-don-chuyen-tien")
    .files[0];
  const soTienDaThu = Number(document.querySelector("#so-tien-da-thu").value);
  if (!tepQuan || !tepChuyenTien) {
    loi.textContent =
      "Vui lòng chọn đủ ảnh hóa đơn quán và chứng từ chuyển tiền.";
    return;
  }
  for (const tep of [tepQuan, tepChuyenTien]) {
    if (
      !/^image\/(jpeg|png|webp)$/.test(tep.type) ||
      tep.size > 2 * 1024 * 1024
    ) {
      loi.textContent =
        "Mỗi ảnh phải là JPG, PNG hoặc WEBP và không vượt quá 2 MB.";
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
    const [hoaDonQuan, hoaDonChuyenTien] = await Promise.all([
      docTep(tepQuan),
      docTep(tepChuyenTien),
    ]);
    const response = await fetch(
      `/api/doanh-thu/${encodeURIComponent(donDangThu._id)}/thu-tien`,
      {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hoaDonQuan, hoaDonChuyenTien, soTienDaThu }),
      },
    );
    const data = await response.json();
    if (response.status === 401) {
      window.location.href = "/html/dangnhap-private.html";
      return;
    }
    if (!response.ok)
      throw new Error(data.message || "Không lưu được xác nhận thu tiền.");
    hopThoai.close();
    thongBaoEl.textContent = data.message;
    await taiDoanhThu();
  } catch (error) {
    loi.textContent = error.message;
  } finally {
    nutXacNhan.disabled = false;
  }
});

document
  .querySelector("#dong-hop-thoai")
  .addEventListener("click", () => hopThoai.close());
document
  .querySelector("#huy-thu-tien")
  .addEventListener("click", () => hopThoai.close());
document.querySelector("#tim-doanh-thu").addEventListener("click", taiDoanhThu);
document.querySelector("#ap-dung-loc-ngay").addEventListener("click", () => {
  const tuNgay = document.querySelector("#thong-ke-tu-ngay").value;
  const denNgay = document.querySelector("#thong-ke-den-ngay").value;
  if (tuNgay && denNgay && tuNgay > denNgay) {
    thongBaoEl.textContent = "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.";
    return;
  }
  apDungThongKe();
  apDungLocDanhSach();
});
document.querySelector("#xoa-loc-ngay").addEventListener("click", () => {
  document.querySelector("#thong-ke-tu-ngay").value = "";
  document.querySelector("#thong-ke-den-ngay").value = "";
  apDungThongKe();
  apDungLocDanhSach();
});
document.querySelector("#lam-moi-doanh-thu").addEventListener("click", () => {
  tuKhoaEl.value = "";
  locThuTienEl.value = "tat-ca";
  taiDoanhThu();
});
tuKhoaEl.addEventListener("keydown", (event) => {
  if (event.key === "Enter") taiDoanhThu();
});
locThuTienEl.addEventListener("change", apDungLocDanhSach);
taiDoanhThu();
