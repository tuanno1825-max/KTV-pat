const danhSachHoanTien = document.querySelector("#danh-sach-yeu-cau-hoan-tien");
const oTimKiemHoanTien = document.querySelector("#tu-khoa-hoan-tien");
const oLocTrangThaiHoanTien = document.querySelector(
  "#loc-trang-thai-hoan-tien",
);
const demYeuCauHoanTien = document.querySelector("#dem-yeu-cau-hoan-tien");
const khongCoKetQuaHoanTien = document.querySelector(
  "#khong-co-ket-qua-hoan-tien",
);
const hopThoaiBillHoanTien = document.querySelector(
  "#hop-thoai-bill-hoan-tien",
);
const formBillHoanTien = document.querySelector("#form-bill-hoan-tien");
const tepBillHoanTien = document.querySelector("#anh-bill-hoan-tien");
const loiBillHoanTien = document.querySelector("#loi-bill-hoan-tien");
const nutGuiBillHoanTien = document.querySelector("#gui-bill-hoan-tien");
let cacHangHoanTien = [];
let yeuCauDangXacNhan = null;
const kichThuocBillToiDa = 5 * 1024 * 1024;
const quyenNoiBoDangTai = fetch("/api/quyen-noi-bo", {
  credentials: "same-origin",
  cache: "no-store",
})
  .then((response) => (response.ok ? response.json() : null))
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
  cacHangHoanTien.forEach(
    ({ hang, chuoiTimKiem, trangThai: trangThaiHang }) => {
      const hienThi =
        (!tuKhoa || chuoiTimKiem.includes(tuKhoa)) &&
        (!trangThai || trangThaiHang === trangThai);
      hang.hidden = !hienThi;
      if (hienThi) soKetQua += 1;
    },
  );
  demYeuCauHoanTien.textContent = `${soKetQua} / ${cacHangHoanTien.length} yêu cầu`;
  khongCoKetQuaHoanTien.hidden = soKetQua > 0 || cacHangHoanTien.length === 0;
}

function taoNutQuyetDinh(ten, giaTri, id, laTuChoi = false, maDon = id) {
  const nut = document.createElement("button");
  nut.type = "button";
  nut.className = `nut-quyet-dinh-hoan-tien${laTuChoi ? " tu-choi" : ""}`;
  nut.textContent = ten;
  nut.addEventListener("click", async () => {
    const phanTramXacNhan = giaTri === "duyet" ? 5 : null;
    const thongDiep =
      giaTri === "duyet"
        ? `Duyệt yêu cầu hoàn tiền đơn ${maDon} với mức hoàn ${phanTramXacNhan}%?`
        : `Từ chối yêu cầu hoàn tiền đơn ${maDon}?`;
    if (!window.confirm(thongDiep)) return;
    nut.disabled = true;
    try {
      const phanHoi = await fetch(`/api/hoan-tien/yeu-cau/${id}/quyet-dinh`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quyetDinh: giaTri }),
      });
      const ketQua = await phanHoi.json();
      if (phanHoi.status === 401) {
        window.location.href = "/html/dangnhap-private.html";
        return;
      }
      if (!phanHoi.ok)
        throw new Error(ketQua.message || "Không cập nhật được yêu cầu.");
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
    const laQuanLy = ["admin", "manager"].includes(quyenNoiBo?.vaiTro);
    const yeuCaus = await phanHoi.json();
    if (phanHoi.status === 401) {
      window.location.href = "/html/dangnhap-private.html";
      return;
    }
    if (!phanHoi.ok)
      throw new Error(yeuCaus.message || "Không tải được yêu cầu hoàn tiền.");
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
      const chuoiTimKiem = chuanHoaTuKhoa(
        [
          yc.maDon,
          yc.tenKhach,
          yc.maKhachHang,
          yc.emailKhach,
          yc.nganHang,
          yc.soTaiKhoan,
          yc.tenThuHuong,
          yc.trangThai,
        ].join(" "),
      );
      hang.dataset.trangThai = yc.trangThai;
      const chiTiet = document.createElement("div");
      chiTiet.className = "chi-tiet-hoan-tien";
      const don = document.createElement("strong");
      don.textContent = `${yc.maDon} · ${yc.tenKhach || "Khách hàng"} · ${yc.maKhachHang || "Chưa có mã khách"}`;
      const nhanTrangThai = document.createElement("span");
      nhanTrangThai.className = `nhan-trang-thai-hoan-tien ${yc.trangThai === "Chờ duyệt" ? "cho-duyet" : yc.trangThai === "Đã duyệt" ? "da-duyet" : yc.trangThai === "Đã hoàn tiền" ? "da-hoan-tien" : "tu-choi"}`;
      nhanTrangThai.textContent = yc.trangThai;
      const thongTin = document.createElement("div");
      thongTin.textContent = `Ngân hàng: ${yc.nganHang} · STK: ${yc.soTaiKhoan} · Thụ hưởng: ${yc.tenThuHuong}`;
      const email = document.createElement("div");
      email.textContent = `Email: ${yc.emailKhach}`;
      const ngay = document.createElement("div");
      const mucHoan = yc.phanTramHoan ? ` · Mức hoàn ${yc.phanTramHoan}%` : "";
      ngay.textContent = `Gửi lúc ${new Date(yc.createdAt).toLocaleString("vi-VN")}${mucHoan}`;
      chiTiet.append(don, nhanTrangThai, email, thongTin, ngay);
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
        const nutDuyet = taoNutQuyetDinh(
          "X\u00e1c nh\u1eadn",
          "duyet",
          yc._id,
          false,
          yc.maDon,
        );
        thaoTac.append(
          nutDuyet,
          taoNutQuyetDinh(
            "T\u1eeb ch\u1ed1i",
            "tu-choi",
            yc._id,
            true,
            yc.maDon,
          ),
        );
      }
      if (yc.trangThai === "Đã duyệt" && laQuanLy) {
        const nutHoanTat = document.createElement("button");
        nutHoanTat.type = "button";
        nutHoanTat.className =
          "nut-quyet-dinh-hoan-tien nut-xac-nhan-hoan-tien";
        nutHoanTat.textContent =
          "X\u00e1c nh\u1eadn \u0111\u00e3 ho\u00e0n ti\u1ec1n";
        nutHoanTat.addEventListener("click", () => {
          yeuCauDangXacNhan = yc;
          formBillHoanTien.reset();
          loiBillHoanTien.textContent = "";
          hopThoaiBillHoanTien.showModal();
        });
        thaoTac.append(nutHoanTat);
      }
      if (
        yc.trangThai === "\u0110\u00e3 ho\u00e0n ti\u1ec1n" &&
        yc.linkBillHoanTien
      ) {
        const billHoanTien = document.createElement("a");
        billHoanTien.className = "link-hoa-don-hoan-tien";
        billHoanTien.href = yc.linkBillHoanTien;
        billHoanTien.target = "_blank";
        billHoanTien.rel = "noopener noreferrer";
        billHoanTien.textContent = "Xem bill ho\u00e0n";
        thaoTac.append(billHoanTien);
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

function docAnhThanhDataUrl(tep) {
  return new Promise((resolve, reject) => {
    const doc = new FileReader();
    doc.onload = () => resolve(doc.result);
    doc.onerror = () =>
      reject(
        new Error(
          "Kh\u00f4ng \u0111\u1ecdc \u0111\u01b0\u1ee3c \u1ea3nh bill.",
        ),
      );
    doc.readAsDataURL(tep);
  });
}

formBillHoanTien.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!yeuCauDangXacNhan) return;
  const tep = tepBillHoanTien.files[0];
  if (!tep) {
    loiBillHoanTien.textContent =
      "Vui l\u00f2ng ch\u1ecdn \u1ea3nh bill ho\u00e0n ti\u1ec1n.";
    return;
  }
  if (
    !/^image\/(jpeg|png|webp)$/.test(tep.type) ||
    tep.size > kichThuocBillToiDa
  ) {
    loiBillHoanTien.textContent =
      "\u1ea2nh bill ph\u1ea3i l\u00e0 JPG, PNG ho\u1eb7c WEBP v\u00e0 t\u1ed1i \u0111a 5 MB.";
    return;
  }

  nutGuiBillHoanTien.disabled = true;
  loiBillHoanTien.textContent =
    "\u0110ang t\u1ea3i bill v\u00e0 l\u01b0u x\u00e1c nh\u1eadn...";
  try {
    const billHoanTien = await docAnhThanhDataUrl(tep);
    const response = await fetch(
      "/api/hoan-tien/yeu-cau/" +
        encodeURIComponent(yeuCauDangXacNhan._id) +
        "/xac-nhan-hoan-tien",
      {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billHoanTien }),
      },
    );
    const data = await response.json();
    if (response.status === 401) {
      window.location.href = "/html/dangnhap-private.html";
      return;
    }
    if (!response.ok)
      throw new Error(
        data.message ||
          "Kh\u00f4ng x\u00e1c nh\u1eadn \u0111\u01b0\u1ee3c ho\u00e0n ti\u1ec1n.",
      );
    hopThoaiBillHoanTien.close();
    yeuCauDangXacNhan = null;
    await taiYeuCauHoanTien();
  } catch (error) {
    loiBillHoanTien.textContent = error.message;
  } finally {
    nutGuiBillHoanTien.disabled = false;
  }
});

document.querySelector("#huy-bill-hoan-tien").addEventListener("click", () => {
  hopThoaiBillHoanTien.close();
  yeuCauDangXacNhan = null;
});

document
  .querySelector("#nut-tai-hoan-tien")
  .addEventListener("click", taiYeuCauHoanTien);
oTimKiemHoanTien.addEventListener("input", apDungBoLocHoanTien);
oLocTrangThaiHoanTien.addEventListener("change", apDungBoLocHoanTien);
taiYeuCauHoanTien();
