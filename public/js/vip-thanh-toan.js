const noiDungTrangThai = document.querySelector("#trang-thai-thanh-toan");
const thamSoTrang = new URLSearchParams(window.location.search);
const maGiaoDichVip = thamSoTrang.get("maGiaoDich");

async function kiemTraKetQuaThanhToan() {
  if (thamSoTrang.get("ketQua") === "khong-hop-le") {
    noiDungTrangThai.textContent = "Không xác minh được chữ ký trả về từ cổng thanh toán. Liên hệ nhân viên để được hỗ trợ.";
    return;
  }
  if (!maGiaoDichVip) {
    noiDungTrangThai.textContent = "Không tìm thấy mã giao dịch. Nếu bạn đã thanh toán, hãy kiểm tra mục Thông báo sau ít phút.";
    return;
  }
  for (let lan = 0; lan < 15; lan += 1) {
    try {
      const phanHoi = await fetch(`/api/hoan-tien/thanh-toan/${encodeURIComponent(maGiaoDichVip)}`, {
        credentials: "same-origin", cache: "no-store",
      });
      const giaoDich = await phanHoi.json();
      if (phanHoi.status === 401) {
        noiDungTrangThai.textContent = "Đăng nhập lại cùng tài khoản đã mua gói để xem kết quả thanh toán.";
        return;
      }
      if (!phanHoi.ok) throw new Error(giaoDich.message || "Không kiểm tra được giao dịch.");
      if (giaoDich.trangThai === "Thành công") {
        noiDungTrangThai.textContent = `Thanh toán 100.000đ thành công. VIP có hiệu lực đến ${new Date(giaoDich.vipHetHanLuc).toLocaleDateString("vi-VN")}.`;
        return;
      }
      if (giaoDich.trangThai === "Thất bại") {
        noiDungTrangThai.textContent = "Thanh toán chưa thành công. Bạn có thể quay lại mục Ưu đãi VIP để thử lại.";
        return;
      }
    } catch (error) {
      noiDungTrangThai.textContent = error.message;
      return;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 2000));
  }
  noiDungTrangThai.textContent = "Giao dịch đang chờ VNPAY xác nhận. Kết quả sẽ được cập nhật trong mục Thông báo.";
}

kiemTraKetQuaThanhToan();
