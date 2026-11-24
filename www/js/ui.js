// Küçük pencereler (form, onay, uyarı) ve simgeler.
// Pencere butonları sola dayalı; olumlu buton (Kaydet / Sil / Tamam) önde, Vazgeç yanında.

const stack = [];

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

// Simgeler tek renk: rengini butondan (currentColor) alır.
const svg = (body) =>
  `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

export const icon = {
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  left: svg('<path d="M15 5l-7 7 7 7"/>'),
  right: svg('<path d="M9 5l7 7-7 7"/>'),
  up: svg('<path d="M5 15l7-7 7 7"/>'),
  down: svg('<path d="M5 9l7 7 7-7"/>'),
  edit: svg('<path d="M4 20h4L19 9l-4-4L4 16v4z" stroke-width="2.2"/><path d="M13.5 6.5l4 4" stroke-width="2.2"/>'),
  x: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
};

function openModal(html, onBack) {
  const bd = document.createElement('div');
  bd.className = 'modal-backdrop';
  bd.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
  document.getElementById('modal-root').append(bd);
  const entry = {
    el: bd.firstElementChild,
    close() {
      const i = stack.indexOf(entry);
      if (i >= 0) stack.splice(i, 1);
      bd.remove();
    },
    onBack,
  };
  stack.push(entry);
  return entry;
}

export const hasModal = () => stack.length > 0;

/** Esc: en üstteki pencereyi vazgeçmiş gibi kapatır. */
export function handleBack() {
  const top = stack[stack.length - 1];
  if (!top) return false;
  top.onBack();
  return true;
}

/**
 * Form penceresi. fields: [{ name, label, value, maxlength, placeholder }].
 * onSave(değerler) -> { error } ise mesajı gösterip açık kalır; değilse kapanır ve sonucu döndürür.
 * Vazgeçilirse null döner.
 */
export function formDialog({ title, subtitle = '', fields, onSave }) {
  return new Promise((resolve) => {
    const m = openModal(
      `<form novalidate>
         <h3>${esc(title)}</h3>
         ${subtitle ? `<p class="modal-sub">${esc(subtitle)}</p>` : ''}
         ${fields.map((f) => `
           <label class="fld"><span>${esc(f.label)}</span>
             <input name="${f.name}" value="${esc(f.value ?? '')}" maxlength="${f.maxlength || 40}"
               placeholder="${esc(f.placeholder || '')}" autocomplete="off">
           </label>`).join('')}
         <p class="err" hidden></p>
         <div class="modal-actions">
           <button type="submit" class="btn primary">Kaydet</button>
           <button type="button" class="btn" data-x="cancel">Vazgeç</button>
         </div>
       </form>`,
      () => done(null),
    );
    const form = m.el.querySelector('form');
    const err = m.el.querySelector('.err');
    function done(v) { m.close(); resolve(v); }
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const values = Object.fromEntries(fields.map((f) => [f.name, form.elements[f.name].value]));
      const r = onSave(values);
      if (r && r.error) {
        err.textContent = r.error;
        err.hidden = false;
        form.elements[fields[0].name].focus();
        return;
      }
      done(r || {});
    });
    form.querySelector('[data-x="cancel"]').addEventListener('click', () => done(null));
    form.addEventListener('input', () => { err.hidden = true; });
    const first = form.elements[fields[0].name];
    first.focus();
    first.select();
  });
}

export function confirmDialog(msgHtml, { yes = 'Sil', no = 'Vazgeç', danger = true } = {}) {
  return new Promise((resolve) => {
    const m = openModal(
      `<div class="msg">${msgHtml}</div>
       <div class="modal-actions">
         <button type="button" class="btn ${danger ? 'danger' : 'primary'}" data-x="yes">${yes}</button>
         <button type="button" class="btn" data-x="no">${no}</button>
       </div>`,
      () => done(false),
    );
    function done(v) { m.close(); resolve(v); }
    m.el.addEventListener('click', (e) => {
      const x = e.target.closest('[data-x]');
      if (x) done(x.dataset.x === 'yes');
    });
    m.el.querySelector('[data-x="yes"]').focus();
  });
}

export function alertDialog(msgHtml) {
  return new Promise((resolve) => {
    const m = openModal(
      `<div class="msg">${msgHtml}</div>
       <div class="modal-actions"><button type="button" class="btn primary" data-x="ok">Tamam</button></div>`,
      () => done(),
    );
    function done() { m.close(); resolve(); }
    const ok = m.el.querySelector('[data-x="ok"]');
    ok.addEventListener('click', done);
    ok.focus();
  });
}

/** Uzun basma menüsü (x, y noktasında). items: [{ text, danger, fn }]; Vazgeç her zaman en altta. */
export function popMenu(x, y, items) {
  const bd = document.createElement('div');
  bd.className = 'pop-backdrop';
  bd.innerHTML = `<div class="popmenu" role="menu">${items.map((it, i) =>
    `<button type="button" data-i="${i}" class="${it.danger ? 'danger' : ''}">${esc(it.text)}</button>`).join('')}
    <button type="button" data-i="-1">Vazgeç</button></div>`;
  document.getElementById('modal-root').append(bd);
  const m = bd.firstElementChild;
  const r = document.getElementById('app').getBoundingClientRect();
  m.style.left = Math.max(8, Math.min(x - r.left, r.width - m.offsetWidth - 8)) + 'px';
  m.style.top = Math.max(8, Math.min(y - r.top, r.height - m.offsetHeight - 8)) + 'px';
  const entry = { el: m, close() { const i = stack.indexOf(entry); if (i >= 0) stack.splice(i, 1); bd.remove(); }, onBack: () => entry.close() };
  stack.push(entry);
  bd.addEventListener('click', (e) => {
    const b = e.target.closest('[data-i]');
    if (b || e.target === bd) {
      entry.close();
      const it = b && items[+b.dataset.i];
      if (it) it.fn();
    }
  });
}

let toastTimer = null;
export function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
}

// ---------- İpucu: data-tip olan öğeye basılı tutunca (farede üzerine gelince) görünür ----------
const LONG = 500;
let tipTimer = null;
let tipHide = null;
let suppressClick = false;

function showTip(el) {
  const tip = document.getElementById('tip');
  const text = el.dataset.tip;
  if (!text || !el.isConnected) return;
  tip.textContent = text;
  tip.hidden = false;
  const app = document.getElementById('app').getBoundingClientRect();
  const r = el.getBoundingClientRect();
  const w = tip.offsetWidth;
  const h = tip.offsetHeight;
  let top = r.top - app.top - h - 6;
  if (top < 4) top = r.bottom - app.top + 6;
  const left = Math.max(4, Math.min(r.left - app.left + r.width / 2 - w / 2, app.width - w - 4));
  tip.style.left = left + 'px';
  tip.style.top = top + 'px';
}
function hideTip(delay = 0) {
  clearTimeout(tipHide);
  tipHide = setTimeout(() => { document.getElementById('tip').hidden = true; }, delay);
}

/** Satırlarda uzun basma için ortak zamanlayıcı. onLong(e) basılı tutma süresi dolunca çağrılır. */
export function onLongPress(root, selector, onLong) {
  let t = null;
  let sx = 0;
  let sy = 0;
  root.addEventListener('pointerdown', (e) => {
    if (e.button) return;
    const el = e.target.closest(selector);
    if (!el || e.target.closest('[data-tip]')) return;
    sx = e.clientX; sy = e.clientY;
    clearTimeout(t);
    t = setTimeout(() => {
      suppressClick = true;
      if (navigator.vibrate) navigator.vibrate(25);
      onLong(el, sx, sy);
    }, LONG);
  });
  root.addEventListener('pointermove', (e) => {
    if (Math.abs(e.clientX - sx) > 10 || Math.abs(e.clientY - sy) > 10) clearTimeout(t);
  });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) root.addEventListener(ev, () => clearTimeout(t));
}

let tipSx = 0;
let tipSy = 0;
document.addEventListener('pointerdown', (e) => {
  suppressClick = false;
  const el = e.target.closest('[data-tip]');
  clearTimeout(tipTimer);
  if (!el || e.button) return;
  tipSx = e.clientX; tipSy = e.clientY;
  tipTimer = setTimeout(() => { suppressClick = true; showTip(el); }, LONG);
});
document.addEventListener('pointermove', (e) => {
  if (Math.abs(e.clientX - tipSx) > 10 || Math.abs(e.clientY - tipSy) > 10) clearTimeout(tipTimer);
});
for (const ev of ['pointerup', 'pointercancel']) {
  document.addEventListener(ev, () => {
    clearTimeout(tipTimer);
    if (!suppressClick) return;
    hideTip(1200);
    setTimeout(() => { suppressClick = false; }, 60); // yalnız bu basmanın tıklaması yutulur
  });
}
// Fare: üzerine gelince kısa süre sonra ipucu
document.addEventListener('pointerover', (e) => {
  if (e.pointerType !== 'mouse') return;
  const el = e.target.closest('[data-tip]');
  if (!el) return;
  clearTimeout(tipTimer);
  tipTimer = setTimeout(() => showTip(el), 600);
  el.addEventListener('pointerleave', () => { clearTimeout(tipTimer); hideTip(); }, { once: true });
});
// Basılı tutma bitince tıklama sayılmasın
document.addEventListener('click', (e) => {
  if (suppressClick) { suppressClick = false; e.stopPropagation(); e.preventDefault(); }
}, true);
document.addEventListener('contextmenu', (e) => {
  if (e.target.closest('[data-tip], .grid.sel tbody tr')) e.preventDefault();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && hasModal()) { e.preventDefault(); handleBack(); }
});
