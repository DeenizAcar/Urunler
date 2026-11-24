import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../www/js/catalog.js';

test('kategori adı: boş, kısa ve tekrar reddedilir', () => {
  const cat = C.emptyCatalog();
  assert.ok(C.addKategori(cat, '  ').error);
  assert.ok(C.addKategori(cat, 'ab').error);
  assert.ok(C.addKategori(cat, 'Binek').id);
  assert.ok(C.addKategori(cat, 'binek').error);
  assert.equal(cat.kategoriler.length, 1);
});

test('kategori taşıma sınırları aşmaz', () => {
  const cat = C.emptyCatalog();
  const a = C.addKategori(cat, 'Aaa').id;
  const b = C.addKategori(cat, 'Bbb').id;
  assert.equal(C.moveKategori(cat, a, -1), false);
  assert.equal(C.moveKategori(cat, a, +1), true);
  assert.deepEqual(cat.kategoriler.map((k) => k.id), [b, a]);
  assert.equal(C.moveKategori(cat, a, +1), false);
});

test('ürün: boş ve tekrar (büyük/küçük harf) reddedilir, düzenlenir', () => {
  const cat = C.emptyCatalog();
  const k = C.findKategori(cat, C.addKategori(cat, 'Binek').id);
  assert.ok(C.saveUrun(k, { ad: '' }).error);
  const id = C.saveUrun(k, { ad: 'Işık  Ürünü' }).id;
  assert.equal(C.findUrun(k, id).ad, 'Işık Ürünü');
  assert.ok(C.saveUrun(k, { ad: 'ışık ürünü' }).error);
  assert.ok(C.saveUrun(k, { ad: 'IŞIK ÜRÜNÜ' }, id).id); // kendi kaydı tekrar sayılmaz
});

test('ürünler baştaki sayıya, sonra alfabeye göre sıralanır', () => {
  const k = { id: 'k', ad: 'Binek', urunler: [] };
  for (const ad of ['100 Ah', 'Çanta', '45 Ah', '60 Ah', 'Bant']) C.saveUrun(k, { ad });
  assert.deepEqual(C.sortedUrunler(k).map((u) => u.ad), ['45 Ah', '60 Ah', '100 Ah', 'Bant', 'Çanta']);
});

test('ürün kayıt sırasında yukarı/aşağı taşınır, sınırı aşmaz', () => {
  const k = { id: 'k', ad: 'Binek', urunler: [] };
  const [a, b, c] = ['Ccc', 'Aaa', 'Bbb'].map((ad) => C.saveUrun(k, { ad }).id);
  assert.equal(C.moveUrun(k, a, -1), false);
  assert.equal(C.moveUrun(k, c, +1), false);
  assert.equal(C.moveUrun(k, c, -1), true);
  assert.deepEqual(k.urunler.map((u) => u.id), [a, c, b]);
  assert.deepEqual(C.sortedUrunler(k).map((u) => u.ad), ['Aaa', 'Bbb', 'Ccc']); // ada göre etkilenmez
});

test('ürünü olan kategori silinemez', () => {
  const cat = C.emptyCatalog();
  const id = C.addKategori(cat, 'Binek').id;
  const k = C.findKategori(cat, id);
  const u = C.saveUrun(k, { ad: '60 Ah' }).id;
  assert.ok(C.deleteKategori(cat, id).error);
  C.deleteUrun(k, u);
  assert.ok(C.deleteKategori(cat, id).id);
  assert.equal(cat.kategoriler.length, 0);
});

test('bozuk kayıt temizlenir', () => {
  const cat = C.normalizeCatalog({ kategoriler: [{ ad: ' Binek ', urunler: [{ ad: 'x' }, null, {}] }, {}, null] });
  assert.equal(cat.kategoriler.length, 1);
  assert.equal(cat.kategoriler[0].ad, 'Binek');
  assert.equal(cat.kategoriler[0].urunler.length, 1);
});

test('silinen ürün arşive alınır, yeniden eskiye sıralanır', () => {
  const k = { id: 'k', ad: 'Binek', urunler: [] };
  const arsiv = [];
  const a = C.saveUrun(k, { ad: '60 Ah' }).id;
  const b = C.saveUrun(k, { ad: '45 Ah' }).id;
  C.deleteUrunToArsiv(k, a, arsiv, new Date(2026, 10, 1, 9, 5));
  C.deleteUrunToArsiv(k, b, arsiv, new Date(2026, 10, 2, 10, 0));
  assert.equal(k.urunler.length, 0);
  assert.deepEqual(C.sortedArsiv(arsiv).map((x) => `${x.ad} (${x.kategori})`), ['45 Ah (Binek)', '60 Ah (Binek)']);
  assert.equal(C.zamanYaz(arsiv[0].zaman), '01.11.2026 09:05');
});

test('dışa aktarılan satırlar içe aktarılınca aynı veri oluşur, tekrar aktarım bir şey eklemez', () => {
  const cat = C.emptyCatalog();
  const arsiv = [];
  const k = C.findKategori(cat, C.addKategori(cat, 'Binek').id);
  C.addKategori(cat, 'Boş Sekme');
  for (const ad of ['Ccc', 'Aaa']) C.saveUrun(k, { ad });
  C.deleteUrunToArsiv(k, C.saveUrun(k, { ad: 'Silinen' }).id, arsiv, new Date(2026, 10, 3, 8, 30));
  const uRows = C.urunRows(cat);
  const aRows = C.arsivRows(arsiv);

  const cat2 = C.emptyCatalog();
  const arsiv2 = [];
  assert.deepEqual(C.importRows(cat2, arsiv2, uRows, aRows), { kategori: 2, urun: 2, arsiv: 1 });
  assert.deepEqual(cat2.kategoriler.map((x) => x.ad), ['Binek', 'Boş Sekme']);
  assert.deepEqual(cat2.kategoriler[0].urunler.map((u) => u.ad), ['Ccc', 'Aaa']); // kayıt sırası korunur
  assert.equal(arsiv2[0].ad, 'Silinen');
  assert.deepEqual(C.importRows(cat2, arsiv2, uRows, aRows), { kategori: 0, urun: 0, arsiv: 0 });
});
