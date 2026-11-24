// Kalıcı depolama: APK içinde Capacitor Preferences (Android SharedPreferences), web'de localStorage
const Cap = window.Capacitor;
const P = Cap && Cap.isNativePlatform && Cap.isNativePlatform() && Cap.Plugins && Cap.Plugins.Preferences
  ? Cap.Plugins.Preferences
  : null;
const PREFIX = 'urunler:';

let chain = Promise.resolve();
let errorHandler = (e) => console.error(e);
export const onStorageError = (fn) => { errorHandler = fn; };

export async function getJSON(key, fallback) {
  try {
    const raw = P ? (await P.get({ key })).value : localStorage.getItem(PREFIX + key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch (e) {
    console.error('okuma hatası', key, e);
    return fallback;
  }
}

// Yazmalar sırayla yapılır
export function setJSON(key, value) {
  const raw = JSON.stringify(value);
  chain = chain.then(async () => {
    if (P) await P.set({ key, value: raw });
    else localStorage.setItem(PREFIX + key, raw);
  }).catch(errorHandler);
  return chain;
}

export function remove(key) {
  chain = chain.then(async () => {
    if (P) await P.remove({ key });
    else localStorage.removeItem(PREFIX + key);
  }).catch(errorHandler);
  return chain;
}
