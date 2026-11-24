// Web sitesini dist/ klasörüne hazırlar: uygulama (www) + /apk indirme sayfası + APK
import fs from 'node:fs';
const out = 'dist';
fs.rmSync(out, { recursive: true, force: true });
fs.cpSync('www', out, { recursive: true });
fs.cpSync('site', out, { recursive: true });
fs.copyFileSync('www/icons/icon-192.png', `${out}/apk/icon.png`);
if (!fs.existsSync('release/Urunler.apk')) throw new Error('release/Urunler.apk yok: önce bash scripts/build-apk.sh');
fs.copyFileSync('release/Urunler.apk', `${out}/apk/Urunler.apk`);
fs.writeFileSync(`${out}/.nojekyll`, '');
console.log('dist/ hazır');
