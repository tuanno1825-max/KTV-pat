const tbody = document.querySelector("#danh-sach");
const thongBao = document.querySelector("#thong-bao");
const lichSu = document.querySelector("#lich-su");
const lichSuMoTa = document.querySelector("#lich-su-mo-ta");
const yeuCauMatKhau = document.querySelector("#yeu-cau-mat-khau");
const thongBaoMatKhau = document.querySelector("#thong-bao-mat-khau");
const hopThoaiMatKhau = document.querySelector("#mat-khau-tam-dialog");
const thongDiepMatKhau = document.querySelector("#mat-khau-tam-thong-diep");
const giaTriMatKhau = document.querySelector("#mat-khau-tam-gia-tri");
const trangThaiSaoChep = document.querySelector("#mat-khau-tam-trang-thai");

const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char],
  );

async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Yêu cầu thất bại.");
  return data;
}

function taoDongKhach(user, index) {
  const stats = user.thongKeDonHang;
  const vip = user.laVip
    ? `<span class="the-vip">VIP · ${user.vipHetHan ? `đến ${new Date(user.vipHetHan).toLocaleDateString("vi-VN")}` : "không thời hạn"}</span>`
    : '<span class="the-thuong">Tiêu chuẩn</span>';
  const nutVip = user.laVip
    ? '<button class="nut-hanh-dong" data-act="thu-hoi-vip">Thu hồi VIP</button>'
    : '<button class="nut-hanh-dong" data-act="cap-vip">Cấp VIP 1 tháng</button>';
  return `<tr>
    <td>${index + 1}</td>
    <td><strong>${esc(user.maKhachHang || "—")}</strong></td>
    <td><strong>${esc(user.hoTen)}</strong><br><span>${esc(user.email)}</span>${user.canhBao ? `<small>${esc(user.canhBao)}</small>` : ""}</td>
    <td>${esc(user.soDienThoai || "Chưa cập nhật")}</td>
    <td><strong>${Number(user.diemTichLuy || 0)}</strong></td><td>${vip}</td>
    <td>${stats.tongDon}</td><td>${stats.thanhCong}</td><td>${stats.khongDen}</td><td>${stats.daHuy}</td><td>${stats.choXuLy}</td><td>${stats.thatBai}</td>
    <td><button class="nut-hanh-dong" data-act="lich-su">Lịch sử</button><button class="nut-hanh-dong" data-act="cong-diem">Cộng điểm</button>${nutVip}<button class="nut-hanh-dong" data-act="dat-lai-mat-khau">Đổi mật khẩu</button><button class="nut-hanh-dong" data-act="xoa-tai-khoan">Xóa tài khoản</button></td>
  </tr>`;
}

async function taiDanhSach() {
  try {
    thongBao.textContent = "Đang tải danh sách tài khoản...";
    const tuKhoa = document.querySelector("#tu-khoa").value.trim();
    const users = await api(
      `/api/admin/tai-khoan?${new URLSearchParams({ tuKhoa })}`,
    );
    tbody.innerHTML = users.length
      ? users.map((user, index) => taoDongKhach(user, index)).join("")
      : '<tr><td colspan="13">Không tìm thấy tài khoản phù hợp.</td></tr>';
    thongBao.textContent = `${users.length} tài khoản`;
  } catch (error) {
    thongBao.textContent = error.message;
    if (/đăng nhập|quyền/i.test(error.message))
      location.href = "/dangnhap-private";
  }
}

async function taiLichSu(email) {
  const donHang = await api(
    `/api/admin/tai-khoan/${encodeURIComponent(email)}/lich-su`,
  );
  lichSuMoTa.textContent = `Lịch sử đặt phòng: ${email}`;
  lichSu.innerHTML = donHang.length
    ? `<div class="bang-wrap"><table class="bang-tai-khoan"><thead><tr><th>STT</th><th>Mã đơn</th><th>Quán</th><th>Ngày đặt</th><th>Trạng thái</th></tr></thead><tbody>${donHang.map((don, index) => `<tr><td>${index + 1}</td><td>${esc(don.maDon)}</td><td>${esc(don.tenQuan)}</td><td>${don.thoiGianDat ? new Date(don.thoiGianDat).toLocaleString("vi-VN") : "—"}</td><td>${esc(don.trangThai)}</td></tr>`).join("")}</tbody></table></div>`
    : "<p>Khách chưa có lịch sử đặt phòng.</p>";
}

async function taiYeuCauMatKhau() {
  if (!yeuCauMatKhau) return;
  try {
    const requests = await api("/api/admin/yeu-cau-dat-lai-mat-khau");
    yeuCauMatKhau.innerHTML = requests.length
      ? requests
          .map(
            (request) => `<tr>
              <td>${esc(request.hoTen)}<br><small>${esc(request.maKhachHang || "")}</small></td>
              <td>${esc(request.email)}</td>
              <td>${esc(request.soDienThoai || "Chưa cập nhật")}</td>
              <td>${new Date(request.createdAt).toLocaleString("vi-VN")}</td>
              <td><button class="nut-hanh-dong" data-reset-email="${esc(request.email)}">Đã xác minh, cấp mật khẩu</button></td>
            </tr>`,
          )
          .join("")
      : '<tr><td colspan="4">Không có yêu cầu đang chờ.</td></tr>';
  } catch (error) {
    yeuCauMatKhau.innerHTML = `<tr><td colspan="4">${esc(error.message)}</td></tr>`;
  }
}

async function datLaiMatKhau(email) {
  const result = await api(
    `/api/admin/tai-khoan/${encodeURIComponent(email)}/dat-lai-mat-khau`,
    { method: "POST" },
  );
  thongDiepMatKhau.textContent = result.message;
  giaTriMatKhau.textContent = result.matKhauTam;
  trangThaiSaoChep.textContent = "";
  hopThoaiMatKhau.showModal();
  if (thongBaoMatKhau) {
    thongBaoMatKhau.textContent =
      "Mật khẩu tạm đã được tạo và chỉ hiển thị một lần.";
  }
  await taiYeuCauMatKhau();
}

document
  .querySelector("#sao-chep-mat-khau-tam")
  .addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(giaTriMatKhau.textContent);
      trangThaiSaoChep.textContent = "Đã sao chép mật khẩu tạm.";
    } catch {
      const inputTam = document.createElement("textarea");
      inputTam.value = giaTriMatKhau.textContent;
      inputTam.setAttribute("readonly", "");
      inputTam.style.position = "fixed";
      inputTam.style.opacity = "0";
      document.body.append(inputTam);
      inputTam.select();
      const saoChepThanhCong = document.execCommand("copy");
      inputTam.remove();
      trangThaiSaoChep.textContent = saoChepThanhCong
        ? "Đã sao chép mật khẩu tạm."
        : "Không thể sao chép tự động. Vui lòng chọn và sao chép mật khẩu.";
    }
  });

document.querySelector("#dong-mat-khau-tam").addEventListener("click", () => {
  hopThoaiMatKhau.close();
});

hopThoaiMatKhau.addEventListener("close", () => {
  giaTriMatKhau.textContent = "";
  thongDiepMatKhau.textContent = "";
  trangThaiSaoChep.textContent = "";
});

tbody.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-act]");
  if (!button) return;
  const row = button.closest("tr");
  const email = row.querySelector("td:nth-child(3) span").textContent;
  try {
    if (button.dataset.act === "lich-su") return await taiLichSu(email);
    if (button.dataset.act === "dat-lai-mat-khau") {
      if (!window.confirm(`Đổi mật khẩu cho ${email}?`)) return;
      button.disabled = true;
      await datLaiMatKhau(email);
      return;
    }

    let body = "{}";
    if (button.dataset.act === "cong-diem") {
      const nhapDiem = window.prompt(
        `Nhập số điểm muốn cộng cho ${email} (1–1.000.000):`,
        "100",
      );
      if (nhapDiem === null) return;
      const soDiem = Number(nhapDiem.trim());
      if (!Number.isSafeInteger(soDiem) || soDiem < 1 || soDiem > 1000000) {
        window.alert("Số điểm phải là số nguyên từ 1 đến 1.000.000.");
        return;
      }
      body = JSON.stringify({ soDiem });
      const diemHienTai = Number(row.children[4].textContent) || 0;
      const datVip = diemHienTai + soDiem >= 600;
      const xacNhan = datVip
        ? `Cộng ${soDiem} điểm cho ${email}? Khách đạt mốc 600 điểm nên sẽ được cấp VIP 1 tháng và điểm được đặt lại.`
        : `Cộng ${soDiem} điểm cho ${email}?`;
      if (!window.confirm(xacNhan)) return;
    }

    const confirmMessage = {
      "cap-vip": `Cấp VIP 1 tháng cho ${email}?`,
      "thu-hoi-vip": `Thu hồi VIP của ${email}?`,
      "xoa-tai-khoan": `Xóa tài khoản ${email}?\n\nHồ sơ, thông báo, đánh giá, bài viết và bình luận của khách sẽ bị xóa. Lịch sử đặt phòng và hoàn tiền vẫn được giữ cho quản trị nhưng được gỡ liên kết với email. Khách sẽ không thể đăng nhập nữa.`,
    }[button.dataset.act];
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    button.disabled = true;
    const endpoint =
      button.dataset.act === "xoa-tai-khoan"
        ? `/api/admin/tai-khoan/${encodeURIComponent(email)}`
        : `/api/admin/tai-khoan/${encodeURIComponent(email)}/${button.dataset.act}`;
    const result = await api(endpoint, {
      method: button.dataset.act === "xoa-tai-khoan" ? "DELETE" : "POST",
      body,
    });
    thongBao.textContent = result.message;
    await taiDanhSach();
  } catch (error) {
    thongBao.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

yeuCauMatKhau?.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-reset-email]");
  if (!button) return;
  const email = button.dataset.resetEmail;
  if (
    !window.confirm(`Bạn đã xác minh khách ${email} và muốn cấp mật khẩu tạm?`)
  )
    return;
  button.disabled = true;
  try {
    await datLaiMatKhau(email);
  } catch (error) {
    thongBaoMatKhau.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

document.querySelector("#tim-kiem").addEventListener("click", taiDanhSach);
document.querySelector("#tu-khoa").addEventListener("keydown", (event) => {
  if (event.key === "Enter") taiDanhSach();
});
taiDanhSach();
taiYeuCauMatKhau();
