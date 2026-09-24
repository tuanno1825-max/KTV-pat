const API_QUAN = "/api/quan";

const bieuMau = document.querySelector(".bieu-mau-quan");
const bangDanhSach = document.querySelector("#table-dsquan");
const nutThem = document.querySelector(".nut-them");
const nutSua = document.querySelector(".nut-sua");
const nutXoa = document.querySelector(".nut-xoa");
const nutLamMoi = document.querySelector(".nut-lam-moi");
const nutTim = document.querySelector(".nut-tim");
const nutHienThi = document.querySelector(".nut-hien-thi");
const oTuKhoa = document.querySelector("#tu-khoa-quan");
const oLocQuan = document.querySelector("#loc-quan-huyen");
const oLocTrangThai = document.querySelector("#loc-trang-thai");

let maQuanDangChon = null;
let vaiTroHienTai = null;

async function layQuyenHienTai() {
  const phanHoi = await fetch("/api/quyen-noi-bo", {
    credentials: "same-origin",
  });
  if (!phanHoi.ok) {
    window.location.href = "/dangnhap-private";
    return false;
  }

  const quyen = await phanHoi.json();
  vaiTroHienTai = quyen.vaiTro;

  return true;
}

async function layMaQuanMoi() {
  if (vaiTroHienTai !== "admin") return "";
  try {
    const phanHoi = await fetch(`${API_QUAN}/ma-moi`);
    const ketQua = await phanHoi.json();
    if (!phanHoi.ok) throw new Error(ketQua.message || "Không thể lấy mã mới.");
    document.querySelector("#ma-quan").value = ketQua.maQuan;
    return ketQua.maQuan;
  } catch (error) {
    hienThiThongBao(`Không lấy được mã quán: ${error.message}`, true);
    return "";
  }
}

function layDuLieuForm() {
  return {
    maQuan: document.querySelector("#ma-quan").value.trim(),
    tenQuan: document.querySelector("#ten-quan").value.trim(),
    soDienThoai: document.querySelector("#so-dien-thoai-quan").value.trim(),
    diaChiChiTiet: document.querySelector("#dia-chi-quan").value.trim(),
    quanHuyen: document.querySelector("#quan-huyen").value,
    anhQuan: document.querySelector("#anh-quan").value.trim(),
    chietKhau: Number(document.querySelector("#chiet-khau").value || 0),
    giaMin: Number(document.querySelector("#gia-min").value),
    giaMax: Number(document.querySelector("#gia-max").value),
    trangThai: document.querySelector("#trang-thai-quan").value,
  };
}

function dienDuLieuForm(quan) {
  document.querySelector("#ma-quan").value = quan.maQuan || "";
  document.querySelector("#ten-quan").value = quan.tenQuan || "";
  document.querySelector("#so-dien-thoai-quan").value = quan.soDienThoai || "";
  document.querySelector("#dia-chi-quan").value = quan.diaChiChiTiet || "";
  document.querySelector("#quan-huyen").value = quan.quanHuyen || "";
  document.querySelector("#anh-quan").value = quan.anhQuan || "";
  document.querySelector("#chiet-khau").value = quan.chietKhau ?? 0;
  document.querySelector("#gia-min").value = quan.giaMin ?? 0;
  document.querySelector("#gia-max").value = quan.giaMax ?? 0;
  document.querySelector("#trang-thai-quan").value =
    quan.trangThai || "Đang hoạt động";
  maQuanDangChon = quan._id;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function lamMoiForm() {
  bieuMau.reset();
  maQuanDangChon = null;
  layMaQuanMoi();
}

function dinhDangTien(gia) {
  return `${Number(gia || 0).toLocaleString("vi-VN")} ₫`;
}

function taoO(text) {
  const o = document.createElement("td");
  o.textContent = text;
  return o;
}

function hienThiBang(danhSach) {
  bangDanhSach.replaceChildren();

  if (!danhSach.length) {
    const dongTrong = document.createElement("tr");
    const oTrong = taoO("Chưa có dữ liệu quán");
    oTrong.colSpan = 11;
    dongTrong.append(oTrong);
    bangDanhSach.append(dongTrong);
    return;
  }

  danhSach.forEach((quan, chiSo) => {
    const dong = document.createElement("tr");
    dong.dataset.id = quan._id;
    dong.append(
      taoO(chiSo + 1),
      taoO(quan.maQuan),
      taoO(quan.tenQuan),
      taoO(quan.soDienThoai),
      taoO(quan.diaChiChiTiet),
      taoO(quan.quanHuyen),
      taoO(`${quan.chietKhau}%`),
      taoO(dinhDangTien(quan.giaMin)),
      taoO(dinhDangTien(quan.giaMax)),
    );

    const oTrangThai = document.createElement("td");
    const nhan = document.createElement("span");
    nhan.className = `nhan-trang-thai ${quan.trangThai === "Đang hoạt động" ? "dang-hoat-dong" : "tam-ngung"}`;
    nhan.textContent = quan.trangThai;
    oTrangThai.append(nhan);
    dong.append(oTrangThai);

    const oChucNang = document.createElement("td");
    const nutSuaDong = document.createElement("button");
    nutSuaDong.className = "nut-bang nut-bang-sua";
    nutSuaDong.type = "button";
    nutSuaDong.textContent = "Sửa";
    nutSuaDong.addEventListener("click", () => {
      if (vaiTroHienTai !== "admin") {
        hienThiThongBao("Chỉ Admin mới được thực hiện thao tác này.", true);
        return;
      }
      dienDuLieuForm(quan);
    });

    const nutXoaDong = document.createElement("button");
    nutXoaDong.className = "nut-bang nut-bang-xoa";
    nutXoaDong.type = "button";
    nutXoaDong.textContent = "Xóa";
    nutXoaDong.addEventListener("click", () => xoaQuan(quan._id));

    oChucNang.append(nutSuaDong, " ", nutXoaDong);
    dong.append(oChucNang);
    bangDanhSach.append(dong);
  });
}

async function taiDanhSach() {
  const thamSo = new URLSearchParams({
    quanHuyen: oLocQuan.value,
    trangThai: oLocTrangThai.value,
    tuKhoa: oTuKhoa.value.trim(),
  });

  try {
    const phanHoi = await fetch(`${API_QUAN}?${thamSo}`);
    const ketQua = await phanHoi.json();
    if (!phanHoi.ok)
      throw new Error(ketQua.message || "Không thể tải dữ liệu.");
    hienThiBang(ketQua);
  } catch (error) {
    hienThiThongBao(error.message, true);
  }
}

async function themQuan() {
  if (vaiTroHienTai !== "admin") {
    hienThiThongBao("Chỉ Admin mới được thực hiện thao tác này.", true);
    return;
  }
  try {
    if (!document.querySelector("#ma-quan").value.trim()) {
      const maQuan = await layMaQuanMoi();
      if (!maQuan) throw new Error("Chưa lấy được mã quán tự động.");
    }

    const phanHoi = await fetch(API_QUAN, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(layDuLieuForm()),
    });
    const ketQua = await phanHoi.json();
    if (!phanHoi.ok) throw new Error(ketQua.message || "Không thể thêm quán.");
    hienThiThongBao("Đã thêm quán thành công.");
    lamMoiForm();
    await taiDanhSach();
  } catch (error) {
    hienThiThongBao(error.message, true);
  }
}

async function suaQuan() {
  if (vaiTroHienTai !== "admin") {
    hienThiThongBao("Chỉ Admin mới được thực hiện thao tác này.", true);
    return;
  }
  if (!maQuanDangChon) {
    hienThiThongBao("Hãy chọn một quán trong bảng để sửa.", true);
    return;
  }

  try {
    const phanHoi = await fetch(`${API_QUAN}/${maQuanDangChon}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(layDuLieuForm()),
    });
    const ketQua = await phanHoi.json();
    if (!phanHoi.ok) throw new Error(ketQua.message || "Không thể sửa quán.");
    hienThiThongBao("Đã cập nhật quán thành công.");
    lamMoiForm();
    await taiDanhSach();
  } catch (error) {
    hienThiThongBao(error.message, true);
  }
}

async function xoaQuan(id) {
  if (vaiTroHienTai !== "admin") {
    hienThiThongBao("Chỉ Admin mới được thực hiện thao tác này.", true);
    return;
  }
  if (!window.confirm("Bạn có chắc muốn xóa quán này không?")) return;

  try {
    const phanHoi = await fetch(`${API_QUAN}/${id}`, { method: "DELETE" });
    const ketQua = await phanHoi.json();
    if (!phanHoi.ok) throw new Error(ketQua.message || "Không thể xóa quán.");
    hienThiThongBao("Đã xóa quán thành công.");
    if (maQuanDangChon === id) lamMoiForm();
    await taiDanhSach();
  } catch (error) {
    hienThiThongBao(error.message, true);
  }
}

function hienThiThongBao(noiDung, laLoi = false) {
  let thongBao = document.querySelector(".thong-bao-quan");
  if (!thongBao) {
    thongBao = document.createElement("div");
    thongBao.className = "thong-bao-quan";
    document.querySelector(".khung-quan-tri").prepend(thongBao);
  }
  thongBao.className = `thong-bao-quan ${laLoi ? "thong-bao-loi" : ""}`;
  thongBao.textContent = noiDung;
  window.setTimeout(() => thongBao.remove(), 5000);
}

bieuMau.addEventListener("submit", (suKien) => suKien.preventDefault());
nutThem.addEventListener("click", themQuan);
nutSua.addEventListener("click", suaQuan);
nutXoa.addEventListener("click", () => {
  if (maQuanDangChon) xoaQuan(maQuanDangChon);
  else hienThiThongBao("Hãy chọn một quán trong bảng để xóa.", true);
});
nutLamMoi.addEventListener("click", lamMoiForm);
nutTim.addEventListener("click", taiDanhSach);
nutHienThi.addEventListener("click", () => {
  oTuKhoa.value = "";
  oLocQuan.value = "Tất cả";
  oLocTrangThai.value = "Tất cả";
  taiDanhSach();
});

async function khoiDongTrangQuanLy() {
  if (!(await layQuyenHienTai())) return;
  if (vaiTroHienTai === "admin") await layMaQuanMoi();
  await taiDanhSach();
}

khoiDongTrangQuanLy();
