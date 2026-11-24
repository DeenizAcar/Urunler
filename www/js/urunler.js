// Ürünler ekranı: kategori sekmeleri ve her kategorinin Ürünler tablosu.
import * as C from './catalog.js';
import { formDialog, confirmDialog, alertDialog, icon, esc, onLongPress, toast } from './ui.js';

const $ = (sel) => document.querySelector(sel);

export function initUrunler({ catalog, arsiv, save, saveArsiv }) {
  const tabsEl = $('#tabs');
  const bodyEl = $('#tab-body');
  const emptyEl = $('#tab-empty');
  const urunBody = $('#urun-body');
  const urunAdd = $('#urun-add');
  const siraEl = $('#sirala');

  let activeId = null; // aktif kategori
  let addPending = false; // + sekmesine basıldı, pencere açık
  let selUrun = null;
  let sira = 'kayit'; // 'kayit': kayıt sırası (taşınabilir), 'ad': ada göre (taşınamaz)

  const activeKat = () => C.findKategori(catalog, activeId);

  /** Simge butonu; ipucu basılı tutunca (farede üzerine gelince) görünür. */
  function iconButton(cls, act, html, tip, { disabled = false } = {}) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = cls;
    b.dataset.act = act;
    b.innerHTML = html;
    b.dataset.tip = tip;
    b.setAttribute('aria-label', tip);
    b.disabled = disabled;
    return b;
  }

  // ---------- Sekmeler ----------

  function renderTabs() {
    tabsEl.replaceChildren();
    const add = document.createElement('div');
    add.className = `tab tab-add${addPending ? ' pending' : ''}`;
    add.append(iconButton('tab-act', 'add', icon.plus, 'Yeni kategori ekle'));
    tabsEl.append(add);

    const list = catalog.kategoriler;
    list.forEach((k, i) => {
      const tab = document.createElement('div');
      tab.className = 'tab';
      tab.dataset.id = k.id;
      tab.setAttribute('role', 'tab');
      const name = document.createElement('span');
      name.className = 'tab-name';
      name.textContent = k.ad;
      if (k.id === activeId && !addPending) {
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        tab.append(
          iconButton('tab-act', 'left', icon.left, 'Sola taşı', { disabled: i === 0 }),
          name,
          iconButton('tab-act', 'right', icon.right, 'Sağa taşı', { disabled: i === list.length - 1 }),
          iconButton('tab-act', 'edit', icon.edit, 'Kategori adını düzenle'),
          iconButton('tab-act', 'del', icon.x, 'Kategoriyi sil'),
        );
      } else {
        tab.tabIndex = 0;
        tab.append(name);
      }
      tabsEl.append(tab);
    });
  }

  tabsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act]');
    const tab = e.target.closest('.tab');
    if (btn) {
      const k = activeKat();
      const act = btn.dataset.act;
      if (act === 'add') addKategori();
      else if (k && act === 'left') moveKategori(k, -1);
      else if (k && act === 'right') moveKategori(k, +1);
      else if (k && act === 'edit') renameKategori(k);
      else if (k && act === 'del') deleteKategori(k);
      return;
    }
    if (tab && tab.classList.contains('tab-add')) { addKategori(); return; }
    if (tab && tab.dataset.id && tab.dataset.id !== activeId) {
      activeId = tab.dataset.id;
      selUrun = null;
      render();
    }
  });
  tabsEl.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.tab[data-id]')) {
      e.preventDefault();
      e.target.click();
    }
  });

  async function addKategori() {
    addPending = true;
    renderTabs();
    const r = await formDialog({
      title: 'Yeni Kategori',
      fields: [{ name: 'ad', label: 'Kategori Adı', maxlength: C.KATEGORI_MAX, placeholder: 'örn. Binek' }],
      onSave: (v) => C.addKategori(catalog, v.ad),
    });
    addPending = false;
    if (r) {
      activeId = r.id; // yeni açılan kategoriye konumlan
      save();
    } else {
      activeId = catalog.kategoriler[0]?.id ?? null; // vazgeçildi: en baştaki kategoriye konumlan
    }
    selUrun = null;
    render();
  }

  async function renameKategori(k) {
    const r = await formDialog({
      title: 'Kategori Adını Düzenle',
      fields: [{ name: 'ad', label: 'Kategori Adı', value: k.ad, maxlength: C.KATEGORI_MAX }],
      onSave: (v) => C.renameKategori(catalog, k.id, v.ad),
    });
    if (r) { save(); renderTabs(); }
  }

  function moveKategori(k, dir) {
    if (C.moveKategori(catalog, k.id, dir)) { save(); renderTabs(); }
  }

  async function deleteKategori(k) {
    const why = C.kategoriSilinemez(k);
    if (why) { await alertDialog(esc(why)); return; }
    if (!(await confirmDialog(`<b>${esc(k.ad)}</b> kategorisi silinsin mi?`))) return;
    const i = catalog.kategoriler.indexOf(k);
    C.deleteKategori(catalog, k.id);
    const list = catalog.kategoriler;
    activeId = list.length ? list[Math.max(0, i - 1)].id : null;
    save();
    render();
  }

  // ---------- Ürünler tablosu ----------

  function renderSira() {
    for (const b of siraEl.querySelectorAll('[data-sira]')) {
      const on = b.dataset.sira === sira;
      b.classList.toggle('on', on);
      b.setAttribute('aria-checked', String(on));
    }
  }

  function renderBody() {
    const k = activeKat();
    bodyEl.hidden = !k;
    emptyEl.hidden = !!k;
    urunAdd.disabled = !k;
    if (!k) return;
    renderSira();

    urunBody.replaceChildren();
    const rows = sira === 'ad' ? C.sortedUrunler(k) : k.urunler;
    if (!rows.length) {
      const td = urunBody.insertRow().insertCell();
      td.colSpan = 2;
      td.className = 'empty';
      td.textContent = 'Ürün yok. Eklemek için Ürün Ekle butonunu kullanın.';
      return;
    }
    rows.forEach((u, i) => {
      const tr = urunBody.insertRow();
      tr.dataset.id = u.id;
      tr.insertCell().textContent = u.ad;
      const td = tr.insertCell();
      td.className = 'act';
      if (u.id !== selUrun) return;
      // Butonlar yalnız aktif satırda; taşıma yalnız kayıt sırasındayken
      tr.classList.add('selected');
      if (sira === 'kayit') {
        td.append(
          iconButton('icon-btn', 'up', icon.up, 'Yukarı taşı', { disabled: i === 0 }),
          iconButton('icon-btn', 'down', icon.down, 'Aşağı taşı', { disabled: i === rows.length - 1 }),
        );
      }
      td.append(
        iconButton('icon-btn', 'edit', icon.edit, 'Ürünü düzenle'),
        iconButton('icon-btn del', 'del', icon.x, 'Ürünü sil'),
      );
    });
  }

  siraEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-sira]');
    if (!b || b.dataset.sira === sira) return;
    sira = b.dataset.sira;
    renderBody();
  });

  function moveUrun(id, dir) {
    const k = activeKat();
    if (sira !== 'kayit' || !C.moveUrun(k, id, dir)) return;
    save();
    renderBody();
    const tr = urunBody.querySelector(`tr[data-id="${CSS.escape(id)}"]`);
    if (tr) tr.scrollIntoView({ block: 'nearest' });
  }

  function select(id) {
    if (selUrun === id) return;
    selUrun = id;
    renderBody();
  }

  // Dokunma veya basılı tutma: satırı seç. Çift dokunma: düzenle.
  let last = { id: null, t: 0 };
  urunBody.addEventListener('click', (e) => {
    const tr = e.target.closest('tr[data-id]');
    if (!tr) return;
    const id = tr.dataset.id;
    const btn = e.target.closest('[data-act]');
    if (btn) {
      last = { id: null, t: 0 };
      const act = btn.dataset.act;
      if (act === 'del') deleteUrun(id);
      else if (act === 'edit') editUrun(id);
      else moveUrun(id, act === 'up' ? -1 : +1);
      return;
    }
    select(id);
    const now = Date.now();
    const dbl = last.id === id && now - last.t < 450;
    last = dbl ? { id: null, t: 0 } : { id, t: now };
    if (dbl) editUrun(id);
  });
  onLongPress(urunBody, 'tr[data-id]', (tr) => select(tr.dataset.id));

  async function deleteUrun(id) {
    const k = activeKat();
    const u = C.findUrun(k, id);
    if (!(await confirmDialog(`<b>${esc(u.ad)}</b> (${esc(k.ad)}) silinsin mi?<br><small>Silinen ürün arşive alınır.</small>`))) return;
    C.deleteUrunToArsiv(k, id, arsiv);
    if (selUrun === id) selUrun = null;
    save();
    saveArsiv();
    renderBody();
    toast('Ürün silindi ve arşive alındı.');
  }

  async function editUrun(id = null) {
    const k = activeKat();
    if (!k) return;
    const u = id ? C.findUrun(k, id) : null;
    const r = await formDialog({
      title: u ? 'Ürünü Düzenle' : 'Yeni Ürün',
      subtitle: k.ad,
      fields: [{ name: 'ad', label: 'Ürün', value: u?.ad, maxlength: C.URUN_MAX, placeholder: 'örn. 60 Ah' }],
      onSave: (v) => C.saveUrun(k, v, id),
    });
    if (!r) return;
    selUrun = r.id;
    save();
    renderBody();
    const tr = urunBody.querySelector(`tr[data-id="${CSS.escape(r.id)}"]`);
    if (tr) tr.scrollIntoView({ block: 'nearest' });
  }

  urunAdd.addEventListener('click', () => editUrun());

  function render() {
    renderTabs();
    renderBody();
  }

  return {
    show() {
      if (!activeKat()) activeId = catalog.kategoriler[0]?.id ?? null;
      render();
    },
  };
}
