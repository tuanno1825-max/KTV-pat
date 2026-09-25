const bangDonHang = document.querySelector("#table-ds-don-hang");
const oTuKhoaDon = document.querySelector("#tu-khoa-don");
const oLocTrangThai = document.querySelector("#loc-trang-thai-don");
const nutTimDon = document.querySelector(".nut-tim-don");
const nutLamMoi = document.querySelector(".nut-hien-thi-don");
const noiThongKeTrangThai = document.querySelector("#thong-ke-trang-thai");
const theGioCaoDiem = document.querySelector("#gio-cao-diem");
let danhSachQuan = [];

fetch("/api/quyen-noi-bo", { credentials: "same-origin", cache: "no-store" })
  .then((response) => response.ok ? response.json() : null)
  .then((quyen) => {
    if (quyen?.vaiTro === "admin") {
      document.querySelector("#tab-quan-ly-tai-khoan")?.removeAttribute("hidden");
    }
  })
  .catch(() => {});

async function taiThongKe() {
  try {
    const phanHoi = await fetch("/api/don-hang/thong-ke");
    const thongKe = await phanHoi.json();
    if (!phanHoi.ok) throw new Error(thongKe.message || "Không thể tải thống kê.");

    const gioCaoDiem = thongKe.gioCaoDiem;
    theGioCaoDiem.textContent = gioCaoDiem
      ? `Khung giờ cao điểm: ${String(gioCaoDiem.gio).padStart(2, "0")}:00–${String((gioCaoDiem.gio + 1) % 24).padStart(2, "0")}:00 · ${gioCaoDiem.soLuong} đơn`
      : "Chưa có đơn hàng để xác định khung giờ cao điểm";

    const soDonTheoTrangThai = new Map(thongKe.theoTrangThai.map((muc) => [muc._id, muc.soLuong]));
    noiThongKeTrangThai.replaceChildren();
    [...oLocTrangThai.options]
      .filter((muc) => muc.value && muc.value !== "Tất cả")
      .forEach((muc) => {
        const the = document.createElement("article");
        the.className = "the-thong-ke";
        const ten = document.createElement("span");
        ten.textContent = muc.value;
        const soLuong = document.createElement("strong");
        soLuong.textContent = soDonTheoTrangThai.get(muc.value) || 0;
        the.append(ten, soLuong);
        noiThongKeTrangThai.append(the);
      });
  } catch (error) {
    noiThongKeTrangThai.textContent = error.message;
    theGioCaoDiem.textContent = error.message;
  }
}
function taoO(text) {
  const o = document.createElement("td");
  o.textContent = text;
  return o;
}

async function taiDonHang() {
  taiThongKe();
  bangDonHang.replaceChildren();
  const thamSo = new URLSearchParams({ tuKhoa: oTuKhoaDon.value.trim(), trangThai: oLocTrangThai.value });
  try {
    const phanHoi = await fetch(`/api/don-hang?${thamSo}`);
    if (phanHoi.status === 401) {
      window.location.href = "/html/dangnhap-private.html";
      return;
    }
    const donHangs = await phanHoi.json();
    if (!phanHoi.ok) throw new Error(donHangs.message || "Không thể tải danh sách đơn.");

    if (!Array.isArray(donHangs)) throw new Error("Dữ liệu đơn hàng từ máy chủ không hợp lệ.");
    donHangs.forEach((don, index) => {
      const dong = document.createElement("tr");
      dong.append(
        taoO(String(index + 1)), taoO(don.maDon),
        taoO(`${don.xungHo} ${don.tenKhach} · ${don.tenQuan}${don.maDonGoc ? ` (từ đơn ${don.maDonGoc})` : ""}`),
        taoO(new Date(don.thoiGianDat).toLocaleString("vi-VN")),
        taoO(don.thoiGianCheckIn || "—"),
        taoO(don.soDienThoai),
      );
      const oTrangThai = taoO("");
      const nhan = document.createElement("span");
      const lopTrangThai = don.trangThai === "Đặt phòng thành công"
        ? "dat-phong-thanh-cong"
        : ["Đặt phòng thất bại", "Khách không đến"].includes(don.trangThai)
          ? "de-xuat-quan-moi"
        : don.trangThai === "Khách đã chấp nhận đề xuất"
          ? "dat-phong-thanh-cong"
        : don.trangThai === "Khách từ chối đề xuất"
          ? "de-xuat-quan-moi"
        : don.trangThai === "Đề xuất quán mới"
          ? "de-xuat-quan-moi"
          : don.trangThai === "Đã xác nhận"
            ? "da-xac-nhan"
            : "dang-cho-xu-ly";
      nhan.className = `nhan-trang-thai ${lopTrangThai}`;
      nhan.textContent = don.trangThai;
      oTrangThai.append(nhan);
      dong.append(oTrangThai);

      const oThaoTac = taoO("");
      const taoNutCapNhat = (nhanNut, maTrangThai, duLieu = {}) => {
        const cacTrangThai = {
          confirmed: "Đã xác nhận",
          success: "Đặt phòng thành công",
          failed: "Đặt phòng thất bại",
          noshow: "Khách không đến",
        };
        const nut = document.createElement("button");
        nut.type = "button";
        nut.className = "nut-bang nut-bang-xac-nhan";
        nut.textContent = nhanNut;
        nut.addEventListener("click", async () => {
          if (!window.confirm(`Cập nhật đơn ${don.maDon} thành “${cacTrangThai[maTrangThai]}”?`)) return;
          nut.disabled = true;
          const trangThaiHienThi = cacTrangThai[maTrangThai];
          nhan.textContent = trangThaiHienThi;
          nhan.className = `nhan-trang-thai ${maTrangThai === "success" ? "dat-phong-thanh-cong" : ["failed", "noshow"].includes(maTrangThai) ? "de-xuat-quan-moi" : "da-xac-nhan"}`;
          try {
            const capNhat = await fetch(`/api/don-hang/${don._id}`, {
              method: "PATCH", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ trangThai: trangThaiHienThi, ...duLieu }),
            });
            const ketQua = await capNhat.json();
            if (!capNhat.ok) throw new Error(ketQua.message || "Không thể cập nhật trạng thái đơn.");
            await taiDonHang();
          } catch (error) {
            alert(error.message);
            await taiDonHang();
          }
        });
        oThaoTac.append(nut);
      };
      if (don.trangThai === "Đang chờ xử lý") {
        taoNutCapNhat("Xác nhận", "confirmed");
      } else if (don.trangThai === "Đã xác nhận") {
        taoNutCapNhat("Đặt phòng thành công", "success");
        taoNutCapNhat("Đặt phòng thất bại", "failed");
      } else if (don.trangThai === "Đặt phòng thành công") {
        if (don.diemCongDaXuLy) {
          oThaoTac.textContent = "Đã ghi nhận khách đến";
        } else {
          taoNutCapNhat("Khách không đến", "noshow");
          const nutKhachDen = document.createElement("button");
          nutKhachDen.type = "button";
          nutKhachDen.className = "nut-bang nut-bang-xac-nhan";
          nutKhachDen.textContent = "Khách có đến";
          nutKhachDen.addEventListener("click", async () => {
            if (!window.confirm(`Xác nhận khách đã đến ở đơn ${don.maDon} và cộng 100 điểm?`)) return;
            nutKhachDen.disabled = true;
            try {
              const capNhat = await fetch(`/api/don-hang/${don._id}`, {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ trangThai: "Đặt phòng thành công", xacNhanKhachDen: true }),
              });
              const ketQua = await capNhat.json();
              if (!capNhat.ok) throw new Error(ketQua.message || "Không thể ghi nhận khách đến.");
              await taiDonHang();
            } catch (error) {
              alert(error.message);
              await taiDonHang();
            }
          });
          oThaoTac.append(nutKhachDen);
        }
      } else if (don.trangThai === "Khách không đến") {
        oThaoTac.textContent = "Đã ghi nhận khách không đến";
      } else if (["Đặt phòng thất bại", "Khách từ chối đề xuất"].includes(don.trangThai) && !don.daHuy) {
        const chonQuan = document.createElement("select");
        chonQuan.setAttribute("aria-label", "Chọn quán để đề xuất cho khách");
        chonQuan.append(new Option("Chọn quán đề xuất", ""));
        danhSachQuan
        .filter((quan) => quan.trangThai === "Đang hoạt động" && quan.maQuan !== don.maQuan)
          .forEach((quan) => chonQuan.append(new Option(quan.ten, quan.maQuan)));
        oThaoTac.append(chonQuan);
        const nutDeXuat = document.createElement("button");
        nutDeXuat.type = "button";
        nutDeXuat.className = "nut-bang nut-bang-de-xuat";
        nutDeXuat.textContent = "Đề xuất quán mới";
        nutDeXuat.disabled = true;
        chonQuan.addEventListener("change", () => { nutDeXuat.disabled = !chonQuan.value; });
        nutDeXuat.addEventListener("click", async () => {
          const tenQuan = chonQuan.selectedOptions[0]?.textContent || "quán đã chọn";
          if (!window.confirm(`Gửi đề xuất “${tenQuan}” cho khách ở đơn ${don.maDon}?`)) return;
          nutDeXuat.disabled = true;
          nhan.textContent = "Đề xuất quán mới";
          nhan.className = "nhan-trang-thai de-xuat-quan-moi";
          try {
            const capNhat = await fetch(`/api/don-hang/${don._id}`, {
              method: "PATCH", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ trangThai: "Đề xuất quán mới", maQuanDeXuat: chonQuan.value }),
            });
            const ketQua = await capNhat.json();
            if (!capNhat.ok) throw new Error(ketQua.message || "Không thể gửi đề xuất.");
            await taiDonHang();
          } catch (error) { alert(error.message); await taiDonHang(); }
        });
        oThaoTac.append(nutDeXuat);
      } else if (don.trangThai === "Đề xuất quán mới") {
        oThaoTac.textContent = `Đã đề xuất: ${don.tenQuanDeXuat}`;
      } else if (don.daHuy) {
        oThaoTac.textContent = "Khách đã hủy đặt phòng";
      } else if (don.trangThai === "Khách đã chấp nhận đề xuất") {
        oThaoTac.textContent = `Khách chấp nhận · Đơn tiếp theo: ${don.maDonTiepTheo}`;
      } else {
        oThaoTac.textContent = "Hoàn tất";
      }
      dong.append(oThaoTac);
      bangDonHang.append(dong);
    });
    if (!donHangs.length) {
      const dong = document.createElement("tr");
      const o = taoO("Chưa có đơn hàng phù hợp.");
      o.colSpan = 8;
      dong.append(o);
      bangDonHang.append(dong);
    }
  } catch (error) {
    const dong = document.createElement("tr");
    const o = taoO(error.message);
    o.colSpan = 8;
    dong.append(o);
    bangDonHang.append(dong);
  }
}

fetch("/api/quan-cong-khai")
  .then((response) => response.ok ? response.json() : [])
  .then((quan) => { danhSachQuan = Array.isArray(quan) ? quan : []; })
  .catch(() => { danhSachQuan = []; })
  .finally(taiDonHang);

nutTimDon.addEventListener("click", taiDonHang);
nutLamMoi.addEventListener("click", taiDonHang);
oTuKhoaDon.addEventListener("keydown", (event) => {
  if (event.key === "Enter") taiDonHang();
});
oLocTrangThai.addEventListener("change", taiDonHang);
