// Başlangıç: kayıtlı ürünleri ve arşivi yükle, ekranları kur, alt paneldeki butonlar, kapatma.
import * as C from './catalog.js';
import { getJSON, setJSON, onStorageError } from './storage.js';
import { initUrunler } from './urunler.js';
import { initArsiv } from './arsiv.js';
import { disaAktar, iceAktar } from './aktar.js';
import { alertDialog, confirmDialog, handleBack } from './ui.js';

const $ = (sel) => document.querySelector(sel);
const Cap = window.Capacitor;
const App = Cap && Cap.isNativePlatform && Cap.isNativePlatform() && Cap.Plugins ? Cap.Plugins.App : null;

async function start() {
  const catalog = C.normalizeCatalog(await getJSON('katalog', null));
  const arsiv = C.normalizeArsiv(await getJSON('arsiv', []));
  onStorageError(() => alertDialog('Kayıt yapılamadı. Lütfen tekrar deneyin.'));
  const save = () => setJSON('katalog', catalog);
  const saveArsiv = () => setJSON('arsiv', arsiv);

  const screens = { urun: $('#screen-urun'), arsiv: $('#screen-arsiv'), kapali: $('#screen-kapali') };
  const show = (name) => { for (const [k, el] of Object.entries(screens)) el.hidden = k !== name; };
  const current = () => Object.keys(screens).find((k) => !screens[k].hidden);

  const urunler = initUrunler({ catalog, arsiv, save, saveArsiv });
  const arsivScr = initArsiv({ arsiv, saveArsiv, onClose: () => { show('urun'); urunler.show(); } });

  $('#btn-disa').addEventListener('click', () => disaAktar(catalog, arsiv));
  $('#btn-ice').addEventListener('click', () => $('#inp-ice').click());
  $('#inp-ice').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (f && (await iceAktar(f, catalog, arsiv))) { save(); saveArsiv(); urunler.show(); }
  });
  $('#btn-arsiv').addEventListener('click', () => { show('arsiv'); arsivScr.show(); });

  // Programı kapat: önce onay. APK'da uygulamadan çıkar; web'de sekme kapatılabiliyorsa kapanır.
  async function kapat() {
    if (!(await confirmDialog('Programdan çıkılsın mı?', { yes: 'Kapat', danger: false }))) return;
    if (App) { App.exitApp(); return; }
    window.close();
    setTimeout(() => show('kapali'), 200); // tarayıcı izin vermezse
  }
  $('#btn-kapat').addEventListener('click', kapat);
  $('#btn-yeniden').addEventListener('click', () => location.reload());

  // Android geri tuşu: açık pencere / menü, sonra arşivden ürünlere, ana ekranda kapatma onayı
  if (App) {
    App.addListener('backButton', () => {
      if (handleBack()) return;
      if (current() === 'arsiv') { show('urun'); urunler.show(); return; }
      kapat();
    });
  }

  show('urun');
  urunler.show();
}

start();
