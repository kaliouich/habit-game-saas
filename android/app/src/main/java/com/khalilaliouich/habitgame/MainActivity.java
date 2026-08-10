package com.khalilaliouich.habitgame;

import android.os.Bundle;
import android.webkit.CookieManager;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Android WebView refuse les cookies tiers PAR DÉFAUT
        // (setAcceptThirdPartyCookies = false).
        //
        // Le flux OAuth casse à cause de ça : Auth.js pose un cookie
        // `__Secure-authjs.pkce.code_verifier` (SameSite=Lax) avant de rediriger
        // vers Google, puis doit le relire au retour sur /api/auth/callback/google.
        // Au sein d'une WebView, cette redirection accounts.google.com → notre
        // domaine est évaluée comme un contexte tiers : le cookie n'est pas
        // renvoyé, et Auth.js échoue sur
        // `InvalidCheck: pkceCodeVerifier value could not be parsed`.
        //
        // On n'autorise pas le tracking publicitaire au passage : les pubs
        // mobiles passent par le SDK natif AdMob, pas par des cookies de WebView.
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        if (this.getBridge() != null && this.getBridge().getWebView() != null) {
            cookieManager.setAcceptThirdPartyCookies(this.getBridge().getWebView(), true);
        }
    }
}
