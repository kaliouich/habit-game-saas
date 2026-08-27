package com.khalilaliouich.habitgame;

import android.os.Bundle;
import android.os.Message;
import android.webkit.CookieManager;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

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
        // Le flux de consentement Google s'ouvre via window.open(). Le couple
        // setSupportMultipleWindows(false) + setJavaScriptCanOpenWindowsAutomatically(false)
        // ne suffit PAS à garder ça dans la WebView : à false, certaines
        // implémentations WebView (selon le fournisseur/OEM) n'appellent jamais
        // onCreateWindow et laissent le système gérer l'intent — d'où
        // l'échappement observé vers le navigateur externe malgré ce réglage,
        // avec un 400 côté consentement (cookies de session restés dans la
        // WebView d'origine) et un callback qui n'atteint jamais notre serveur.
        //
        // Fix explicite : autoriser les fenêtres multiples mais intercepter
        // onCreateWindow pour forcer le rendu dans la MÊME WebView via
        // WebView.WebViewTransport, au lieu de compter sur un comportement de
        // repli implicite et non garanti entre versions/OEM.
        if (webView != null) {
            webView.getSettings().setSupportMultipleWindows(true);
            webView.getSettings().setJavaScriptCanOpenWindowsAutomatically(true);
            webView.setWebChromeClient(new BridgeWebChromeClient(this.getBridge()) {
                @Override
                public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
                    WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
                    transport.setWebView(view);
                    resultMsg.sendToTarget();
                    return true;
                }
            });
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
