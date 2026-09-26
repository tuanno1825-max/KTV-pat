const bangDonHang = document.querySelector("#table-ds-don-hang");
const oTuKhoaDon = document.querySelector("#tu-khoa-don");
const oLocTrangThai = document.querySelector("#loc-trang-thai-don");
const nutTimDon = document.querySelector(".nut-tim-don");
const nutLamMoi = document.querySelector(".nut-hien-thi-don");
const noiThongKeTrangThai = document.querySelector("#thong-ke-trang-thai");
const theGioCaoDiem = document.querySelector("#gio-cao-diem");
const bieuDoDonTheoNgay = document.querySelector("#bieu-do-don-theo-ngay");
const bieuDoTronDon = document.querySelector("#bieu-do-tron-don");
const chuGiaiBieuTronDon = document.querySelector("#chu-giai-bieu-tron-don");
const thongKeTuNgay = document.querySelector("#thong-ke-don-tu-ngay");
const thongKeDenNgay = document.querySelector("#thong-ke-don-den-ngay");
let danhSachQuan = [];

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

function ngayHienTaiBangkok() {
  const cacPhanNgay = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const phanNgay = Object.fromEntries(
    cacPhanNgay.map((phan) => [phan.type, phan.value]),
  );
  return `${phanNgay.year}-${phanNgay.month}-${phanNgay.day}`;
}

function veBieuDoDon(theoNgay, tuNgay, denNgay) {
  const duLieuTheoNgay = new Map();
  (Array.isArray(theoNgay) ? theoNgay : []).forEach((muc) => {
    const ngay = muc._id?.ngay;
    const trangThai = muc._id?.trangThai;
    if (!ngay || !trangThai) return;
    if (!duLieuTheoNgay.has(ngay)) duLieuTheoNgay.set(ngay, new Map());
    const cacTrangThai = duLieuTheoNgay.get(ngay);
    cacTrangThai.set(
      trangThai,
      (cacTrangThai.get(trangThai) || 0) + Number(muc.soLuong || 0),
    );
  });

  const cacNgayCoDon = [...duLieuTheoNgay.keys()].sort();
  const homNay = ngayHienTaiBangkok();
  const ngayBatDau =
    tuNgay || (denNgay ? cacNgayCoDon[0] : taoDanhSachNgay(homNay, homNay)[0]);
  const ngayKetThuc = denNgay || homNay;
  const cacKhoaNgay =
    tuNgay || denNgay
      ? ngayBatDau
        ? taoDanhSachNgay(ngayBatDau, ngayKetThuc)
        : []
      : taoDanhSachNgay(
          new Date(Date.parse(`${homNay}T00:00:00Z`) - 6 * 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 10),
          homNay,
        );
  if (!cacKhoaNgay.length) {
    const thongBao = document.createElement("p");
    thongBao.className = "thong-bao-bieu-do-don";
    thongBao.textContent = "Không có đơn trong khoảng ngày đã chọn.";
    bieuDoDonTheoNgay.replaceChildren(thongBao);
    return;
  }
  document.querySelector(".dau-bieu-do-don p").textContent =
    !tuNgay && !denNgay
      ? "Đơn thành công, khách vắng mặt và đơn thất bại/hủy trong 7 ngày gần nhất."
      : "Đơn thành công, khách vắng mặt và đơn thất bại/hủy trong khoảng đã chọn.";
  const cacCot = cacKhoaNgay.map((khoaNgay) => {
    const ngay = new Date(`${khoaNgay}T00:00:00Z`);
    const cacTrangThai = duLieuTheoNgay.get(khoaNgay) || new Map();
    let khachCoDen = 0;
    let khachKhongDen = 0;
    let donThatBai = 0;
    cacTrangThai.forEach((soLuong, trangThai) => {
      if (trangThai === "\u0110\u1eb7t ph\u00f2ng th\u00e0nh c\u00f4ng")
        khachCoDen += soLuong;
      else if (trangThai === "Kh\u00e1ch kh\u00f4ng \u0111\u1ebfn")
        khachKhongDen += soLuong;
      else if (
        [
          "\u0110\u1eb7t ph\u00f2ng th\u1ea5t b\u1ea1i",
          "Kh\u00e1ch t\u1eeb ch\u1ed1i \u0111\u1ec1 xu\u1ea5t",
          "Kh\u00e1ch \u0111\u00e3 h\u1ee7y \u0111\u1eb7t ph\u00f2ng",
        ].includes(trangThai)
      )
        donThatBai += soLuong;
    });
    return {
      ngay,
      khoaNgay,
      khachCoDen,
      khachKhongDen,
      donThatBai,
      tong: khachCoDen + khachKhongDen + donThatBai,
    };
  });
  const soDonLonNhat = Math.max(1, ...cacCot.map((cot) => cot.tong));
  const hangCot = document.createElement("div");
  hangCot.className = "hang-cot-ngay-don";
  hangCot.style.gridTemplateColumns = `repeat(${cacCot.length}, minmax(54px, 1fr))`;
  hangCot.style.minWidth =
    cacCot.length > 7 ? `${cacCot.length * 68}px` : "100%";
  bieuDoDonTheoNgay.replaceChildren(hangCot);
  cacCot.forEach((cot) => {
    const cotEl = document.createElement("div");
    cotEl.className = "cot-ngay-don";
    cotEl.title = `${cot.tong} đơn`;
    cotEl.setAttribute(
      "aria-label",
      `${cot.ngay.toLocaleDateString("vi-VN")}: ${cot.tong} đơn, ${cot.khachCoDen} thành công/có đến, ${cot.khachKhongDen} thành công/không đến, ${cot.donThatBai} thất bại hoặc hủy`,
    );
    const tong = document.createElement("span");
    tong.className = "tong-cot-ngay-don";
    tong.textContent = String(cot.tong);
    const than = document.createElement("div");
    than.className = "than-cot-ngay-don";
    [
      ["thanh-cong", cot.khachCoDen],
      ["dang-xu-ly", cot.khachKhongDen],
      ["that-bai", cot.donThatBai],
    ].forEach(([loai, soLuong]) => {
      const phan = document.createElement("span");
      phan.className = `phan-cot-ngay-don ${loai}`;
      phan.style.height = `${(soLuong / soDonLonNhat) * 150}px`;
      than.append(phan);
    });
    const nhanNgay = document.createElement("span");
    nhanNgay.className = "nhan-ngay-cot-don";
    nhanNgay.textContent = cot.ngay.toLocaleDateString("vi-VN", {
      timeZone: "Asia/Bangkok",
      day: "2-digit",
      month: "2-digit",
      ...(cacKhoaNgay[0].slice(0, 4) !==
      cacKhoaNgay[cacKhoaNgay.length - 1].slice(0, 4)
        ? { year: "2-digit" }
        : {}),
    });
    cotEl.append(tong, than, nhanNgay);
    hangCot.append(cotEl);
  });
}

function veBieuDoTron(theoTrangThai) {
  const nhom = [
    { ten: "Thành công · khách có đến", mau: "#0e9f8a", soLuong: 0 },
    { ten: "Thành công · khách không đến", mau: "#80a8c5", soLuong: 0 },
    { ten: "Thất bại / hủy", mau: "#ef786c", soLuong: 0 },
  ];
  const trangThaiThatBai = new Set([
    "\u0110\u1eb7t ph\u00f2ng th\u1ea5t b\u1ea1i",
    "Kh\u00e1ch t\u1eeb ch\u1ed1i \u0111\u1ec1 xu\u1ea5t",
    "Kh\u00e1ch \u0111\u00e3 h\u1ee7y \u0111\u1eb7t ph\u00f2ng",
  ]);
  (Array.isArray(theoTrangThai) ? theoTrangThai : []).forEach((muc) => {
    if (muc._id === "\u0110\u1eb7t ph\u00f2ng th\u00e0nh c\u00f4ng")
      nhom[0].soLuong += Number(muc.soLuong || 0);
    else if (muc._id === "Kh\u00e1ch kh\u00f4ng \u0111\u1ebfn")
      nhom[1].soLuong += Number(muc.soLuong || 0);
    else if (trangThaiThatBai.has(muc._id))
      nhom[2].soLuong += Number(muc.soLuong || 0);
  });
  const tong = nhom.reduce((sum, muc) => sum + muc.soLuong, 0);
  let goc = 0;
  const cacDoan = nhom.map((muc) => {
    const batDau = goc;
    goc += tong ? (muc.soLuong / tong) * 360 : 0;
    return `${muc.mau} ${batDau}deg ${goc}deg`;
  });
  bieuDoTronDon.style.background = `conic-gradient(${cacDoan.join(", ")})`;
  bieuDoTronDon.setAttribute(
    "aria-label",
    `Tổng ${tong} đơn có kết quả đến quán: ${nhom.map((muc) => `${muc.ten} ${muc.soLuong}`).join(", ")}`,
  );
  document.querySelector("#tong-bieu-do-tron-don").textContent = `${tong}\nđơn`;
  chuGiaiBieuTronDon.replaceChildren();
  nhom.forEach((muc) => {
    const dong = document.createElement("div");
    dong.className = "dong-chu-giai-tron";
    const mau = document.createElement("i");
    mau.className = "mau-chu-giai-tron";
    mau.style.backgroundColor = muc.mau;
    const ten = document.createElement("span");
    ten.textContent = muc.ten;
    const giaTri = document.createElement("strong");
    giaTri.className = "so-luong-chu-giai-tron";
    giaTri.textContent = `${muc.soLuong} · ${tong ? ((muc.soLuong / tong) * 100).toFixed(1) : "0.0"}%`;
    dong.append(mau, ten, giaTri);
    chuGiaiBieuTronDon.append(dong);
  });
}

async function taiThongKe() {
  try {
    const thamSoThongKe = new URLSearchParams();
    if (thongKeTuNgay.value) thamSoThongKe.set("tuNgay", thongKeTuNgay.value);
    if (thongKeDenNgay.value)
      thamSoThongKe.set("denNgay", thongKeDenNgay.value);
    const phanHoi = await fetch(`/api/don-hang/thong-ke?${thamSoThongKe}`);
    const thongKe = await phanHoi.json();
    if (!phanHoi.ok)
      throw new Error(thongKe.message || "Không thể tải thống kê.");

    veBieuDoTron(thongKe.theoTrangThai);
    veBieuDoDon(thongKe.theoNgay, thongKeTuNgay.value, thongKeDenNgay.value);
    const gioCaoDiem = thongKe.gioCaoDiem;
    theGioCaoDiem.textContent = gioCaoDiem
      ? `Khung giờ cao điểm: ${String(gioCaoDiem.gio).padStart(2, "0")}:00–${String((gioCaoDiem.gio + 1) % 24).padStart(2, "0")}:00 · ${gioCaoDiem.soLuong} đơn`
      : "Chưa có đơn hàng để xác định khung giờ cao điểm";

    const soDonTheoTrangThai = new Map(
      thongKe.theoTrangThai.map((muc) => [muc._id, muc.soLuong]),
    );
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
    bieuDoTronDon.textContent = error.message;
    bieuDoDonTheoNgay.textContent = error.message;
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
  const thamSo = new URLSearchParams({
    tuKhoa: oTuKhoaDon.value.trim(),
    trangThai: oLocTrangThai.value,
  });
  try {
    const phanHoi = await fetch(`/api/don-hang?${thamSo}`);
    if (phanHoi.status === 401) {
      window.location.href = "/html/dangnhap-private.html";
      return;
    }
    const donHangs = await phanHoi.json();
    if (!phanHoi.ok)
      throw new Error(donHangs.message || "Không thể tải danh sách đơn.");

    if (!Array.isArray(donHangs))
      throw new Error("Dữ liệu đơn hàng từ máy chủ không hợp lệ.");
    donHangs.forEach((don, index) => {
      const dong = document.createElement("tr");
      const oLienHeQuan = taoO("");
      if (don.soDienThoaiQuan) {
        const lienHeQuan = document.createElement("a");
        lienHeQuan.className = "lien-he-quan";
        lienHeQuan.href = `tel:${String(don.soDienThoaiQuan).replace(/[^\d+]/g, "")}`;
        lienHeQuan.textContent = don.soDienThoaiQuan;
        oLienHeQuan.append(lienHeQuan);
      } else {
        oLienHeQuan.textContent = "—";
      }
      dong.append(
        taoO(String(index + 1)),
        taoO(don.maDon),
        taoO(
          `${don.xungHo} ${don.tenKhach} · ${don.tenQuan}${don.maDonGoc ? ` (từ đơn ${don.maDonGoc})` : ""}`,
        ),
        oLienHeQuan,
        taoO(new Date(don.thoiGianDat).toLocaleString("vi-VN")),
        taoO(don.thoiGianCheckIn || "—"),
        taoO(don.soDienThoai),
      );
      const oTrangThai = taoO("");
      const nhan = document.createElement("span");
      const lopTrangThai =
        don.trangThai === "Đặt phòng thành công"
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
          if (
            !window.confirm(
              `Cập nhật đơn ${don.maDon} thành “${cacTrangThai[maTrangThai]}”?`,
            )
          )
            return;
          nut.disabled = true;
          const trangThaiHienThi = cacTrangThai[maTrangThai];
          nhan.textContent = trangThaiHienThi;
          nhan.className = `nhan-trang-thai ${maTrangThai === "success" ? "dat-phong-thanh-cong" : ["failed", "noshow"].includes(maTrangThai) ? "de-xuat-quan-moi" : "da-xac-nhan"}`;
          try {
            const capNhat = await fetch(`/api/don-hang/${don._id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ trangThai: trangThaiHienThi, ...duLieu }),
            });
            const ketQua = await capNhat.json();
            if (!capNhat.ok)
              throw new Error(
                ketQua.message || "Không thể cập nhật trạng thái đơn.",
              );
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
            if (!window.confirm(`Ghi nhận khách đã đến ở đơn ${don.maDon}?`))
              return;
            nutKhachDen.disabled = true;
            try {
              const capNhat = await fetch(`/api/don-hang/${don._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  trangThai: "Đặt phòng thành công",
                  xacNhanKhachDen: true,
                }),
              });
              const ketQua = await capNhat.json();
              if (!capNhat.ok)
                throw new Error(
                  ketQua.message || "Không thể ghi nhận khách đến.",
                );
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
      } else if (
        ["Đặt phòng thất bại", "Khách từ chối đề xuất"].includes(
          don.trangThai,
        ) &&
        !don.daHuy
      ) {
        const chonQuan = document.createElement("select");
        chonQuan.setAttribute("aria-label", "Chọn quán để đề xuất cho khách");
        chonQuan.append(new Option("Chọn quán đề xuất", ""));
        danhSachQuan
          .filter(
            (quan) =>
              quan.trangThai === "Đang hoạt động" && quan.maQuan !== don.maQuan,
          )
          .forEach((quan) =>
            chonQuan.append(new Option(quan.ten, quan.maQuan)),
          );
        oThaoTac.append(chonQuan);
        const nutDeXuat = document.createElement("button");
        nutDeXuat.type = "button";
        nutDeXuat.className = "nut-bang nut-bang-de-xuat";
        nutDeXuat.textContent = "Đề xuất quán mới";
        nutDeXuat.disabled = true;
        chonQuan.addEventListener("change", () => {
          nutDeXuat.disabled = !chonQuan.value;
        });
        nutDeXuat.addEventListener("click", async () => {
          const tenQuan =
            chonQuan.selectedOptions[0]?.textContent || "quán đã chọn";
          if (
            !window.confirm(
              `Gửi đề xuất “${tenQuan}” cho khách ở đơn ${don.maDon}?`,
            )
          )
            return;
          nutDeXuat.disabled = true;
          nhan.textContent = "Đề xuất quán mới";
          nhan.className = "nhan-trang-thai de-xuat-quan-moi";
          try {
            const capNhat = await fetch(`/api/don-hang/${don._id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                trangThai: "Đề xuất quán mới",
                maQuanDeXuat: chonQuan.value,
              }),
            });
            const ketQua = await capNhat.json();
            if (!capNhat.ok)
              throw new Error(ketQua.message || "Không thể gửi đề xuất.");
            await taiDonHang();
          } catch (error) {
            alert(error.message);
            await taiDonHang();
          }
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
      o.colSpan = 9;
      dong.append(o);
      bangDonHang.append(dong);
    }
  } catch (error) {
    const dong = document.createElement("tr");
    const o = taoO(error.message);
    o.colSpan = 9;
    dong.append(o);
    bangDonHang.append(dong);
  }
}

fetch("/api/quan-cong-khai")
  .then((response) => (response.ok ? response.json() : []))
  .then((quan) => {
    danhSachQuan = Array.isArray(quan) ? quan : [];
  })
  .catch(() => {
    danhSachQuan = [];
  })
  .finally(taiDonHang);

nutTimDon.addEventListener("click", taiDonHang);
nutLamMoi.addEventListener("click", taiDonHang);
document
  .querySelector("#ap-dung-loc-ngay-don")
  .addEventListener("click", () => {
    if (
      thongKeTuNgay.value &&
      thongKeDenNgay.value &&
      thongKeTuNgay.value > thongKeDenNgay.value
    ) {
      const loi = "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.";
      theGioCaoDiem.textContent = loi;
      bieuDoDonTheoNgay.textContent = loi;
      return;
    }
    taiThongKe();
  });
document.querySelector("#xoa-loc-ngay-don").addEventListener("click", () => {
  thongKeTuNgay.value = "";
  thongKeDenNgay.value = "";
  taiThongKe();
});
oTuKhoaDon.addEventListener("keydown", (event) => {
  if (event.key === "Enter") taiDonHang();
});
oLocTrangThai.addEventListener("change", taiDonHang);
