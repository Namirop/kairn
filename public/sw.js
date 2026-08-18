/*
 * Le service worker de Kairn. Il existe pour une raison précise, et il fait le
 * strict nécessaire pour l'honorer.
 *
 * **Sans lui, l'installation n'existe pas sur Android.** Chrome n'émet
 * `beforeinstallprompt` que si le site remplit ses critères d'installabilité,
 * et l'un d'eux est un service worker qui écoute `fetch`. Un manifeste seul ne
 * suffit pas : l'invite ne partait donc jamais sur un téléphone neuf, en
 * silence et sans erreur nulle part — sur un ordinateur elle apparaissait quand
 * même, parce que le menu de Chrome, lui, n'exige rien. C'est ce décalage qui
 * rendait le défaut invisible.
 *
 * **Il ne met rien d'autre en cache.** Ce que Kairn affiche est personnel et
 * daté : une session, un arriéré, un cairn. Resservir une de ces pages depuis
 * un cache, ne serait-ce qu'une fois, montrerait le compte de quelqu'un — ou le
 * compte d'hier. On n'intercepte donc que les navigations, on va toujours au
 * réseau d'abord, et la seule chose qu'on garde est une page qui ne contient
 * rien de personnel.
 *
 * Pas d'étape de compilation : ce fichier est servi tel quel, en JavaScript
 * lisible par tous les navigateurs qui savent installer une application.
 */

/*
 * À incrémenter dès que la page hors ligne change : l'entrée est clefée par
 * cette constante et non par le contenu du fichier. Sans le coup de main, une
 * installation existante continuerait de servir l'ancienne version.
 */
const CACHE = "kairn-coquille-v1";
const HORS_LIGNE = "/hors-ligne.html";

self.addEventListener("install", (evenement) => {
  evenement.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(HORS_LIGNE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (evenement) => {
  evenement.waitUntil(
    (async () => {
      const cles = await caches.keys();

      await Promise.all(cles.filter((cle) => cle !== CACHE).map((cle) => caches.delete(cle)));
      await self.clients.claim();
    })(),
  );
});

/*
 * Navigations seulement, et seulement en lecture.
 *
 * Tout le reste — actions de serveur, route handlers, morceaux de rendu, images,
 * polices — passe au réseau sans que ce fichier le voie. C'est la garantie
 * qu'aucune donnée de compte ne transite par un cache, et c'est aussi ce qui
 * évite de casser un envoi de formulaire le jour où le réseau vacille : un POST
 * rejoué depuis un cache serait un dépôt fantôme.
 */
self.addEventListener("fetch", (evenement) => {
  const requete = evenement.request;

  if (requete.method !== "GET") return;
  if (requete.mode !== "navigate") return;

  evenement.respondWith(
    fetch(requete).catch(async () => {
      const cache = await caches.open(CACHE);

      return (await cache.match(HORS_LIGNE)) ?? Response.error();
    }),
  );
});
