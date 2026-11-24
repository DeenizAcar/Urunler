// Ürünler ekranı: kategori sekmeleri ve her kategorinin Ürünler tablosu.
import * as C from './catalog.js';
import { formDialog, confirmDialog, alertDialog, icon, esc } from './ui.js';

const $ = (sel) => document.querySelector(sel);

export function initUrunler({ catalog, save }) {
  const tabsEl = $('#tabs');
  const bodyEl = $('#tab-body');
  const emptyEl = $('#tab-empty');
  const urunBody = $('#urun-body');
  const urunAdd = $('#urun-add');

  let activeId = null; // aktif kategori
  let addPending = false; // + sekmesine basıldı, pencere açık
  let selUrun = null;
  let sira = 'kayit'; // 'kayit': kayıt sırası (taşınabilir), 'ad': ada göre (taşınamaz)
  const siraEl = $('#sirala');

  const activeKat = () => C.findKategori(catalog, activeId);

  // ---------- Sekmeler ----------

  function tabButton(act, html, label, { disabled = false } = {}) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tab-act';
    b.dataset.act = act;
    b.innerHTML = html;
    b.title = label;
    b.setAttribute('aria-label', label);
    b.disabled = disabled;
    return b;
  }

  function renderTabs() {
    tabsEl.replaceChildren();
    const add = document.createElement('button');
    add.type = 'button';
    add.className = `tab tab-add${addPending ? ' pending' : ''}`;
    add.dataset.act = 'add';
    add.innerHTML = icon.plus;
    add.title = 'Yeni kategori ekle';
    add.setAttribute('aria-label', 'Yeni kategori ekle');
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
          tabButton('left', icon.left, 'Sola taşı', { disabled: i === 0 }),
          name,
          tabButton('right', icon.right, 'Sağa taşı', { disabled: i === list.length - 1 }),
          tabButton('edit', icon.edit, 'Adını düzenle'),
          tabButton('del', icon.x, 'Kategoriyi sil'),
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

  function rowButton(act, html, label, { cls = '', disabled = false } = {}) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `icon-btn ${cls}`.trim();
    b.dataset.row = act;
    b.innerHTML = html;
    b.title = label;
    b.setAttribute('aria-label', label);
    b.disabled = disabled;
    return b;
  }

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
      if (u.id === selUrun) {
        tr.classList.add('selected');
        // Taşıma yalnız kayıt sırasındayken ve yalnız aktif satırda
        if (sira === 'kayit') {
          td.append(
            rowButton('up', icon.up, 'Yukarı taşı', { disabled: i === 0 }),
            rowButton('down', icon.down, 'Aşağı taşı', { disabled: i === rows.length - 1 }),
          );
        }
      }
      td.append(rowButton('del', icon.x, 'Ürünü sil', { cls: 'del' }));
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

  // Tıklama: seç; aynı satıra kısa sürede ikinci tıklama (çift tıklama / çift dokunma): düzenle.
  let last = { id: null, t: 0 };
  urunBody.addEventListener('click', (e) => {
    const tr = e.target.closest('tr[data-id]');
    if (!tr) return;
    const id = tr.dataset.id;
    const btn = e.target.closest('[data-row]');
    if (btn) {
      last = { id: null, t: 0 };
      if (btn.dataset.row === 'del') { select(id); deleteUrun(id); }
      else moveUrun(id, btn.dataset.row === 'up' ? -1 : +1);
      return;
    }
    select(id);
    const now = Date.now();
    const dbl = last.id === id && now - last.t < 450;
    last = dbl ? { id: null, t: 0 } : { id, t: now };
    if (dbl) editUrun(id);
  });

  function select(id) {
    if (selUrun === id) return;
    selUrun = id;
    renderBody(); // taşıma butonları yalnız aktif satırda
  }

  async function deleteUrun(id) {
    const k = activeKat();
    const u = C.findUrun(k, id);
    if (!(await confirmDialog(`<b>${esc(u.ad)}</b> (${esc(k.ad)}) silinsin mi?`))) return;
    C.deleteUrun(k, id);
    if (selUrun === id) selUrun = null;
    save();
    renderBody();
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
