const cacQuan = [
  ["Ba Đình", "Ba%20Đình"],
  ["Bắc Từ Liêm", "Bắc%20Từ%20Liêm"],
  ["Cầu Giấy", "Cầu%20Giấy"],
  ["Đống Đa", "Đống%20Đa"],
  ["Hà Đông", "Hà%20Đông"],
  ["Hai Bà Trưng", "Hai%20Bà%20Trưng"],
  ["Hoàn Kiếm", "Hoàn%20Kiếm"],
  ["Hoàng Mai", "Hoàng%20Mai"],
  ["Long Biên", "Long%20Biên"],
  ["Nam Từ Liêm", "Nam%20Từ%20Liêm"],
  ["Tây Hồ", "Tây%20Hồ"],
  ["Thanh Xuân", "Thanh%20Xuân"],
];

const cacChuDe = [
  ["Rủ hát / Bắt kèo", "Rủ%20hát%20%2F%20Bắt%20kèo"],
  ["Review quán KTV", "Review%20quán"],
  ["Giao lưu âm nhạc", "Giao%20lưu"],
  ["Hỏi đáp & Kinh nghiệm", "Hỏi%20đáp%20%26%20Kinh%20nghiệm"],
];

const duongDan = window.location.pathname;
const taoLienKet = (nhan, href, thuocTinh = {}) => {
  const link = document.createElement("a");
  link.href = href;
  link.textContent = nhan;
  Object.entries(thuocTinh).forEach(([ten, giaTri]) =>
    link.setAttribute(ten, giaTri),
  );
  return link;
};

function taoNhom(nhan, cacMuc, taoHref) {
  const muc = document.createElement("li");
  muc.className = "co-menu-con";
  const nhanMuc = document.createElement("span");
  nhanMuc.className = "menu-cha";
  nhanMuc.textContent = nhan;
  nhanMuc.setAttribute("aria-haspopup", "true");
  const menuCon = document.createElement("ul");
  menuCon.className = "menu-con";
  menuCon.setAttribute("aria-label", nhan);
  cacMuc.forEach(([ten, giaTri]) => {
    const mucCon = document.createElement("li");
    mucCon.append(taoLienKet(ten, taoHref(giaTri)));
    menuCon.append(mucCon);
  });
  muc.append(nhanMuc, menuCon);
  return muc;
}

function taoMenuChung(menu) {
  menu.replaceChildren();
  const mucTrangChu = document.createElement("li");
  mucTrangChu.append(taoLienKet("Trang chủ", "/"));
  menu.append(mucTrangChu);
  menu.append(
    taoNhom(
      "Đặt phòng",
      cacQuan,
      (khuVuc) => `/html/datphong.html?khuVuc=${khuVuc}`,
    ),
  );
  const mucVip = document.createElement("li");
  mucVip.append(taoLienKet("Ưu đãi VIP", "/html/uu-dai-vip.html"));
  menu.append(mucVip);
  menu.append(
    taoNhom(
      "Cộng đồng",
      cacChuDe,
      (chuDe) => `/html/cong-dong.html?chuDe=${chuDe}`,
    ),
  );
  menu.append(
    taoNhom(
      "Liên hệ",
      [
        ["Liên hệ đối tác", "/html/lien-he-hop-tac.html"],
        ["Xử lý khiếu nại", "/html/giai-quyet-khieu-nai.html"],
      ],
      (href) => href,
    ),
  );
  if (duongDan.endsWith("/tai-khoan.html")) {
    const mucTaiKhoan = document.createElement("li");
    mucTaiKhoan.append(taoLienKet("Quản lý gói VIP", "/html/tai-khoan.html"));
    menu.append(mucTaiKhoan);
  }
  const mucDangChon =
    duongDan === "/" || duongDan.endsWith("/index.html")
      ? menu.querySelector('a[href="/"]')
      : duongDan.includes("datphong")
        ? menu.querySelector(".co-menu-con")
        : duongDan.includes("cong-dong")
          ? menu.querySelectorAll(".co-menu-con")[1]
          : null;
  mucDangChon?.classList.add("dang-chon");
}

document.querySelectorAll(".menu-ngang").forEach(taoMenuChung);
