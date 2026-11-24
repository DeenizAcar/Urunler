// Başlangıç: kayıtlı ürün tanımlarını yükle, ekranı kur.
import * as C from './catalog.js';
import { getJSON, setJSON, onStorageError } from './storage.js';
import { initUrunler } from './urunler.js';
import { alertDialog } from './ui.js';

async function start() {
  const catalog = C.normalizeCatalog(await getJSON('katalog', null));
  onStorageError(() => alertDialog('Ürünler kaydedilemedi. Lütfen tekrar deneyin.'));
  const save = () => setJSON('katalog', catalog);
  initUrunler({ catalog, save }).show();
}

start();
