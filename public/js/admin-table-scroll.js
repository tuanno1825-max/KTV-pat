const boChonVungBang = ".khung-bang, .bang-wrap, .bang-doanh-thu-wrap";
const gioiHanHang = 10;
const vungCanCapNhat = new Set();
let daLenLichCapNhat = false;

function capChieuCaoBang(vung) {
  const bang = vung.querySelector("table");
  const cacHang = Array.from(bang?.tBodies || []).flatMap((tbody) =>
    Array.from(tbody.rows),
  );
  if (!bang || cacHang.length <= gioiHanHang) {
    vung.style.removeProperty("max-height");
    vung.style.removeProperty("overflow-y");
    return;
  }

  const chieuCaoDau = bang.tHead?.getBoundingClientRect().height || 0;
  const chieuCaoHang = cacHang
    .slice(0, gioiHanHang)
    .reduce((tong, hang) => tong + hang.getBoundingClientRect().height, 0);
  const chieuCaoToiDa = Math.floor(window.innerHeight * 0.68);
  vung.style.maxHeight = `${Math.min(Math.ceil(chieuCaoDau + chieuCaoHang), chieuCaoToiDa)}px`;
  vung.style.overflowY = "auto";
}

function capNhatSauKhiVe() {
  if (daLenLichCapNhat) return;
  daLenLichCapNhat = true;
  requestAnimationFrame(() => {
    vungCanCapNhat.forEach(capChieuCaoBang);
    vungCanCapNhat.clear();
    daLenLichCapNhat = false;
  });
}

function themVungBang(node) {
  if (!(node instanceof Element)) return;
  if (node.matches(boChonVungBang)) vungCanCapNhat.add(node);
  const vungCha = node.closest(boChonVungBang);
  if (vungCha) vungCanCapNhat.add(vungCha);
  node
    .querySelectorAll(boChonVungBang)
    .forEach((vung) => vungCanCapNhat.add(vung));
  capNhatSauKhiVe();
}

document
  .querySelectorAll(boChonVungBang)
  .forEach((vung) => vungCanCapNhat.add(vung));
capNhatSauKhiVe();

new MutationObserver((cacThayDoi) => {
  cacThayDoi.forEach((thayDoi) => {
    themVungBang(thayDoi.target);
    thayDoi.addedNodes.forEach(themVungBang);
  });
}).observe(document.body, { childList: true, subtree: true });

window.addEventListener("resize", () => {
  document
    .querySelectorAll(boChonVungBang)
    .forEach((vung) => vungCanCapNhat.add(vung));
  capNhatSauKhiVe();
});
