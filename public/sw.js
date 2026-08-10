// Service worker minimal : réseau d'abord, cache en secours hors-ligne.
// Objectif = installabilité PWA, pas une stratégie offline-first complète —
// on ne veut jamais servir un dashboard périmé quand la connexion est bonne.
//
// Bump du nom de cache = purge des entrées de l'ancienne version (voir
// `activate`, qui supprime tout cache dont le nom diffère). Nécessaire ici :
// la v1 avait pu mettre en cache des réponses d'authentification.
const CACHE = "habitgame-v2";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

/**
 * Ne JAMAIS intercepter ces chemins.
 *
 * - /api/auth/* : le flux OAuth s'appuie sur des cookies à usage unique
 *   (pkce.code_verifier, state, csrf). Ré-émettre la requête depuis le worker
 *   ajoute un intermédiaire dans une redirection déjà sensible, et mettre la
 *   réponse en cache est absurde pour un callback qui ne vaut qu'une fois.
 * - /api/* en général : réponses propres à un utilisateur et à un instant
 *   (export CSV, webhook, health). Les servir depuis le cache exposerait les
 *   données d'une session à la suivante sur un même appareil.
 */
function isBypassed(url) {
  return url.pathname.startsWith("/api/");
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (isBypassed(url)) return; // laisse le navigateur gérer, cookies inclus

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Une redirection (302 OAuth) ou une réponse opaque n'a rien à faire
        // en cache : `cache.put` lèverait, et la rejouer casserait le flux.
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached ?? caches.match("/"))),
  );
});
