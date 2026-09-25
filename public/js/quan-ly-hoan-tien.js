const danhSachHoanTien = document.querySelector("#danh-sach-yeu-cau-hoan-tien");
const oTimKiemHoanTien = document.querySelector("#tu-khoa-hoan-tien");
const oLocTrangThaiHoanTien = document.querySelector("#loc-trang-thai-hoan-tien");
const demYeuCauHoanTien = document.querySelector("#dem-yeu-cau-hoan-tien");
const khongCoKetQuaHoanTien = document.querySelector("#khong-co-ket-qua-hoan-tien");
let cacHangHoanTien = [];
const quyenNoiBoDangTai = fetch("/api/quyen-noi-bo", { credentials: "same-origin", cache: "no-store" })
  .then((response) => response.ok ? response.json() : null)
  .catch(() => null);

function chuanHoaTuKhoa(value) {
  return String(value || "")
    .toLocaleLowerCase("vi")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

function apDungBoLocHoanTien() {
  const tuKhoa = chuanHoaTuKhoa(oTimKiemHoanTien.value.trim());
  const trangThai = oLocTrangThaiHoanTien.value;
  let soKetQua = 0;
  cacHangHoanTien.forEach(({ hang, chuoiTimKiem, trangThai: trangThaiHang }) => {
    const hienThi = (!tuKhoa || chuoiTimKiem.includes(tuKhoa)) && (!trangThai || trangThaiHang === trangThai);
    hang.hidden = !hienThi;
    if (hienThi) soKetQua += 1;
  });
  demYeuCauHoanTien.textContent = `${soKetQua} / ${cacHangHoanTien.length} yêu cầu`;
  khongCoKetQuaHoanTien.hidden = soKetQua > 0 || cacHangHoanTien.length === 0;
}

function taoNutQuyetDinh(ten, giaTri, id, laTuChoi = false, oPhanTram = null, maDon = id) {
  const nut = document.createElement("button");
  nut.type = "button";
  nut.className = `nut-quyet-dinh-hoan-tien${laTuChoi ? " tu-choi" : ""}`;
  nut.textContent = ten;
  nut.addEventListener("click", async () => {
    const phanTramXacNhan = giaTri === "duyet" ? 5 : null;
    const thongDiep = giaTri === "duyet"
      ? `Duyệt yêu cầu hoàn tiền đơn ${maDon} với mức hoàn ${phanTramXacNhan}%?`
      : `Từ chối yêu cầu hoàn tiền đơn ${maDon}?`;
    if (!window.confirm(thongDiep)) return;
    nut.disabled = true;
    try {
      const phanTramHoan = phanTramXacNhan;
      const phanHoi = await fetch(`/api/hoan-tien/yeu-cau/${id}/quyet-dinh`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quyetDinh: giaTri, ...(giaTri === "duyet" ? { phanTramHoan } : {}) }),
      });
      const ketQua = await phanHoi.json();
      if (phanHoi.status === 401) {
        window.location.href = "/html/dangnhap-private.html";
        return;
      }
      if (!phanHoi.ok) throw new Error(ketQua.message || "Không cập nhật được yêu cầu.");
      await taiYeuCauHoanTien();
    } catch (error) {
      alert(error.message);
      nut.disabled = false;
    }
  });
  return nut;
}

async function taiYeuCauHoanTien() {
  danhSachHoanTien.textContent = "Đang tải yêu cầu...";
  try {
    const [phanHoi, quyenNoiBo] = await Promise.all([
      fetch("/api/hoan-tien/yeu-cau", { cache: "no-store" }),
      quyenNoiBoDangTai,
    ]);
    const laAdmin = quyenNoiBo?.vaiTro === "admin";
    const yeuCaus = await phanHoi.json();
    if (phanHoi.status === 401) {
      window.location.href = "/html/dangnhap-private.html";
      return;
    }
    if (!phanHoi.ok) throw new Error(yeuCaus.message || "Không tải được yêu cầu hoàn tiền.");
    danhSachHoanTien.replaceChildren();
    cacHangHoanTien = [];
    if (!yeuCaus.length) {
      danhSachHoanTien.textContent = "Chưa có yêu cầu hoàn tiền.";
      demYeuCauHoanTien.textContent = "0 yêu cầu";
      khongCoKetQuaHoanTien.hidden = true;
      return;
    }
    yeuCaus.forEach((yc) => {
      const hang = document.createElement("article");
      hang.className = "hang-yeu-cau-hoan-tien";
      const chuoiTimKiem = chuanHoaTuKhoa([yc.maDon, yc.emailKhach, yc.nganHang, yc.soTaiKhoan, yc.tenThuHuong, yc.trangThai].join(" "));
      hang.dataset.trangThai = yc.trangThai;
      const chiTiet = document.createElement("div");
      chiTiet.className = "chi-tiet-hoan-tien";
      const don = document.createElement("strong");
      don.textContent = `${yc.maDon} · ${yc.emailKhach}`;
      const nhanTrangThai = document.createElement("span");
      nhanTrangThai.className = `nhan-trang-thai-hoan-tien ${yc.trangThai === "Chờ duyệt" ? "cho-duyet" : yc.trangThai === "Đã duyệt" ? "da-duyet" : yc.trangThai === "Đã hoàn tiền" ? "da-hoan-tien" : "tu-choi"}`;
      nhanTrangThai.textContent = yc.trangThai;
      const thongTin = document.createElement("div");
      thongTin.textContent = `Ngân hàng: ${yc.nganHang} · STK: ${yc.soTaiKhoan} · Thụ hưởng: ${yc.tenThuHuong}`;
      const ngay = document.createElement("div");
      const mucHoan = yc.phanTramHoan ? ` · Mức hoàn ${yc.phanTramHoan}%` : "";
      ngay.textContent = `Gửi lúc ${new Date(yc.createdAt).toLocaleString("vi-VN")}${mucHoan}`;
      chiTiet.append(don, nhanTrangThai, thongTin, ngay);
      const thaoTac = document.createElement("div");
      thaoTac.className = "thao-tac-hoan-tien";
      const hoaDon = document.createElement("a");
      hoaDon.className = "link-hoa-don-hoan-tien";
      hoaDon.href = yc.linkHoaDon;
      hoaDon.target = "_blank";
      hoaDon.rel = "noopener noreferrer";
      hoaDon.textContent = "Xem hóa đơn";
      thaoTac.append(hoaDon);
      if (yc.trangThai === "Chờ duyệt") {
        const oPhanTram = document.createElement("input");
        oPhanTram.type = "number";
        oPhanTram.type = "text";
        oPhanTram.value = "5%";
        oPhanTram.readOnly = true;
        oPhanTram.setAttribute("aria-label", `Mức hoàn cố định 5% cho đơn ${yc.maDon}`);
        oPhanTram.className = "o-phan-tram-hoan";
        const nutDuyet = taoNutQuyetDinh("Xác nhận", "duyet", yc._id, false, oPhanTram, yc.maDon);
        thaoTac.append(oPhanTram, nutDuyet);
        thaoTac.append(taoNutQuyetDinh("Từ chối", "tu-choi", yc._id, true, null, yc.maDon));
      }
      if (yc.trangThai === "Đã duyệt" && laAdmin) {
        const nutHoanTat = document.createElement("button");
        nutHoanTat.type = "button";
        nutHoanTat.className = "nut-quyet-dinh-hoan-tien nut-xac-nhan-hoan-tien";
        nutHoanTat.textContent = "Xác nhận đã hoàn tiền";
        nutHoanTat.addEventListener("click", async () => {
          if (!window.confirm(`Xác nhận đã chuyển tiền hoàn thành công cho đơn ${yc.maDon}?`)) return;
          nutHoanTat.disabled = true;
          try {
            const ketQuaPhanHoi = await fetch(`/api/hoan-tien/yeu-cau/${yc._id}/xac-nhan-hoan-tien`, {
              method: "PATCH",
              credentials: "same-origin",
              headers: { "Content-Type": "application/json" },
              body: "{}",
            });
            const ketQua = await ketQuaPhanHoi.json();
            if (ketQuaPhanHoi.status === 401) {
              window.location.href = "/html/dangnhap-private.html";
              return;
            }
            if (!ketQuaPhanHoi.ok) throw new Error(ketQua.message || "Không xác nhận được hoàn tiền.");
            await taiYeuCauHoanTien();
          } catch (error) {
            alert(error.message);
            nutHoanTat.disabled = false;
          }
        });
        thaoTac.append(nutHoanTat);
      }
      hang.append(chiTiet, thaoTac);
      danhSachHoanTien.append(hang);
      cacHangHoanTien.push({ hang, chuoiTimKiem, trangThai: yc.trangThai });
    });
    apDungBoLocHoanTien();
  } catch (error) {
    danhSachHoanTien.textContent = error.message;
  }
}

document.querySelector("#nut-tai-hoan-tien").addEventListener("click", taiYeuCauHoanTien);
oTimKiemHoanTien.addEventListener("input", apDungBoLocHoanTien);
oLocTrangThaiHoanTien.addEventListener("change", apDungBoLocHoanTien);
taiYeuCauHoanTien();
