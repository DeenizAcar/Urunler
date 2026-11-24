// Ürün tanımları veri modeli ve kuralları — DOM'suz, test edilebilir.
//
// katalog = { kategoriler: [ { id, ad, urunler: [ { id, ad } ] } ] }
// Fonksiyonlar katalogu yerinde değiştirir; hata olursa { error: 'mesaj' } döner.

export const KATEGORI_MIN = 3;
export const KATEGORI_MAX = 30;
export const URUN_MAX = 60;

export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
export const emptyCatalog = () => ({ kategoriler: [] });
export const cleanText = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const same = (a, b) => cleanText(a).toLocaleLowerCase('tr-TR') === cleanText(b).toLocaleLowerCase('tr-TR');

/** Depodan okunan veriyi doğrular; bozuk kısımları atar. */
export function normalizeCatalog(raw) {
  const arr = (x) => (Array.isArray(x) ? x : []);
  return {
    kategoriler: arr(raw && raw.kategoriler).filter((k) => k && k.ad).map((k) => ({
      id: String(k.id || newId()),
      ad: cleanText(k.ad),
      urunler: arr(k.urunler).filter((u) => u && u.ad).map((u) => ({
        id: String(u.id || newId()),
        ad: cleanText(u.ad),
      })),
    })),
  };
}

// ---------- Kategoriler ----------

export const findKategori = (cat, id) => cat.kategoriler.find((k) => k.id === id) || null;

export function checkKategoriAd(cat, ad, exceptId = null) {
  const s = cleanText(ad);
  if (!s) return 'Kategori adı boş olamaz.';
  if (s.length < KATEGORI_MIN) return `Kategori adı en az ${KATEGORI_MIN} karakter olmalı.`;
  if (s.length > KATEGORI_MAX) return `Kategori adı en çok ${KATEGORI_MAX} karakter olabilir.`;
  if (cat.kategoriler.some((k) => k.id !== exceptId && same(k.ad, s))) return 'Bu isimde bir kategori zaten var.';
  return '';
}

export function addKategori(cat, ad) {
  const error = checkKategoriAd(cat, ad);
  if (error) return { error };
  const k = { id: newId(), ad: cleanText(ad), urunler: [] };
  cat.kategoriler.push(k);
  return { id: k.id };
}

export function renameKategori(cat, id, ad) {
  const k = findKategori(cat, id);
  if (!k) return { error: 'Kategori bulunamadı.' };
  const error = checkKategoriAd(cat, ad, id);
  if (error) return { error };
  k.ad = cleanText(ad);
  return { id };
}

/** dir: -1 sola, +1 sağa. En baştaki kategori daha sola gidemez (+ sekmesi hep en başta). */
export function moveKategori(cat, id, dir) {
  const i = cat.kategoriler.findIndex((k) => k.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= cat.kategoriler.length) return false;
  const list = cat.kategoriler;
  [list[i], list[j]] = [list[j], list[i]];
  return true;
}

/** Kategori silinebilir mi? Silinemezse sebebi döner. */
export const kategoriSilinemez = (k) =>
  (k.urunler.length
    ? `"${k.ad}" kategorisinde ${k.urunler.length} ürün var. Kategoriyi silmek için önce ürünleri silin.`
    : '');

export function deleteKategori(cat, id) {
  const k = findKategori(cat, id);
  if (!k) return { error: 'Kategori bulunamadı.' };
  const error = kategoriSilinemez(k);
  if (error) return { error };
  cat.kategoriler = cat.kategoriler.filter((x) => x.id !== id);
  return { id };
}

// ---------- Ürünler ----------

const num = (s) => {
  const m = String(s).match(/\d+(?:[.,]\d+)?/);
  return m ? parseFloat(m[0].replace(',', '.')) : Infinity;
};
/** Baştaki sayı varsa sayısal (45 Ah, 60 Ah, 100 Ah), yoksa alfabetik. */
const byAd = (a, b) => num(a.ad) - num(b.ad) || a.ad.localeCompare(b.ad, 'tr');

/** Ada göre sıralı kopya (kayıt sırası k.urunler dizisinin kendi sırasıdır). */
export const sortedUrunler = (k) => [...k.urunler].sort(byAd);

/** Kayıt sırasında ürünü taşır. dir: -1 yukarı, +1 aşağı. Sınırda false döner. */
export function moveUrun(k, id, dir) {
  const list = k.urunler;
  const i = list.findIndex((u) => u.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return false;
  [list[i], list[j]] = [list[j], list[i]];
  return true;
}
export const findUrun = (k, id) => k.urunler.find((u) => u.id === id) || null;

/** Ürün ekler (id yoksa) ya da günceller. data: { ad } */
export function saveUrun(k, data, id = null) {
  const ad = cleanText(data.ad);
  if (!ad) return { error: 'Ürün adı boş olamaz.' };
  if (ad.length > URUN_MAX) return { error: `Ürün adı en çok ${URUN_MAX} karakter olabilir.` };
  if (k.urunler.some((u) => u.id !== id && same(u.ad, ad))) return { error: `"${ad}" bu kategoride zaten var.` };
  if (id) {
    const u = findUrun(k, id);
    if (!u) return { error: 'Ürün bulunamadı.' };
    u.ad = ad;
    return { id };
  }
  const u = { id: newId(), ad };
  k.urunler.push(u);
  return { id: u.id };
}

export function deleteUrun(k, id) {
  if (!findUrun(k, id)) return { error: 'Ürün bulunamadı.' };
  k.urunler = k.urunler.filter((u) => u.id !== id);
  return { id };
}

// ---------- Silinen ürün arşivi ----------
// arsiv = [ { id, zaman (ISO), ad, kategori } ]

export function normalizeArsiv(raw) {
  return (Array.isArray(raw) ? raw : []).filter((a) => a && a.ad && a.zaman).map((a) => ({
    id: String(a.id || newId()),
    zaman: String(a.zaman),
    ad: cleanText(a.ad),
    kategori: cleanText(a.kategori),
  }));
}

/** Ürünü siler ve arşive ekler. */
export function deleteUrunToArsiv(k, id, arsiv, zaman = new Date()) {
  const u = findUrun(k, id);
  if (!u) return { error: 'Ürün bulunamadı.' };
  deleteUrun(k, id);
  arsiv.push({ id: newId(), zaman: zaman.toISOString(), ad: u.ad, kategori: k.ad });
  return { id };
}

/** Arşiv yeniden eskiye. */
export const sortedArsiv = (arsiv) => [...arsiv].sort((a, b) => (a.zaman < b.zaman ? 1 : a.zaman > b.zaman ? -1 : 0));

// ---------- Excel satırları (dışa / içe aktar) ----------

const pad = (n) => String(n).padStart(2, '0');
export const zamanYaz = (iso) => {
  const d = new Date(iso);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
function zamanCoz(v) {
  if (v instanceof Date) return isNaN(v) ? null : v;
  const m = String(v ?? '').trim().match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  return m ? new Date(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0)) : null;
}
/** Başlık adını büyük/küçük harf ve boşluk farkı gözetmeden bulur. */
function hucre(row, adlar) {
  for (const k of Object.keys(row)) {
    if (adlar.includes(cleanText(k).toLocaleLowerCase('tr-TR'))) return row[k];
  }
  return undefined;
}

/** Ürünler sayfası: sekme sırası ve kayıt sırasıyla. */
export const urunRows = (cat) =>
  cat.kategoriler.flatMap((k) => (k.urunler.length ? k.urunler : [null]).map((u) => ({ Kategori: k.ad, 'Ürün': u ? u.ad : '' })));

export const arsivRows = (arsiv) =>
  sortedArsiv(arsiv).map((a) => ({ 'Silme Zamanı': zamanYaz(a.zaman), 'Ürün': a.ad, Kategori: a.kategori, 'Kayıt No': a.id }));

/**
 * Excel satırlarını ekler; var olanlar (aynı kategori / aynı ürün / aynı arşiv kaydı) atlanır, hiçbir şey silinmez.
 * Sayıları döner: { kategori, urun, arsiv }.
 */
export function importRows(cat, arsiv, uRows = [], aRows = []) {
  const n = { kategori: 0, urun: 0, arsiv: 0 };
  for (const row of uRows) {
    const kAd = cleanText(hucre(row, ['kategori', 'sekme']));
    const uAd = cleanText(hucre(row, ['ürün', 'ürünler', 'urun']));
    if (!kAd) continue;
    let k = cat.kategoriler.find((x) => same(x.ad, kAd));
    if (!k) {
      const r = addKategori(cat, kAd);
      if (r.error) continue;
      k = findKategori(cat, r.id);
      n.kategori++;
    }
    if (uAd && !saveUrun(k, { ad: uAd }).error) n.urun++;
  }
  for (const row of aRows) {
    const z = zamanCoz(hucre(row, ['silme zamanı']));
    const ad = cleanText(hucre(row, ['ürün', 'urun']));
    if (!z || !ad) continue;
    const id = cleanText(hucre(row, ['kayıt no'])) || 'x' + z.getTime().toString(36) + ad.length;
    if (arsiv.some((a) => a.id === id)) continue;
    arsiv.push({ id, zaman: z.toISOString(), ad, kategori: cleanText(hucre(row, ['kategori'])) });
    n.arsiv++;
  }
  return n;
}
