package __PAKET__;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.content.Context;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.content.pm.SigningInfo;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import java.security.MessageDigest;

/**
 * Bu uygulamanın verilerini Sipariş Hazırlama uygulamasıyla paylaşır.
 * Sadece Sipariş Hazırlama okuyabilir: çağıranın paket adı ve imza parmak izi kontrol edilir.
 * Veri, uygulamanın JS tarafında Capacitor Preferences'a ("CapacitorStorage") yazdığı JSON'dur.
 */
public class VeriPaylasim extends ContentProvider {

    private static final String ANAHTAR = "__ANAHTAR__";
    private static final String IZINLI_PAKET = "com.deenizacar.siparishazirlama";
    private static final String IZINLI_IMZA = "4db5cfa222c17a7caa36075d7bbadf88c565e8a84722507234d071ed6d8ababf";

    @Override
    public boolean onCreate() { return true; }

    @Override
    public Bundle call(String method, String arg, Bundle extras) {
        if (!"oku".equals(method)) return null;
        if (!izinliMi()) throw new SecurityException("Bu veriyi okuma izni yok.");
        Context c = getContext();
        Bundle b = new Bundle();
        b.putString("veri", c.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE).getString(ANAHTAR, null));
        return b;
    }

    private boolean izinliMi() {
        String paket = getCallingPackage();
        if (!IZINLI_PAKET.equals(paket)) return false;
        try {
            PackageManager pm = getContext().getPackageManager();
            Signature[] imzalar;
            if (Build.VERSION.SDK_INT >= 28) {
                PackageInfo pi = pm.getPackageInfo(paket, PackageManager.GET_SIGNING_CERTIFICATES);
                SigningInfo si = pi.signingInfo;
                imzalar = si.hasMultipleSigners() ? si.getApkContentsSigners() : si.getSigningCertificateHistory();
            } else {
                imzalar = pm.getPackageInfo(paket, PackageManager.GET_SIGNATURES).signatures;
            }
            for (Signature s : imzalar) {
                byte[] d = MessageDigest.getInstance("SHA-256").digest(s.toByteArray());
                StringBuilder hex = new StringBuilder();
                for (byte x : d) hex.append(String.format("%02x", x));
                if (IZINLI_IMZA.equals(hex.toString())) return true;
            }
        } catch (Exception e) {
            return false;
        }
        return false;
    }

    @Override public Cursor query(Uri u, String[] p, String s, String[] a, String o) { return null; }
    @Override public String getType(Uri u) { return null; }
    @Override public Uri insert(Uri u, ContentValues v) { return null; }
    @Override public int delete(Uri u, String s, String[] a) { return 0; }
    @Override public int update(Uri u, ContentValues v, String s, String[] a) { return 0; }
}
