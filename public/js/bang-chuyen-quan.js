const bangChuyen = document.querySelector(".khung-phong-banner");
const daiAnh = document.querySelector(".marquee-phong");
const cacCham = [...document.querySelectorAll(".cac-cham-anh button")];
const nutTruoc = document.querySelector(".nut-anh-truoc");
const nutSau = document.querySelector(".nut-anh-sau");
const tenQuanNoiBat = document.querySelector("#ten-quan-noi-bat");
const giaQuanNoiBat = document.querySelector("#gia-quan-noi-bat");
const cacQuanNoiBat = [
  { ten: "Karaoke Level", tuKhoa: "level" },
  { ten: "Karaoke Hoàng Gia", tuKhoa: "hoàng gia" },
  { ten: "Karaoke iCool", tuKhoa: "icool" },
];

if (bangChuyen && daiAnh && cacCham.length) {
  let viTri = 0;
  let tamDung = false;
  let danhSachQuan = [];

  function dongBoThongTinQuan() {
    const quanNoiBat = cacQuanNoiBat[viTri];
    const tuKhoa = quanNoiBat.tuKhoa.toLocaleLowerCase("vi");
    const quan = danhSachQuan.find((item) =>
      String(item.ten || "").toLocaleLowerCase("vi").includes(tuKhoa),
    );

    tenQuanNoiBat.textContent = quan?.ten || quanNoiBat.ten;
    giaQuanNoiBat.textContent = quan
      ? `${Number(quan.giaMin || 0).toLocaleString("vi-VN")} - ${Number(quan.giaMax || 0).toLocaleString("vi-VN")} ₫ / giờ`
      : "Liên hệ để biết giá";
  }

  function hienThiAnh(mocMoi) {
    viTri = (mocMoi + cacCham.length) % cacCham.length;
    daiAnh.style.transform = `translateX(-${(viTri * 100) / 6}%)`;
    cacCham.forEach((cham, index) => {
      cham.setAttribute("aria-current", String(index === viTri));
    });
    dongBoThongTinQuan();
  }

  nutTruoc.addEventListener("click", () => hienThiAnh(viTri - 1));
  nutSau.addEventListener("click", () => hienThiAnh(viTri + 1));
  cacCham.forEach((cham, index) => {
    cham.addEventListener("click", () => hienThiAnh(index));
  });

  fetch("/api/quan-cong-khai")
    .then((response) => response.ok ? response.json() : [])
    .then((quan) => {
      danhSachQuan = quan;
      dongBoThongTinQuan();
    })
    .catch(() => {});

  bangChuyen.addEventListener("pointerenter", () => { tamDung = true; });
  bangChuyen.addEventListener("pointerleave", () => { tamDung = false; });
  bangChuyen.addEventListener("focusin", () => { tamDung = true; });
  bangChuyen.addEventListener("focusout", (event) => {
    if (!bangChuyen.contains(event.relatedTarget)) tamDung = false;
  });

  window.setInterval(() => {
    if (!tamDung) hienThiAnh(viTri + 1);
  }, 5000);
}
