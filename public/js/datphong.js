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
try {
  const theoDoiDaLuu = JSON.parse(sessionStorage.getItem("theoDoiDatPhong") || "null");
  maDonDangTheoDoi = theoDoiDaLuu?.maDon || "";
  soDienThoaiTheoDoi = theoDoiDaLuu?.soDienThoai || "";
} catch {}
const nutDongBieuMau = document.querySelector("#dong-bieu-mau");
const moTaBieuMau = document.querySelector(".mo-ta-bieu-mau");
const giaQuanChonElement = document.querySelector("#gia-quan-chon");
const tieuDeDatPhong = document.querySelector("#tieu-de-dat-phong");

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
  if (don.trangThai === "Đã xác nhận")
    return "Yêu cầu đã được xác nhận. Vui lòng đợi ít phút để cộng tác viên liên hệ.";
  if (don.trangThai === "Khách đã chấp nhận đề xuất")
    return `Bạn đã chấp nhận quán đề xuất. Mã đơn mới: ${don.maDonTiepTheo}.`;
  if (don.trangThai === "Khách từ chối đề xuất")
    return "Bạn đã bỏ qua quán được đề xuất. Nhân viên sẽ tìm phương án khác nếu có.";
  if (don.trangThai === "Khách đã hủy đặt phòng")
    return "Bạn đã hủy đặt phòng.";
  return `Yêu cầu ${don.maDon} đang chờ nhân viên xử lý. Trang sẽ tự cập nhật khi có phản hồi.`;
}

async function capNhatPhanHoiKhach() {
  if (!maDonDangTheoDoi) return;
  try {
    const qs = new URLSearchParams({
      maDon: maDonDangTheoDoi,
      soDienThoai: soDienThoaiTheoDoi,
    });
    const response = await fetch(`/api/don-hang/tra-cuu?${qs}`);
    if (!response.ok) return;
    const don = await response.json();
    thongBaoDatPhong.textContent = moTaPhanHoiKhach(don);
    if (don.trangThai !== trangThaiDaHien) {
      trangThaiDaHien = don.trangThai;
      khuVucPhanHoiDeXuat.replaceChildren();
      if (don.trangThai === "Đề xuất quán mới") {
        lopPhu.classList.add("cho-phan-hoi-de-xuat");
        lopPhu.hidden = false;
        document.body.classList.add("khoa-cuon");
        nutDongBieuMau.hidden = true;
        bieuMauDatPhong.hidden = true;
        giaQuanChonElement.hidden = true;
        tieuDeDatPhong.firstChild.textContent = `Quán mới được đề xuất cho đơn ${don.maDon}`;
        tenQuanChon.textContent = "";
        moTaBieuMau.textContent = `Nhân viên đề xuất ${don.tenQuanDeXuat}. Địa chỉ: ${don.diaChiDeXuat || "Chưa có thông tin địa chỉ"}. Vui lòng chọn một phương án để đơn hàng được cập nhật.`;
        const taoNutPhanHoi = (nhan, duLieu) => {
          const nut = document.createElement("button");
          nut.type = "button";
          nut.className = "nut-phan-hoi-de-xuat";
          nut.textContent = nhan;
          nut.addEventListener("click", async () => {
            nut.disabled = true;
            try {
              const phanHoi = await fetch("/api/don-hang/phan-hoi", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  maDon: maDonDangTheoDoi,
                  soDienThoai: soDienThoaiTheoDoi,
                  ...duLieu,
                }),
              });
              const ketQua = await phanHoi.json();
              if (!phanHoi.ok)
                throw new Error(ketQua.message || "Không thể gửi phản hồi.");
              if (duLieu.chapNhan && ketQua.maDonMoi)
                maDonDangTheoDoi = ketQua.maDonMoi;
              if (duLieu.chapNhan && ketQua.maDonMoi) {
                sessionStorage.setItem("theoDoiDatPhong", JSON.stringify({ maDon: maDonDangTheoDoi, soDienThoai: soDienThoaiTheoDoi }));
              } else {
                sessionStorage.removeItem("theoDoiDatPhong");
                maDonDangTheoDoi = "";
                soDienThoaiTheoDoi = "";
              }
              thongBaoDatPhong.textContent = duLieu.chapNhan
                ? `${ketQua.message} Mã đơn mới: ${ketQua.maDonMoi}.`
                : ketQua.message;
              lopPhu.classList.remove("cho-phan-hoi-de-xuat");
              lopPhu.hidden = true;
              document.body.classList.remove("khoa-cuon");
              nutDongBieuMau.hidden = false;
              bieuMauDatPhong.hidden = false;
              giaQuanChonElement.hidden = false;
              tieuDeDatPhong.firstChild.textContent = "Đặt phòng tại ";
              moTaBieuMau.textContent = "Điền thông tin để quán chuẩn bị phòng cho bạn.";
              khuVucPhanHoiDeXuat.replaceChildren();
              trangThaiDaHien = "";
              if (duLieu.chapNhan) await capNhatPhanHoiKhach();
            } catch (error) {
              thongBaoDatPhong.textContent = error.message;
              nut.disabled = false;
            }
          });
          khuVucPhanHoiDeXuat.append(nut);
        };
        taoNutPhanHoi("Chấp nhận quán", { chapNhan: true });
        taoNutPhanHoi("Hủy đặt phòng", { chapNhan: false, hanhDong: "huy" });
      } else if (trangThaiDaHien === "Đề xuất quán mới") {
        lopPhu.classList.remove("cho-phan-hoi-de-xuat");
        lopPhu.hidden = true;
        document.body.classList.remove("khoa-cuon");
        nutDongBieuMau.hidden = false;
        bieuMauDatPhong.hidden = false;
        giaQuanChonElement.hidden = false;
        tieuDeDatPhong.firstChild.textContent = "Đặt phòng tại ";
        moTaBieuMau.textContent = "Điền thông tin để quán chuẩn bị phòng cho bạn.";
      }
    }
    if (
      ["Đặt phòng thành công", "Khách đã chấp nhận đề xuất"].includes(
        don.trangThai,
      ) &&
      boDemTheoDoi
    ) {
      clearInterval(boDemTheoDoi);
      boDemTheoDoi = null;
      sessionStorage.removeItem("theoDoiDatPhong");
    }
  } catch {}
}

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
    <div class="hang-danh-gia">
      <span class="sao-danh-gia">★ ${quan.diemTrungBinh ? Number(quan.diemTrungBinh).toFixed(1) : "5.0"}</span>
      <span class="so-luot-danh-gia">(${Number(quan.soDanhGia || 0)} đánh giá)</span>
      <button type="button" class="nut-mo-danh-gia" data-ma-quan="${quan.maQuan}" data-ten-quan="${quan.ten}">
        ⭐ Xem đánh giá
      </button>
    </div>
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
  if (lopPhu.classList.contains("cho-phan-hoi-de-xuat")) return;
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
  const nutDanhGia = suKien.target.closest(".nut-mo-danh-gia");
  if (nutDanhGia) {
    moModalDanhGia(nutDanhGia.dataset.maQuan, nutDanhGia.dataset.tenQuan);
    return;
  }
  const nutDatPhong = suKien.target.closest(".nut-dat-phong");
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
    if (!phanHoi.ok)
      throw new Error(ketQua.message || "Không thể gửi yêu cầu.");
    maDonDangTheoDoi = ketQua.maDon;
    soDienThoaiTheoDoi = bieuMauDatPhong.elements.soDienThoai.value.trim();
    sessionStorage.setItem("theoDoiDatPhong", JSON.stringify({ maDon: maDonDangTheoDoi, soDienThoai: soDienThoaiTheoDoi }));
    thongBaoDatPhong.textContent = `${ketQua.message} Mã đơn: ${ketQua.maDon}. Đang chờ nhân viên phản hồi...`;
    bieuMauDatPhong.reset();
    boDemTheoDoi = setInterval(capNhatPhanHoiKhach, 5000);
  } catch (error) {
    thongBaoDatPhong.textContent =
      error.message || "Không thể gửi yêu cầu, vui lòng thử lại.";
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
if (maDonDangTheoDoi && soDienThoaiTheoDoi) {
  capNhatPhanHoiKhach();
  boDemTheoDoi = setInterval(capNhatPhanHoiKhach, 5000);
}

// --- LOGIC ĐÁNH GIÁ VÀ NHẬN XÉT QUÁN ---
const lopPhuDanhGia = document.querySelector("#lop-phu-danh-gia");
const dongModalDanhGiaBtn = document.querySelector("#dong-modal-danh-gia");
const tenQuanDanhGiaEl = document.querySelector("#ten-quan-danh-gia");
const diemSoToEl = document.querySelector("#diem-so-to");
const saoLonHienThiEl = document.querySelector("#sao-lon-hien-thi");
const tongLuotDanhGiaEl = document.querySelector("#tong-luot-danh-gia");
const cotPhanBoSaoEl = document.querySelector("#cot-phan-bo-sao");
const diemAmThanhEl = document.querySelector("#diem-am-thanh");
const diemAnhSangEl = document.querySelector("#diem-anh-sang");
const diemPhucVuEl = document.querySelector("#diem-phuc-vu");
const diemGiaCaEl = document.querySelector("#diem-gia-ca");
const bieuMauDanhGia = document.querySelector("#bieu-mau-danh-gia");
const saoChonTuongTacEl = document.querySelector("#sao-chon-tuong-tac");
const chuSoSaoChonEl = document.querySelector("#chu-so-sao-chon");
const thongBaoDanhGiaEl = document.querySelector("#thong-bao-danh-gia");
const danhSachNhanXetEl = document.querySelector("#danh-sach-nhan-xet");
const demNhanXetEl = document.querySelector("#dem-nhan-xet");

let maQuanDangXemDanhGia = "";
let tenQuanDangXemDanhGia = "";
let soSaoChonHienTai = 5;

const moTaSao = {
  1: "1 sao (Tệ)",
  2: "2 sao (Chưa hài lòng)",
  3: "3 sao (Bình thường)",
  4: "4 sao (Hài lòng)",
  5: "5 sao (Tuyệt vời)",
};

function capNhatGiaoDienChonSao(so) {
  soSaoChonHienTai = so;
  if (chuSoSaoChonEl) chuSoSaoChonEl.textContent = moTaSao[so] || `${so} sao`;
  if (saoChonTuongTacEl) {
    saoChonTuongTacEl.querySelectorAll(".sao-item").forEach((el) => {
      const val = Number(el.dataset.sao);
      el.classList.toggle("sang", val <= so);
    });
  }
}

saoChonTuongTacEl?.addEventListener("click", (e) => {
  const item = e.target.closest(".sao-item");
  if (item) {
    capNhatGiaoDienChonSao(Number(item.dataset.sao));
  }
});

function taoSaoText(diem) {
  const d = Math.round(Number(diem) || 5);
  return (
    "★".repeat(Math.max(1, Math.min(5, d))) +
    "☆".repeat(Math.max(0, 5 - Math.max(1, Math.min(5, d))))
  );
}

async function moModalDanhGia(maQuan, tenQuan) {
  maQuanDangXemDanhGia = maQuan;
  tenQuanDangXemDanhGia = tenQuan;
  if (tenQuanDanhGiaEl) tenQuanDanhGiaEl.textContent = tenQuan;
  if (thongBaoDanhGiaEl) {
    thongBaoDanhGiaEl.textContent = "";
    thongBaoDanhGiaEl.style.color = "";
  }
  capNhatGiaoDienChonSao(5);
  if (bieuMauDanhGia) bieuMauDanhGia.reset();

  if (lopPhuDanhGia) lopPhuDanhGia.hidden = false;
  document.body.classList.add("khoa-cuon");

  if (danhSachNhanXetEl) {
    danhSachNhanXetEl.innerHTML = `<div style="text-align: center; color: #64748b; padding: 20px;">Đang tải đánh giá...</div>`;
  }

  await taiDuLieuDanhGia();
}

function dongModalDanhGia() {
  if (lopPhuDanhGia) lopPhuDanhGia.hidden = true;
  document.body.classList.remove("khoa-cuon");
}

async function taiDuLieuDanhGia() {
  try {
    const res = await fetch(`/api/quan/${maQuanDangXemDanhGia}/danh-gia`);
    if (!res.ok) throw new Error("Không thể tải đánh giá");
    const { danhSach, thongKe } = await res.json();

    const dtb = thongKe.diemTrungBinh
      ? thongKe.diemTrungBinh.toFixed(1)
      : "5.0";
    if (diemSoToEl) diemSoToEl.textContent = dtb;
    if (saoLonHienThiEl) saoLonHienThiEl.textContent = taoSaoText(dtb);
    if (tongLuotDanhGiaEl)
      tongLuotDanhGiaEl.textContent = `${thongKe.tongDanhGia} đánh giá`;
    if (demNhanXetEl) demNhanXetEl.textContent = String(danhSach.length);

    if (diemAmThanhEl)
      diemAmThanhEl.textContent = thongKe.diemChiTiet?.amThanh
        ? thongKe.diemChiTiet.amThanh.toFixed(1)
        : dtb;
    if (diemAnhSangEl)
      diemAnhSangEl.textContent = thongKe.diemChiTiet?.anhSang
        ? thongKe.diemChiTiet.anhSang.toFixed(1)
        : dtb;
    if (diemPhucVuEl)
      diemPhucVuEl.textContent = thongKe.diemChiTiet?.phucVu
        ? thongKe.diemChiTiet.phucVu.toFixed(1)
        : dtb;
    if (diemGiaCaEl)
      diemGiaCaEl.textContent = thongKe.diemChiTiet?.giaCa
        ? thongKe.diemChiTiet.giaCa.toFixed(1)
        : dtb;

    if (cotPhanBoSaoEl) {
      cotPhanBoSaoEl.innerHTML = "";
      [5, 4, 3, 2, 1].forEach((sao) => {
        const soLuong = thongKe.phanBoSao?.[sao] || 0;
        const phanTram =
          thongKe.tongDanhGia > 0 ? (soLuong / thongKe.tongDanhGia) * 100 : 0;
        const row = document.createElement("div");
        row.className = "dong-phan-bo";
        row.innerHTML = `
          <span>${sao} ★</span>
          <div class="thanh-phan-bo-nen">
            <div class="thanh-phan-bo-chay" style="width: ${phanTram}%"></div>
          </div>
          <span>${soLuong}</span>
        `;
        cotPhanBoSaoEl.append(row);
      });
    }

    if (danhSachNhanXetEl) {
      danhSachNhanXetEl.innerHTML = "";
      if (danhSach.length === 0) {
        danhSachNhanXetEl.innerHTML = `
          <div style="text-align: center; color: #64748b; padding: 24px; background: #f8fafc; border-radius: 10px;">
            Chưa có đánh giá nào cho quán này. Hãy là người đầu tiên chia sẻ cảm nhận nhé!
          </div>
        `;
        return;
      }

      danhSach.forEach((dg) => {
        const item = document.createElement("article");
        item.className = "the-nhan-xet-item";
        const chuCaiDau = (dg.tenKhach || "K").charAt(0).toUpperCase();
        const ngay = new Date(dg.createdAt).toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
        const huyHieuDat = dg.daTungDatPhong
          ? `<span class="huy-hieu-dat-phong" title="Khách đã từng đặt phòng thành công qua hệ thống">✓ Đã trải nghiệm thực tế</span>`
          : "";

        item.innerHTML = `
          <div class="hang-dau-nhan-xet">
            <div class="khach-nhan-xet">
              <div class="avatar-chu-cai">${chuCaiDau}</div>
              <div>
                <div class="ten-khach-danh-gia">${dg.tenKhach} ${huyHieuDat}</div>
                <time class="ngay-danh-gia">${ngay}</time>
              </div>
            </div>
            <div class="sao-nhan-xet-khach">${"★".repeat(dg.soSao)}${"☆".repeat(5 - dg.soSao)}</div>
          </div>
          <p class="noi-dung-nhan-xet-khach">${dg.noiDung}</p>
        `;
        danhSachNhanXetEl.append(item);
      });
    }
  } catch (err) {
    if (danhSachNhanXetEl) {
      danhSachNhanXetEl.innerHTML = `<div style="color: #ef4444; text-align: center;">Không thể tải danh sách nhận xét.</div>`;
    }
  }
}

bieuMauDanhGia?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const nutGui = bieuMauDanhGia.querySelector(".nut-gui-danh-gia");
  const noiDung = document.querySelector("#noi-dung-danh-gia").value.trim();
  const tieuChi = {
    amThanh: Number(document.querySelector("#tc-am-thanh").value),
    anhSang: Number(document.querySelector("#tc-anh-sang").value),
    phucVu: Number(document.querySelector("#tc-phuc-vu").value),
    giaCa: Number(document.querySelector("#tc-gia-ca").value),
  };

  nutGui.disabled = true;
  thongBaoDanhGiaEl.style.color = "#075c69";
  thongBaoDanhGiaEl.textContent = "Đang gửi đánh giá...";

  try {
    const res = await fetch(`/api/quan/${maQuanDangXemDanhGia}/danh-gia`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        soSao: soSaoChonHienTai,
        noiDung,
        tieuChi,
      }),
    });
    const ketQua = await res.json();
    if (!res.ok) throw new Error(ketQua.message || "Gửi đánh giá thất bại.");

    thongBaoDanhGiaEl.style.color = "#059669";
    thongBaoDanhGiaEl.textContent = ketQua.message;
    document.querySelector("#noi-dung-danh-gia").value = "";

    await taiDuLieuDanhGia();
    await taiDanhSachQuan();
  } catch (error) {
    thongBaoDanhGiaEl.style.color = "#dc2626";
    thongBaoDanhGiaEl.textContent = error.message;
  } finally {
    nutGui.disabled = false;
  }
});

dongModalDanhGiaBtn?.addEventListener("click", dongModalDanhGia);
lopPhuDanhGia?.addEventListener("click", (e) => {
  if (e.target === lopPhuDanhGia) dongModalDanhGia();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && lopPhuDanhGia && !lopPhuDanhGia.hidden)
    dongModalDanhGia();
});
