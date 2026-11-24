// Sipariş Hazırlama ile veri paylaşımını Android projesine ekler (tekrar çalıştırılabilir).
// Kullanım: node native/kur.mjs <java paketi> <Preferences anahtarı>
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const [paket, anahtar] = process.argv.slice(2);
if (!paket || !anahtar) { console.error('Kullanım: node native/kur.mjs <paket> <anahtar>'); process.exit(1); }
const kok = join(dirname(fileURLToPath(import.meta.url)), '..');

const java = readFileSync(join(kok, 'native/VeriPaylasim.java'), 'utf8')
  .replace('__PAKET__', paket).replace('__ANAHTAR__', anahtar);
const hedef = join(kok, 'android/app/src/main/java', ...paket.split('.'), 'VeriPaylasim.java');
mkdirSync(dirname(hedef), { recursive: true });
writeFileSync(hedef, java);

const mf = join(kok, 'android/app/src/main/AndroidManifest.xml');
let x = readFileSync(mf, 'utf8');
if (!x.includes('.VeriPaylasim')) {
  x = x.replace(/(\r?\n[ \t]*)<\/application>/, '$1    <provider\n            android:name=".VeriPaylasim"\n' +
    '            android:authorities="${applicationId}.paylasim"\n            android:exported="true" />$1</application>');
}
if (!x.includes('com.deenizacar.siparishazirlama')) {
  x = x.replace(/(\r?\n[ \t]*)<application/, '$1<queries>$1    <package android:name="com.deenizacar.siparishazirlama" />$1</queries>$1<application');
}
writeFileSync(mf, x);
console.log('Veri paylaşımı eklendi: ' + hedef);
