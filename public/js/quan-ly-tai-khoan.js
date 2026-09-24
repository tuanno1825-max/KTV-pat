const tbody = document.querySelector("#danh-sach");
const thongBao = document.querySelector("#thong-bao");
const lichSu = document.querySelector("#lich-su");
const lichSuMoTa = document.querySelector("#lich-su-mo-ta");

const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char]));

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

function taoDongKhach(user) {
  const stats = user.thongKeDonHang;
  const vip = user.laVip
    ? `<span class="the-vip">VIP · ${user.vipHetHan ? `đến ${new Date(user.vipHetHan).toLocaleDateString("vi-VN")}` : "không thời hạn"}</span>`
    : '<span class="the-thuong">Tiêu chuẩn</span>';
  const nutVip = user.laVip
    ? '<button class="nut-hanh-dong" data-act="thu-hoi-vip">Thu hồi VIP</button>'
    : '<button class="nut-hanh-dong" data-act="cap-vip">Cấp VIP 1 tháng</button>';
  return `<tr>
    <td><strong>${esc(user.hoTen)}</strong><br><span>${esc(user.email)}</span>${user.canhBao ? `<small>${esc(user.canhBao)}</small>` : ""}</td>
    <td><strong>${Number(user.diemTichLuy || 0)}</strong></td><td>${vip}</td>
    <td>${stats.tongDon}</td><td>${stats.thanhCong}</td><td>${stats.khongDen}</td><td>${stats.daHuy}</td><td>${stats.choXuLy}</td><td>${stats.thatBai}</td>
    <td><button class="nut-hanh-dong" data-act="lich-su">Lịch sử</button><button class="nut-hanh-dong" data-act="cong-diem">C\u1ed9ng \u0111i\u1ec3m</button>${nutVip}<button class="nut-hanh-dong" data-act="xoa-tai-khoan">Xóa tài khoản</button></td>
  </tr>`;
}

async function taiDanhSach() {
  try {
    thongBao.textContent = "Đang tải danh sách tài khoản...";
    const tuKhoa = document.querySelector("#tu-khoa").value.trim();
    const users = await api(`/api/admin/tai-khoan?${new URLSearchParams({ tuKhoa })}`);
    tbody.innerHTML = users.length
      ? users.map(taoDongKhach).join("")
      : '<tr><td colspan="10">Không tìm thấy tài khoản phù hợp.</td></tr>';
    thongBao.textContent = `${users.length} tài khoản`;
  } catch (error) {
    thongBao.textContent = error.message;
    if (/đăng nhập|quyền/i.test(error.message)) location.href = "/dangnhap-private";
  }
}

async function taiLichSu(email) {
  const donHang = await api(`/api/admin/tai-khoan/${encodeURIComponent(email)}/lich-su`);
  lichSuMoTa.textContent = `Lịch sử đặt phòng: ${email}`;
  lichSu.innerHTML = donHang.length
    ? `<div class="bang-wrap"><table class="bang-tai-khoan"><thead><tr><th>Mã đơn</th><th>Quán</th><th>Ngày đặt</th><th>Trạng thái</th></tr></thead><tbody>${donHang.map((don) => `<tr><td>${esc(don.maDon)}</td><td>${esc(don.tenQuan)}</td><td>${don.thoiGianDat ? new Date(don.thoiGianDat).toLocaleString("vi-VN") : "—"}</td><td>${esc(don.trangThai)}</td></tr>`).join("")}</tbody></table></div>`
    : '<p>Khách chưa có lịch sử đặt phòng.</p>';
}

tbody.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-act]");
  if (!button) return;
  const row = button.closest("tr");
  const email = row.querySelector("td:first-child span").textContent;
  try {
    if (button.dataset.act === "lich-su") return await taiLichSu(email);
    let body = "{}";
    if (button.dataset.act === "cong-diem") {
      const nhapDiem = window.prompt(`Nh\u1eadp s\u1ed1 \u0111i\u1ec3m mu\u1ed1n c\u1ed9ng cho ${email} (1\u20131.000.000):`, "100");
      if (nhapDiem === null) return;
      const soDiem = Number(nhapDiem.trim());
      if (!Number.isSafeInteger(soDiem) || soDiem < 1 || soDiem > 1000000) {
        window.alert("S\u1ed1 \u0111i\u1ec3m ph\u1ea3i l\u00e0 s\u1ed1 nguy\u00ean t\u1eeb 1 \u0111\u1ebfn 1.000.000.");
        return;
      }
      body = JSON.stringify({ soDiem });
      const diemHienTai = Number(row.children[1].textContent) || 0;
      const datVip = diemHienTai + soDiem >= 1000;
      const xacNhan = datVip
        ? `C\u1ed9ng ${soDiem} \u0111i\u1ec3m cho ${email}? Kh\u00e1ch \u0111\u1ea1t m\u1ed1c 1.000 \u0111i\u1ec3m n\u00ean s\u1ebd \u0111\u01b0\u1ee3c c\u1ea5p VIP 1 th\u00e1ng v\u00e0 \u0111i\u1ec3m \u0111\u01b0\u1ee3c \u0111\u1eb7t l\u1ea1i.`
        : `C\u1ed9ng ${soDiem} \u0111i\u1ec3m cho ${email}?`;
      if (!window.confirm(xacNhan)) return;
    }
    const confirmMessage = {
      "cap-vip": `Cấp VIP 1 tháng cho ${email}?`,
      "thu-hoi-vip": `Thu hồi VIP của ${email}?`,
      "xoa-tai-khoan": `Xóa tài khoản ${email}?\n\nHồ sơ, thông báo, đánh giá, bài viết và bình luận của khách sẽ bị xóa. Lịch sử đặt phòng và hoàn tiền vẫn được giữ cho quản trị nhưng được gỡ liên kết với email. Khách sẽ không thể đăng nhập nữa.`,
    }[button.dataset.act];
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    button.disabled = true;
    const endpoint = button.dataset.act === "xoa-tai-khoan"
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

document.querySelector("#tim-kiem").addEventListener("click", taiDanhSach);
document.querySelector("#tu-khoa").addEventListener("keydown", (event) => {
  if (event.key === "Enter") taiDanhSach();
});
taiDanhSach();
