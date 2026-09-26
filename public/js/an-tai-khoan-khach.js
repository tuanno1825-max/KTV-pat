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
      khuVucTaiKhoan.classList.add("tai-khoan-da-dang-nhap");
      khuVucTaiKhoan.innerHTML = `
        <div class="cum-thong-bao">
          <button class="nut-menu-thong-bao" type="button" aria-label="Mở thông báo" aria-expanded="false" title="Thông báo">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"></path></svg>
            <span class="so-thong-bao" hidden>0</span>
          </button>
          <div class="danh-sach-thong-bao" hidden>Đang tải thông báo...</div>
        </div>
        <div class="menu-tai-khoan">
          <button class="nut-avatar" type="button" aria-label="Mở menu tài khoản" aria-expanded="false">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"></circle><path d="M4.5 21a7.5 7.5 0 0 1 15 0"></path></svg>
          </button>
          <div class="menu-tai-khoan-noi-dung" hidden>
            <a href="/html/tai-khoan.html#thong-tin-ca-nhan">Thông tin cá nhân</a>
            <a href="/html/tai-khoan.html#lich-su">Lịch sử đơn đặt</a>
            <a href="/html/tai-khoan.html#goi-vip">Quản lý gói VIP</a>
            <button class="nut-menu-dang-xuat" type="button">Đăng xuất</button>
          </div>
        </div>`;
      const nutAvatar = khuVucTaiKhoan.querySelector(".nut-avatar");
      const nutThongBao = khuVucTaiKhoan.querySelector(".nut-menu-thong-bao");
      const danhSachThongBao = khuVucTaiKhoan.querySelector(
        ".danh-sach-thong-bao",
      );
      const soThongBao = khuVucTaiKhoan.querySelector(".so-thong-bao");
      const menuAvatar = khuVucTaiKhoan.querySelector(
        ".menu-tai-khoan-noi-dung",
      );
      nutAvatar.addEventListener("click", () => {
        const dangMo = menuAvatar.hidden;
        danhSachThongBao.hidden = true;
        nutThongBao.setAttribute("aria-expanded", "false");
        menuAvatar.hidden = !dangMo;
        nutAvatar.setAttribute("aria-expanded", String(dangMo));
      });
      const taiThongBao = async () => {
        const phanHoiThongBao = await fetch("/api/hoan-tien/thong-bao", {
          credentials: "same-origin",
          cache: "no-store",
        });
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
        nutThongBao.setAttribute("aria-expanded", String(dangHien));
        menuAvatar.hidden = true;
        nutAvatar.setAttribute("aria-expanded", "false");
        if (!dangHien) return;
        try {
          await taiThongBao();
          await fetch("/api/hoan-tien/thong-bao/da-doc", {
            method: "PATCH",
            credentials: "same-origin",
          });
          soThongBao.hidden = true;
          danhSachThongBao
            .querySelectorAll(".chua-doc")
            .forEach((item) => item.classList.remove("chua-doc"));
        } catch {
          danhSachThongBao.textContent =
            "Không tải được thông báo. Vui lòng thử lại.";
        }
      });
      taiThongBao().catch(() => {
        danhSachThongBao.textContent = "Không tải được thông báo.";
      });
      window.setInterval(() => {
        if (document.visibilityState === "visible")
          taiThongBao().catch(() => {});
      }, 30000);
      document.addEventListener("click", (event) => {
        if (!khuVucTaiKhoan.contains(event.target)) {
          danhSachThongBao.hidden = true;
          menuAvatar.hidden = true;
          nutThongBao.setAttribute("aria-expanded", "false");
          nutAvatar.setAttribute("aria-expanded", "false");
        }
      });
      khuVucTaiKhoan
        .querySelector(".nut-menu-dang-xuat")
        .addEventListener("click", async (event) => {
          const nut = event.currentTarget;
          nut.disabled = true;
          try {
            const ketQua = await fetch("/api/dang-xuat", {
              method: "POST",
              credentials: "same-origin",
            });
            if (!ketQua.ok)
              throw new Error("Đăng xuất chưa thành công. Vui lòng thử lại.");
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
