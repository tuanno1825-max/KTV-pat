const danhSachHoanTien = document.querySelector("#danh-sach-yeu-cau-hoan-tien");
const quyenNoiBoDangTai = fetch("/api/quyen-noi-bo", { credentials: "same-origin", cache: "no-store" })
  .then((response) => response.ok ? response.json() : null)
  .catch(() => null);

function taoNutQuyetDinh(ten, giaTri, id, laTuChoi = false, oPhanTram = null, maDon = id) {
  const nut = document.createElement("button");
  nut.type = "button";
  nut.className = `nut-quyet-dinh-hoan-tien${laTuChoi ? " tu-choi" : ""}`;
  nut.textContent = ten;
  nut.addEventListener("click", async () => {
    const phanTramXacNhan = oPhanTram ? Number(oPhanTram.value) : null;
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
    if (!yeuCaus.length) {
      danhSachHoanTien.textContent = "Chưa có yêu cầu hoàn tiền.";
      return;
    }
    yeuCaus.forEach((yc) => {
      const hang = document.createElement("article");
      hang.className = "hang-yeu-cau-hoan-tien";
      const chiTiet = document.createElement("div");
      chiTiet.className = "chi-tiet-hoan-tien";
      const don = document.createElement("strong");
      don.textContent = `${yc.maDon} · ${yc.emailKhach}`;
      const thongTin = document.createElement("div");
      thongTin.textContent = `Ngân hàng: ${yc.nganHang} · STK: ${yc.soTaiKhoan} · Thụ hưởng: ${yc.tenThuHuong}`;
      const ngay = document.createElement("div");
      const mucHoan = yc.phanTramHoan ? ` · Mức hoàn ${yc.phanTramHoan}%` : "";
      ngay.textContent = `Gửi lúc ${new Date(yc.createdAt).toLocaleString("vi-VN")} · ${yc.trangThai}${mucHoan}`;
      chiTiet.append(don, thongTin, ngay);
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
        oPhanTram.min = "5";
        oPhanTram.max = "20";
        oPhanTram.step = "1";
        oPhanTram.placeholder = "Hoàn % (5–20)";
        oPhanTram.setAttribute("aria-label", `Nhập phần trăm hoàn cho đơn ${yc.maDon}`);
        oPhanTram.className = "o-phan-tram-hoan";
        const nutDuyet = taoNutQuyetDinh("Xác nhận", "duyet", yc._id, false, oPhanTram, yc.maDon);
        nutDuyet.disabled = true;
        oPhanTram.addEventListener("input", () => {
          nutDuyet.disabled = !oPhanTram.validity.valid || !oPhanTram.value;
        });
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
    });
  } catch (error) {
    danhSachHoanTien.textContent = error.message;
  }
}

document.querySelector("#nut-tai-hoan-tien").addEventListener("click", taiYeuCauHoanTien);
taiYeuCauHoanTien();
