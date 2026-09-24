const formXacThuc = document.querySelector(".bieu-mau-xac-thuc[data-che-do]");

if (formXacThuc) {
  const thongBao = formXacThuc.querySelector(".thong-bao-xac-thuc");
  const nutGui = formXacThuc.querySelector('button[type="submit"]');
  const cheDo = formXacThuc.dataset.cheDo;

  formXacThuc.addEventListener("submit", async (suKien) => {
    suKien.preventDefault();
    thongBao.textContent = "";
    thongBao.dataset.loai = "";

    const duLieuForm = new FormData(formXacThuc);
    const matKhau = duLieuForm.get("matKhau");
    if (cheDo === "dang-ky" && matKhau !== duLieuForm.get("xacNhanMatKhau")) {
      thongBao.textContent = "Mật khẩu xác nhận không khớp.";
      return;
    }

    nutGui.disabled = true;
    const nhanNutCu = nutGui.textContent;
    nutGui.textContent = cheDo === "dang-ky" ? "Đang tạo tài khoản..." : "Đang đăng nhập...";

    try {
      const phanHoi = await fetch(`/api/${cheDo}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hoTen: duLieuForm.get("hoTen"),
          email: duLieuForm.get("email"),
          matKhau,
          dongYDieuKhoan: duLieuForm.get("dongYDieuKhoan") === "on",
        }),
      });
      const ketQua = await phanHoi.json();
      if (!phanHoi.ok) throw new Error(ketQua.message || "Yêu cầu không thành công.");

      if (cheDo === "dang-ky") {
        thongBao.dataset.loai = "thanh-cong";
        thongBao.textContent = `${ketQua.message} Đang chuyển đến trang đăng nhập...`;
        window.setTimeout(() => { window.location.href = "dangnhap.html"; }, 1200);
      } else {
        window.location.href = "/";
      }
    } catch (error) {
      thongBao.textContent = error.message || "Không thể kết nối máy chủ. Vui lòng thử lại.";
      nutGui.disabled = false;
      nutGui.textContent = nhanNutCu;
    }
  });
}
