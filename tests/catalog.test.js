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
