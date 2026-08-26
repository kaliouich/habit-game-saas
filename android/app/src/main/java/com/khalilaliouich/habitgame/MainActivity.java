package com.khalilaliouich.habitgame;

import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebView webView = this.getBridge() != null ? this.getBridge().getWebView() : null;

        // ── Cookies tiers ────────────────────────────────────────────────────
        // Android WebView les refuse PAR DÉFAUT. Or Auth.js pose un cookie
        // __Secure-authjs.pkce.code_verifier avant de rediriger vers Google,
        // puis doit le relire au retour sur /api/auth/callback/google : au sein
        // d'une WebView, cette redirection est évaluée comme un contexte tiers.
        // Sans ça : `InvalidCheck: pkceCodeVerifier value could not be parsed`.
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        if (webView != null) {
            cookieManager.setAcceptThirdPartyCookies(webView, true);
        }

        // ── Fenêtres multiples ───────────────────────────────────────────────
        // Le flux de consentement Google s'ouvre via window.open() après la
        // validation en deux étapes. Avec le support des fenêtres multiples,
        // Android délègue à onCreateWindow, que Capacitor route vers le
        // NAVIGATEUR EXTERNE — un chemin distinct de shouldOverrideUrlLoading,
        // donc totalement hors de portée de `server.allowNavigation`.
        //
        // Conséquence observée : Chrome recevait l'URL de consentement sans les
        // cookies de session Google (restés dans la WebView) et répondait 400
        // « malformed », pendant que l'app attendait un retour qui n'arrivait
        // jamais — le callback n'atteignait jamais notre serveur.
        //
        // À false, window.open() charge dans la MÊME WebView : un seul contexte,
        // un seul jar de cookies, le flux va au bout.
        if (webView != null) {
            webView.getSettings().setSupportMultipleWindows(false);
            webView.getSettings().setJavaScriptCanOpenWindowsAutomatically(false);
        }

        // ── User-Agent ───────────────────────────────────────────────────────
        // Android WebView ajoute systématiquement "; wv" à son user-agent pour
        // se distinguer de Chrome — et les serveurs OAuth de Google détectent
        // CE marqueur précis pour bloquer ou dégrader le login (politique
        // "disallowed_useragent"/embedded webview restreint, documentée par
        // Google). C'est vraisemblablement la vraie cause des échecs 400 sur
        // l'écran de consentement malgré les correctifs déjà en place
        // ci-dessus (cookies tiers, fenêtres multiples) : ceux-ci évitent que
        // le flux ne s'échappe vers Chrome externe, mais ne changent rien au
        // fait que Google voit une WebView et se comporte différemment avec.
        // Retirer "; wv" fait passer le user-agent pour du Chrome standard.
        if (webView != null) {
            String ua = webView.getSettings().getUserAgentString();
            if (ua != null && ua.contains("wv")) {
                webView.getSettings().setUserAgentString(ua.replace("; wv", ""));
            }
        }
    }
}
