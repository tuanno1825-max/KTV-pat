let chuDeHienTai = "Tất cả";
let sapXepHienTai = "moi-nhat";
let tuKhoaHienTai = "";
let thongTinNguoiDung = null;
let danhSachQuanKTV = [];

const feedDanhSach = document.querySelector("#feed-danh-sach");
const formDangBai = document.querySelector("#form-tao-bai");
const selectQuanLienQuan = document.querySelector("#quan-lien-quan-chon");
const oTimKiem = document.querySelector("#o-tim-kiem-bai");
const thongBaoDangBai = document.querySelector("#thong-bao-dang");
const widgetHoSo = document.querySelector("#widget-ho-so");
const widgetQuanHot = document.querySelector("#widget-quan-hot");

function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (kyTu) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[kyTu],
  );
}

function taoHtmlAvatar(url, ten, className, mucZoom) {
  const chuCai = escapeHtml((ten || "K").trim().charAt(0).toUpperCase());
  const zoom = Number.isFinite(Number(mucZoom))
    ? Math.min(2.2, Math.max(1, Number(mucZoom)))
    : 1.4;
  const duongDan =
    /^\/uploads\/avatars\/[0-9a-f-]{36}\.(?:jpg|png|webp)$/i.test(url || "")
      ? escapeHtml(url)
      : "";
  return `<div class="${className}">${duongDan ? `<img src="${duongDan}" alt="" loading="lazy" style="--avatar-zoom:${zoom}">` : chuCai || "K"}</div>`;
}

// Tính thời gian hiển thị tương đối (vd: 5 phút trước)
function thoiGianTuongDoi(dateStr) {
  const date = new Date(dateStr);
  const giay = Math.floor((Date.now() - date.getTime()) / 1000);
  if (giay < 60) return "Vừa xong";
  const phut = Math.floor(giay / 60);
  if (phut < 60) return `${phut} phút trước`;
  const gio = Math.floor(phut / 60);
  if (gio < 24) return `${gio} giờ trước`;
  const ngay = Math.floor(gio / 24);
  if (ngay < 30) return `${ngay} ngày trước`;
  return date.toLocaleDateString("vi-VN");
}

// Khởi tạo thông tin người dùng
async function khoiTaoNguoiDung() {
  try {
    const res = await fetch("/api/phien-khach-hang", { cache: "no-store" });
    if (!res.ok) return;
    const { daDangNhap, email, bietDanh, avatarUrl, avatarZoom } =
      await res.json();
    if (!daDangNhap || !email) {
      if (widgetHoSo) {
        widgetHoSo.innerHTML = `
          <div style="text-align: center; padding: 10px;">
            <p style="font-size: 0.9rem; color: #64748b; margin-bottom: 12px;">Đăng nhập để tham gia thảo luận và kết nối cùng cộng đồng!</p>
            <a href="/html/dangnhap.html" class="nut-dang-ky" style="display: block; text-align: center;">Đăng nhập ngay</a>
          </div>
        `;
      }
      return;
    }

    // Lấy chi tiết thông tin VIP và điểm tích lũy
    const resVip = await fetch("/api/hoan-tien/vip-trang-thai", {
      cache: "no-store",
    });
    let vipInfo = {};
    if (resVip.ok) {
      vipInfo = await resVip.json();
    }

    thongTinNguoiDung = {
      email,
      bietDanh: bietDanh || email.split("@")[0],
      avatarUrl: avatarUrl || "",
      avatarZoom: avatarZoom || 1.4,
      laVip: Boolean(vipInfo.vip),
      vipTrangThai: vipInfo.trangThai || "Chưa đăng ký",
    };

    if (widgetHoSo) {
      const badgeHtml = thongTinNguoiDung.laVip
        ? `<span class="huy-hieu-vip-lon">👑 VIP MEMBER</span>`
        : `<span class="huy-hieu-thuong">Thành viên KTV</span>`;

      widgetHoSo.innerHTML = `
        <div class="the-ho-so">
          ${taoHtmlAvatar(thongTinNguoiDung.avatarUrl, thongTinNguoiDung.bietDanh, "ho-so-avatar", thongTinNguoiDung.avatarZoom)}
          <div class="ho-so-ten">${escapeHtml(thongTinNguoiDung.bietDanh)}</div>
          <div class="ho-so-email">${escapeHtml(email)}</div>
          ${badgeHtml}
          <div class="ho-so-diem">
            <span>Đặc quyền:</span>
            <strong>${thongTinNguoiDung.laVip ? "Hoàn tiền theo chính sách VIP" : "Tích điểm"}</strong>
          </div>
          <a class="link-sua-ho-so" href="/html/tai-khoan.html#thong-tin-ca-nhan">Chỉnh sửa hồ sơ</a>
        </div>
      `;
    }
  } catch (error) {
    console.error("Lỗi khởi tạo thông tin người dùng:", error);
  }
}

// Tải danh sách các quán KTV để chọn tag và hiện sidebar
async function taiDanhSachQuan() {
  try {
    const res = await fetch("/api/quan-cong-khai");
    if (!res.ok) return;
    danhSachQuanKTV = await res.json();

    if (selectQuanLienQuan) {
      selectQuanLienQuan.innerHTML = `<option value="">-- Không gắn tag quán --</option>`;
      danhSachQuanKTV.forEach((quan) => {
        const opt = document.createElement("option");
        opt.value = quan.maQuan;
        opt.textContent = `${quan.ten} (${quan.khuVuc})`;
        selectQuanLienQuan.append(opt);
      });
    }

    if (widgetQuanHot) {
      widgetQuanHot.innerHTML = "";
      const topQuan = [...danhSachQuanKTV]
        .sort((a, b) => (b.diemTrungBinh || 5) - (a.diemTrungBinh || 5))
        .slice(0, 5);

      topQuan.forEach((quan) => {
        const item = document.createElement("a");
        item.href = `/html/datphong.html`;
        item.className = "quan-hot-item";
        const anhSrc = quan.anhQuan
          ? `../image/${quan.anhQuan}`
          : "../image/logo.png";
        item.innerHTML = `
          <img src="${anhSrc}" alt="${quan.ten}" class="quan-hot-anh" />
          <div class="quan-hot-chu">
            <span class="quan-hot-ten">${quan.ten}</span>
            <span class="quan-hot-sao">★ ${quan.diemTrungBinh ? quan.diemTrungBinh.toFixed(1) : "5.0"} (${quan.soDanhGia || 0} đánh giá)</span>
          </div>
        `;
        widgetQuanHot.append(item);
      });
    }
  } catch (e) {
    console.error("Lỗi tải danh sách quán:", e);
  }
}

// Render từng thẻ bài viết
function taoTheBaiViet(bai) {
  const the = document.createElement("article");
  the.className = "the-bai-viet";
  the.dataset.id = String(bai._id || "");

  const tenNguoiDang = bai.tenNguoiDang || "Karaoke Together";
  const avatar = taoHtmlAvatar(
    bai.avatarNguoiDang,
    tenNguoiDang,
    "avatar-bai-viet",
    bai.avatarZoomNguoiDang,
  );
  const badgeVip = bai.laVip
    ? `<span class="badge-vip-nho" title="Thành viên VIP">👑 VIP</span>`
    : "";

  let tagClass = "tag-giao-luu";
  if (bai.chuDe === "Rủ hát / Bắt kèo") tagClass = "tag-ru-hat";
  if (bai.chuDe === "Review quán") tagClass = "tag-review";
  if (bai.chuDe === "Hỏi đáp & Kinh nghiệm") tagClass = "tag-hoi-dap";

  const tagQuanHtml = bai.tenQuanLienQuan
    ? `<div class="tag-quan-lien-quan">📍 Tại: <strong>${escapeHtml(bai.tenQuanLienQuan)}</strong></div>`
    : "";

  const nutXoaHtml = bai.laTacGia
    ? `<button class="nut-xoa-bai" type="button" title="Xóa bài viết của bạn">🗑 Xóa</button>`
    : "";

  the.innerHTML = `
    <div class="dau-the-bai">
      <div class="nguoi-dang-thong-tin">
        ${avatar}
        <div class="ten-va-thoi-gian">
          <div class="hang-ten-va-vip">
            <span class="ten-nguoi-dang">${escapeHtml(tenNguoiDang)}</span>
            ${badgeVip}
          </div>
          <time class="thoi-gian-dang">${thoiGianTuongDoi(bai.createdAt)}</time>
        </div>
      </div>
      <div>
        <span class="nhan-chu-de-tag ${tagClass}">${escapeHtml(bai.chuDe)}</span>
      </div>
    </div>

    ${tagQuanHtml}

    <h2 class="tieu-de-bai-viet">${escapeHtml(bai.tieuDe)}</h2>
    <div class="noi-dung-bai-viet">${escapeHtml(bai.noiDung)}</div>

    <div class="thanh-tuong-tac">
      <button class="nut-tuong-tac nut-thich ${bai.daThich ? "da-thich" : ""}" type="button">
        <span class="icon-thich">${bai.daThich ? "❤️" : "🤍"}</span>
        <span class="so-dem-thich">${bai.soLuotThich || 0}</span> Thích
      </button>

      <button class="nut-tuong-tac nut-mo-binh-luan" type="button">
        💬 <span class="so-dem-binh-luan">${bai.soBinhLuan || 0}</span> Bình luận
      </button>

      ${nutXoaHtml}
    </div>

    <!-- Khung bình luận (ẩn/hiện khi bấm) -->
    <div class="khung-binh-luan" hidden>
      <div class="danh-sach-binh-luan-bai">
        ${renderDanhSachBinhLuan(bai.binhLuan)}
      </div>

      <form class="form-gui-binh-luan">
        <input type="text" class="input-binh-luan" placeholder="Viết phản hồi trao đổi cùng mọi người..." required maxlength="500" />
        <button type="submit" class="nut-gui-binh-luan">Gửi</button>
      </form>
    </div>
  `;

  // Sự kiện Thích bài viết
  const nutThich = the.querySelector(".nut-thich");
  nutThich.addEventListener("click", async () => {
    try {
      const res = await fetch(`/api/dien-dan/${bai._id}/thich`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message || "Vui lòng đăng nhập để thích.");

      nutThich.classList.toggle("da-thich", data.daThich);
      nutThich.querySelector(".icon-thich").textContent = data.daThich
        ? "❤️"
        : "🤍";
      nutThich.querySelector(".so-dem-thich").textContent = String(
        data.soLuotThich,
      );
    } catch (err) {
      alert(err.message);
    }
  });

  // Sự kiện Ẩn / Hiện khung bình luận
  const nutMoBinhLuan = the.querySelector(".nut-mo-binh-luan");
  const khungBinhLuan = the.querySelector(".khung-binh-luan");
  nutMoBinhLuan.addEventListener("click", () => {
    khungBinhLuan.hidden = !khungBinhLuan.hidden;
    if (!khungBinhLuan.hidden) {
      khungBinhLuan.querySelector(".input-binh-luan")?.focus();
    }
  });

  // Sự kiện gửi bình luận
  const formBinhLuan = the.querySelector(".form-gui-binh-luan");
  formBinhLuan.addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = formBinhLuan.querySelector(".input-binh-luan");
    const noiDung = input.value.trim();
    if (!noiDung) return;

    const nutGui = formBinhLuan.querySelector(".nut-gui-binh-luan");
    nutGui.disabled = true;

    try {
      const res = await fetch(`/api/dien-dan/${bai._id}/binh-luan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noiDung }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Không thể gửi bình luận.");

      input.value = "";
      bai.binhLuan.push(data.binhLuan);
      the.querySelector(".danh-sach-binh-luan-bai").innerHTML =
        renderDanhSachBinhLuan(bai.binhLuan);
      the.querySelector(".so-dem-binh-luan").textContent = String(
        bai.binhLuan.length,
      );
    } catch (err) {
      alert(err.message);
    } finally {
      nutGui.disabled = false;
    }
  });

  // Sự kiện Xóa bài
  const nutXoa = the.querySelector(".nut-xoa-bai");
  if (nutXoa) {
    nutXoa.addEventListener("click", async () => {
      if (!confirm("Bạn có chắc chắn muốn xóa bài viết này không?")) return;
      try {
        const res = await fetch(`/api/dien-dan/${bai._id}`, {
          method: "DELETE",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Không thể xóa bài.");
        the.remove();
      } catch (err) {
        alert(err.message);
      }
    });
  }

  return the;
}

function renderDanhSachBinhLuan(binhLuans) {
  if (!binhLuans || binhLuans.length === 0) {
    return `<div style="font-size: 0.82rem; color: #94a3b8; text-align: center; padding: 6px;">Chưa có bình luận nào. Hãy bắt đầu cuộc trò chuyện!</div>`;
  }
  return binhLuans
    .map((bl) => {
      const tenNguoiBinhLuan = bl.tenNguoiBinhLuan || "Karaoke Together";
      const avatar = taoHtmlAvatar(
        bl.avatarNguoiBinhLuan,
        tenNguoiBinhLuan,
        "avatar-binh-luan",
        bl.avatarZoomBinhLuan,
      );
      const badgeVip = bl.laVip
        ? `<span class="badge-vip-nho">👑 VIP</span>`
        : "";
      return `
        <div class="the-binh-luan-item">
          ${avatar}
          <div class="noi-dung-binh-luan-wrap">
            <div class="dau-binh-luan">
              <span class="ten-nguoi-binh-luan">${escapeHtml(tenNguoiBinhLuan)}</span>
              ${badgeVip}
              <time class="thoi-gian-binh-luan">${thoiGianTuongDoi(bl.createdAt)}</time>
            </div>
            <p class="chu-binh-luan">${escapeHtml(bl.noiDung)}</p>
          </div>
        </div>
      `;
    })
    .join("");
}

// Tải danh sách bài viết từ server
async function taiDanhSachBaiViet() {
  if (!feedDanhSach) return;
  feedDanhSach.innerHTML = `<div style="text-align: center; padding: 40px; color: #64748b;">Đang tải các bài viết từ cộng đồng...</div>`;

  try {
    const params = new URLSearchParams();
    if (chuDeHienTai !== "Tất cả") params.append("chuDe", chuDeHienTai);
    if (tuKhoaHienTai) params.append("tuKhoa", tuKhoaHienTai);
    if (sapXepHienTai) params.append("sapXep", sapXepHienTai);

    const res = await fetch(`/api/dien-dan?${params.toString()}`);
    if (!res.ok) throw new Error("Không thể kết nối máy chủ");
    const danhSach = await res.json();

    feedDanhSach.innerHTML = "";
    if (danhSach.length === 0) {
      feedDanhSach.innerHTML = `
        <div style="background: #fff; padding: 40px 20px; text-align: center; border-radius: 16px; border: 1px dashed #cbd5e1; color: #64748b;">
          <h3>Chưa có bài viết nào trong chủ đề này</h3>
          <p>Hãy là người đầu tiên chia sẻ cảm nhận, rủ bạn đi hát hoặc đặt câu hỏi nhé!</p>
        </div>
      `;
      return;
    }

    danhSach.forEach((bai) => {
      feedDanhSach.append(taoTheBaiViet(bai));
    });
  } catch (error) {
    feedDanhSach.innerHTML = `
      <div style="background: #fff; padding: 30px; text-align: center; border-radius: 16px; color: #ef4444;">
        Không thể tải bài viết cộng đồng. Vui lòng kiểm tra lại kết nối.
      </div>
    `;
  }
}

// Sự kiện đăng bài viết mới
formDangBai?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const tieuDe = document.querySelector("#tieu-de-moi").value.trim();
  const noiDung = document.querySelector("#noi-dung-moi").value.trim();
  const chuDe = document.querySelector("#chu-de-moi").value;
  const maQuanLienQuan = selectQuanLienQuan ? selectQuanLienQuan.value : "";
  const nutDang = formDangBai.querySelector(".nut-dang-bai");

  if (!tieuDe || !noiDung) return;

  nutDang.disabled = true;
  thongBaoDangBai.style.color = "#075c69";
  thongBaoDangBai.textContent = "Đang đăng bài...";

  try {
    const res = await fetch("/api/dien-dan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tieuDe, noiDung, chuDe, maQuanLienQuan }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Không thể đăng bài.");

    thongBaoDangBai.style.color = "#059669";
    thongBaoDangBai.textContent = "Đăng bài thành công!";
    formDangBai.reset();

    setTimeout(() => {
      thongBaoDangBai.textContent = "";
    }, 3000);

    await taiDanhSachBaiViet();
  } catch (error) {
    thongBaoDangBai.style.color = "#dc2626";
    thongBaoDangBai.textContent = error.message;
  } finally {
    nutDang.disabled = false;
  }
});

// Sự kiện chọn chủ đề bên sidebar
document.querySelectorAll(".nut-chu-de").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".nut-chu-de")
      .forEach((b) => b.classList.remove("dang-chon"));
    btn.classList.add("dang-chon");
    chuDeHienTai = btn.dataset.chuDe;
    taiDanhSachBaiViet();
  });
});

// Sự kiện chọn tab Mới nhất / Nổi bật
document.querySelectorAll(".nut-tab-feed").forEach((tab) => {
  tab.addEventListener("click", () => {
    document
      .querySelectorAll(".nut-tab-feed")
      .forEach((t) => t.classList.remove("dang-chon"));
    tab.classList.add("dang-chon");
    sapXepHienTai = tab.dataset.sapXep;
    taiDanhSachBaiViet();
  });
});

// Tìm kiếm bài viết realtime
let timerTimKiem = null;
oTimKiem?.addEventListener("input", (e) => {
  clearTimeout(timerTimKiem);
  timerTimKiem = setTimeout(() => {
    tuKhoaHienTai = e.target.value.trim();
    taiDanhSachBaiViet();
  }, 350);
});

// Khởi chạy khi load trang
khoiTaoNguoiDung();
taiDanhSachQuan();
taiDanhSachBaiViet();
