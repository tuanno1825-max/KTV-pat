const nutAnMenu = document.querySelector(".nut-an-menu");
const menuQuanTri = document.querySelector("#menu-quan-tri");

if (menuQuanTri) {
  const nutDangXuat = document.createElement("button");
  nutDangXuat.type = "button";
  nutDangXuat.className = "nut-dang-xuat-noi-bo";
  nutDangXuat.textContent = "Đăng xuất";
  nutDangXuat.addEventListener("click", async () => {
    nutDangXuat.disabled = true;
    try {
      const response = await fetch("/api/dang-xuat", {
        method: "POST",
        credentials: "same-origin",
      });
      if (!response.ok) throw new Error("Đăng xuất chưa thành công. Vui lòng thử lại.");
      window.location.href = "/html/dangnhap-private.html";
    } catch (error) {
      alert(error.message);
      nutDangXuat.disabled = false;
    }
  });
  menuQuanTri.append(nutDangXuat);
}

const cacNhomMenu = [...document.querySelectorAll("[data-menu-group]")];
cacNhomMenu.forEach((nhom) => {
  const nutChon = document.querySelector(`[aria-controls="${nhom.id}"]`);
  nutChon?.addEventListener("click", () => {
    cacNhomMenu.forEach((nhomKhac) => {
      const dangChon = nhomKhac === nhom;
      nhomKhac.classList.toggle("menu-nhom-mo", dangChon);
      document.querySelector(`[aria-controls="${nhomKhac.id}"]`)
        ?.setAttribute("aria-expanded", String(dangChon));
    });
  });
});

fetch("/api/quyen-noi-bo", { credentials: "same-origin", cache: "no-store" })
  .then((response) => response.ok ? response.json() : null)
  .then((quyen) => {
    const vaiTro = quyen?.vaiTro;
    const nhomDuocPhep = vaiTro === "admin"
      ? ["nhan-vien", "manager", "admin"]
      : vaiTro === "manager"
        ? ["nhan-vien", "manager"]
        : ["nhan-vien"];
    document.querySelectorAll("[data-menu-group]").forEach((nhom) => {
      nhom.toggleAttribute("hidden", !nhomDuocPhep.includes(nhom.dataset.menuGroup));
    });
    document.querySelectorAll("#tab-quan-ly-tai-khoan").forEach((tab) => {
      tab.toggleAttribute("hidden", vaiTro !== "admin");
    });
  })
  .catch(() => {});

nutAnMenu?.addEventListener("click", () => {
  const dangMo = nutAnMenu.getAttribute("aria-expanded") === "true";
  const moMenu = !dangMo;

  document.body.classList.toggle("menu-noi-bo-an", !moMenu);
  nutAnMenu.setAttribute("aria-expanded", String(moMenu));
  nutAnMenu.setAttribute("aria-label", moMenu ? "\u1ea8n menu" : "M\u1edf menu");
  nutAnMenu.querySelector(".nhan-nut-menu").textContent = moMenu ? "\u1ea8n menu" : "M\u1edf menu";
  menuQuanTri?.toggleAttribute("hidden", !moMenu);
});
