async function capNhatTaiKhoanKhach() {
  const khuVucTaiKhoan = document.querySelector(".tai-khoan");
  if (!khuVucTaiKhoan) return;

  try {
    const phanHoi = await fetch("/api/phien-khach-hang", {
      credentials: "same-origin",
      cache: "no-store",
    });
    if (!phanHoi.ok) return;

    const { daDangNhap } = await phanHoi.json();
    if (daDangNhap) {
      khuVucTaiKhoan.classList.add("menu-tai-khoan");
      khuVucTaiKhoan.innerHTML = `
        <button class="nut-avatar" type="button" aria-label="Mở menu tài khoản" aria-expanded="false">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"></circle><path d="M4.5 21a7.5 7.5 0 0 1 15 0"></path></svg>
        </button>
        <div class="menu-tai-khoan-noi-dung">
          <button class="nut-menu-thong-bao" type="button">Thông báo <span class="so-thong-bao" hidden>0</span></button>
          <div class="danh-sach-thong-bao" hidden>Đang tải thông báo...</div>
          <a href="/html/tai-khoan.html#lich-su">Lịch sử đơn đặt</a>
          <a href="/html/tai-khoan.html#goi-vip">Quản lý gói VIP</a>
          <button class="nut-menu-dang-xuat" type="button">Đăng xuất</button>
        </div>`;
      const nutAvatar = khuVucTaiKhoan.querySelector(".nut-avatar");
      const dongMenu = () => {
        khuVucTaiKhoan.classList.remove("dang-mo");
        nutAvatar.setAttribute("aria-expanded", "false");
      };
      nutAvatar.addEventListener("click", () => {
        const dangMo = khuVucTaiKhoan.classList.toggle("dang-mo");
        nutAvatar.setAttribute("aria-expanded", String(dangMo));
      });
      const nutThongBao = khuVucTaiKhoan.querySelector(".nut-menu-thong-bao");
      const danhSachThongBao = khuVucTaiKhoan.querySelector(".danh-sach-thong-bao");
      const soThongBao = khuVucTaiKhoan.querySelector(".so-thong-bao");
      const taiThongBao = async () => {
        const phanHoiThongBao = await fetch("/api/hoan-tien/thong-bao", { credentials: "same-origin", cache: "no-store" });
        if (!phanHoiThongBao.ok) throw new Error("Không tải được thông báo.");
        const thongBaos = await phanHoiThongBao.json();
        const chuaDoc = thongBaos.filter((item) => !item.daDoc).length;
        soThongBao.textContent = String(chuaDoc);
        soThongBao.hidden = chuaDoc === 0;
        danhSachThongBao.replaceChildren();
        if (!thongBaos.length) {
          danhSachThongBao.textContent = "Chưa có thông báo mới.";
        } else {
          thongBaos.forEach((item) => {
            const muc = document.createElement("div");
            muc.className = `muc-thong-bao${item.daDoc ? "" : " chua-doc"}`;
            muc.textContent = item.noiDung;
            const ngay = document.createElement("time");
            ngay.className = "thoi-gian-thong-bao";
            ngay.textContent = new Date(item.createdAt).toLocaleString("vi-VN");
            muc.append(ngay);
            danhSachThongBao.append(muc);
          });
        }
      };
      nutThongBao.addEventListener("click", async () => {
        const dangHien = danhSachThongBao.hidden;
        danhSachThongBao.hidden = !dangHien;
        if (!dangHien) return;
        try {
          await taiThongBao();
          await fetch("/api/hoan-tien/thong-bao/da-doc", { method: "PATCH", credentials: "same-origin" });
          soThongBao.hidden = true;
          danhSachThongBao.querySelectorAll(".chua-doc").forEach((item) => item.classList.remove("chua-doc"));
        } catch {
          danhSachThongBao.textContent = "Không tải được thông báo. Vui lòng thử lại.";
        }
      });
      taiThongBao().catch(() => {
        danhSachThongBao.textContent = "Không tải được thông báo.";
      });
      window.setInterval(() => {
        if (document.visibilityState === "visible") taiThongBao().catch(() => {});
      }, 30000);
      document.addEventListener("click", (event) => {
        if (!khuVucTaiKhoan.contains(event.target)) dongMenu();
      });
      khuVucTaiKhoan.querySelector(".nut-menu-dang-xuat").addEventListener("click", async (event) => {
        const nut = event.currentTarget;
        nut.disabled = true;
        try {
          const ketQua = await fetch("/api/dang-xuat", { method: "POST", credentials: "same-origin" });
          if (!ketQua.ok) throw new Error("Đăng xuất chưa thành công. Vui lòng thử lại.");
          window.location.assign("/");
        } catch (error) {
          nut.disabled = false;
          nut.textContent = error.message;
        }
      });
    }
  } catch (error) {
    console.error("Không thể kiểm tra phiên khách hàng:", error);
  }
}

capNhatTaiKhoanKhach();
