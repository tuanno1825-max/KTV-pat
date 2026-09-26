const bieuMauNoiBo = document.querySelector("#bieu-mau-noi-bo");
const nutDangNhap = document.querySelector(".nut-dang-nhap-noi-bo");

function hienThiLoi(noiDung) {
  let thongBao = document.querySelector(".thong-bao-noi-bo");
  if (!thongBao) {
    thongBao = document.createElement("p");
    thongBao.className = "thong-bao-noi-bo";
    bieuMauNoiBo.prepend(thongBao);
  }
  thongBao.textContent = noiDung;
}

bieuMauNoiBo.addEventListener("submit", async (suKien) => {
  suKien.preventDefault();
  nutDangNhap.disabled = true;
  nutDangNhap.textContent = "Đang kiểm tra...";

  const vaiTro = document.querySelector('input[name="vai-tro"]:checked').value;
  const taiKhoan = document.querySelector("#tai-khoan-noi-bo").value.trim();
  const matKhau = document.querySelector("#mat-khau-noi-bo").value;

  try {
    const phanHoi = await fetch("/api/dang-nhap-noi-bo", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taiKhoan, matKhau, vaiTro }),
    });
    const ketQua = await phanHoi.json();
    if (!phanHoi.ok) throw new Error(ketQua.message);

    window.location.href = ketQua.vaiTro === "manager"
      ? "/quan-ly-doanh-thu"
      : ketQua.vaiTro === "nhanvien"
        ? "/quan-ly-don-hang"
        : "/admin";
  } catch (error) {
    hienThiLoi(error.message || "Đăng nhập không thành công.");
    nutDangNhap.disabled = false;
    nutDangNhap.textContent = "Đăng nhập";
  }
});
