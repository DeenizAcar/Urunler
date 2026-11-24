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

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && hasModal()) { e.preventDefault(); handleBack(); }
});
