// Silinen ürün arşivi ekranı: Silme Zamanı | Ürün — "ürün adı (sekme adı)".
// Satıra basılı tutunca menü: Kaydı Sil / Vazgeç.
import * as C from './catalog.js';
import { confirmDialog, esc, onLongPress, popMenu, toast } from './ui.js';

const $ = (sel) => document.querySelector(sel);

export function initArsiv({ arsiv, saveArsiv, onClose }) {
  const body = $('#arsiv-body');
  let selId = null;

  function render() {
    body.replaceChildren();
    const list = C.sortedArsiv(arsiv);
    if (!list.length) {
      const td = body.insertRow().insertCell();
      td.colSpan = 2;
      td.className = 'empty';
      td.textContent = 'Arşivde silinen ürün kaydı bulunmuyor.';
      return;
    }
    for (const a of list) {
      const tr = body.insertRow();
      tr.dataset.id = a.id;
      if (a.id === selId) tr.classList.add('selected');
      tr.insertCell().innerHTML = `<b>${esc(C.zamanYaz(a.zaman))}</b>`;
      tr.insertCell().innerHTML = `<b>${esc(a.ad)}</b>${a.kategori ? ` <i class="kat">(${esc(a.kategori)})</i>` : ''}`;
    }
  }

  function select(id) {
    selId = id;
    for (const tr of body.rows) tr.classList.toggle('selected', tr.dataset.id === id);
  }

  body.addEventListener('click', (e) => {
    const tr = e.target.closest('tr[data-id]');
    if (tr) select(tr.dataset.id);
  });
  onLongPress(body, 'tr[data-id]', (tr, x, y) => {
    const a = arsiv.find((q) => q.id === tr.dataset.id);
    if (!a) return;
    select(a.id);
    popMenu(x, y, [{
      text: 'Kaydı Sil',
      danger: true,
      async fn() {
        if (!(await confirmDialog(`<b>${esc(a.ad)}</b> <i>(${esc(a.kategori)})</i> silme kaydı arşivden silinsin mi?`))) return;
        const i = arsiv.indexOf(a);
        if (i >= 0) arsiv.splice(i, 1);
        saveArsiv();
        render();
        toast('Kayıt silindi.');
      },
    }]);
  });

  $('#btn-arsiv-tum').addEventListener('click', async () => {
    if (!arsiv.length) { toast('Silinecek kayıt yok.'); return; }
    if (!(await confirmDialog(`Tüm arşiv kayıtları (<b>${arsiv.length}</b> adet) silinsin mi?`))) return;
    arsiv.splice(0, arsiv.length);
    saveArsiv();
    render();
    toast('Tüm arşiv silindi.');
  });
  $('#btn-arsiv-kapat').addEventListener('click', onClose);

  return {
    show() {
      selId = null;
      render();
    },
  };
}
