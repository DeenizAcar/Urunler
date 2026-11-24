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

export const sortedUrunler = (k) => [...k.urunler].sort(byAd);
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
