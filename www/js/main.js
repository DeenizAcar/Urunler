// Başlangıç: kayıtlı ürün tanımlarını yükle, ekranı kur.
import * as C from './catalog.js';
import { getJSON, setJSON, onStorageError } from './storage.js';
import { initUrunler } from './urunler.js';
import { alertDialog, handleBack } from './ui.js';

const Cap = window.Capacitor;
const App = Cap && Cap.isNativePlatform && Cap.isNativePlatform() && Cap.Plugins ? Cap.Plugins.App : null;

async function start() {
  const catalog = C.normalizeCatalog(await getJSON('katalog', null));
  onStorageError(() => alertDialog('Ürünler kaydedilemedi. Lütfen tekrar deneyin.'));
  const save = () => setJSON('katalog', catalog);
  initUrunler({ catalog, save }).show();

  // Android geri tuşu: önce klavye (sistem kapatır), sonra açık pencere, en son uygulamadan çık
  if (App) {
    App.addListener('backButton', () => {
      if (!handleBack()) App.exitApp();
    });
  }
}

start();
