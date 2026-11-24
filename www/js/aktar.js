// Excel dışa / içe aktarma. Dosya: "Ürünler" ve "Arşiv" sayfaları.
// APK'da dosya önce önbelleğe yazılır, sonra paylaşım penceresi açılır; web'de indirilir.
import * as C from './catalog.js';
import { confirmDialog, toast } from './ui.js';

const Cap = window.Capacitor;
const isNative = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());
const plug = (n) => (Cap && Cap.Plugins ? Cap.Plugins[n] : null);
const MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

let xlsxLoading = null;
function loadXlsx() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  if (!xlsxLoading) {
    xlsxLoading = new Promise((ok, fail) => {
      const s = document.createElement('script');
      s.src = 'vendor/xlsx.full.min.js';
      s.onload = () => ok(window.XLSX);
      s.onerror = () => { xlsxLoading = null; fail(new Error('xlsx yüklenemedi')); };
      document.head.append(s);
    });
  }
  return xlsxLoading;
}

function download(b64, name) {
  const a = document.createElement('a');
  a.href = `data:${MIME};base64,${b64}`;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
}

async function share(b64, name) {
  const Fs = plug('Filesystem');
  const Sh = plug('Share');
  if (isNative && Fs && Sh) {
    const r = await Fs.writeFile({ path: name, data: b64, directory: 'CACHE' });
    try {
      await Sh.share({ title: 'Ürünler Excel', files: [r.uri], dialogTitle: 'Ürünler Excel' });
    } catch (e) {
      if (!/cancel/i.test(String(e && e.message))) throw e;
    }
    return;
  }
  download(b64, name);
  toast('Excel dosyası indirildi.');
}

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export async function disaAktar(catalog, arsiv) {
  try {
    const X = await loadXlsx();
    const wb = X.utils.book_new();
    const ws1 = X.utils.json_to_sheet(C.urunRows(catalog), { header: ['Kategori', 'Ürün'] });
    ws1['!cols'] = [{ wch: 24 }, { wch: 40 }];
    const ws2 = X.utils.json_to_sheet(C.arsivRows(arsiv), { header: ['Silme Zamanı', 'Ürün', 'Kategori', 'Kayıt No'] });
    ws2['!cols'] = [{ wch: 18 }, { wch: 40 }, { wch: 24 }, { wch: 16 }];
    X.utils.book_append_sheet(wb, ws1, 'Ürünler');
    X.utils.book_append_sheet(wb, ws2, 'Arşiv');
    await share(X.write(wb, { bookType: 'xlsx', type: 'base64' }), `urunler_${today()}.xlsx`);
  } catch (e) {
    console.error(e);
    toast('Dışa aktarılamadı.');
  }
}

/** Dosyadaki yeni kayıtları ekler; var olanlar silinmez. Değişiklik olduysa true döner. */
export async function iceAktar(file, catalog, arsiv) {
  let X;
  let wb;
  try {
    X = await loadXlsx();
    wb = X.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
  } catch (e) {
    console.error(e);
    toast('Dosya okunamadı. Excel (.xlsx) dosyası seçin.');
    return false;
  }
  const sheet = (n) => wb.Sheets[n];
  const rows = (s) => (s ? X.utils.sheet_to_json(s, { defval: '' }) : []);
  const uRows = rows(sheet('Ürünler') || sheet(wb.SheetNames[0]));
  const aRows = rows(sheet('Arşiv'));

  // Önce kopyada dene, sayıları göster, onaylanırsa gerçek veriye uygula
  const n = C.importRows(structuredClone(catalog), structuredClone(arsiv), uRows, aRows);
  if (!n.kategori && !n.urun && !n.arsiv) { toast('Dosyada eklenecek yeni kayıt bulunamadı.'); return false; }
  const ok = await confirmDialog(
    `<b>${n.kategori}</b> yeni sekme, <b>${n.urun}</b> yeni ürün ve <b>${n.arsiv}</b> yeni arşiv kaydı eklensin mi?<br><small>Var olan kayıtlar silinmez.</small>`,
    { yes: 'Ekle', danger: false },
  );
  if (!ok) return false;
  C.importRows(catalog, arsiv, uRows, aRows);
  toast(`${n.kategori} sekme, ${n.urun} ürün, ${n.arsiv} arşiv kaydı eklendi.`);
  return true;
}
