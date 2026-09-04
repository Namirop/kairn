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

/*
 * Le partage du système, et la seule chose que ce fichier garde en plus.
 *
 * Quand Android envoie un partage à Kairn, l'envoi arrive **ici** : c'est le
 * service worker qui reçoit le POST déclaré par `share_target`, pas une route.
 * Il range ce qui a été partagé et renvoie vers le formulaire de dépôt, qui
 * vient le reprendre. Le texte ne part au serveur qu'au moment où la personne
 * appuie sur « Déposer » — quelqu'un qui partage puis renonce n'a rien envoyé.
 *
 * **C'est l'exception à « il ne met rien d'autre en cache ».** La règle
 * d'au-dessus interdit de resservir la page d'un compte depuis un cache, et
 * elle tient entière : ce qui est rangé ici n'est pas une réponse du serveur,
 * c'est ce que la personne vient de tendre à l'application, sur son propre
 * appareil, sous une clé à part, lu une fois puis effacé.
 *
 * Ces clés sont recopiées dans `components/depots/partage-recu.ts`. Ce
 * fichier-ci est servi tel quel, sans compilation : il ne peut rien importer,
 * et les deux côtés doivent donc bouger ensemble.
 */
const CACHE_PARTAGE = "kairn-partage";
const CIBLE_DE_PARTAGE = "/depots/partage";
const APRES_LE_PARTAGE = "/depots/nouveau";
const CLES_DU_PARTAGE = {
  titre: "/partage/titre",
  texte: "/partage/texte",
  lien: "/partage/lien",
  capture: "/partage/capture",
};
const EN_TETE_DU_NOM = "x-nom-du-fichier";

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

      // Un partage déposé juste avant une mise à jour survit : il est arrivé
      // par un geste, et le perdre à cause d'un déploiement se lirait comme une
      // application qui avale ce qu'on lui donne.
      const garder = [CACHE, CACHE_PARTAGE];

      await Promise.all(
        cles.filter((cle) => !garder.includes(cle)).map((cle) => caches.delete(cle)),
      );
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

  // Le partage passe avant les gardes : c'est le seul POST que ce fichier voit.
  if (requete.method === "POST" && new URL(requete.url).pathname === CIBLE_DE_PARTAGE) {
    evenement.respondWith(rangerLePartage(requete));
    return;
  }

  if (requete.method !== "GET") return;
  if (requete.mode !== "navigate") return;

  evenement.respondWith(
    fetch(requete).catch(async () => {
      const cache = await caches.open(CACHE);

      return (await cache.match(HORS_LIGNE)) ?? Response.error();
    }),
  );
});

/*
 * Ce qui a été partagé, rangé pour le formulaire, puis on y renvoie.
 *
 * Un champ par clé plutôt qu'un objet sérialisé : le formulaire n'a alors rien
 * à analyser au retour. Le nom du fichier voyage dans un en-tête — un corps de
 * réponse ne le porte pas — et encodé, parce qu'un en-tête ne transporte pas
 * les accents d'un nom de capture.
 *
 * Le renvoi se fait dans tous les cas, y compris quand rien n'a pu être rangé :
 * arriver sur un formulaire qui le dit vaut mieux que sur une erreur.
 */
async function rangerLePartage(requete) {
  const destination = new URL(APRES_LE_PARTAGE, self.location.origin);

  try {
    const envoi = await requete.formData();

    await caches.delete(CACHE_PARTAGE);

    const cache = await caches.open(CACHE_PARTAGE);

    await poser(cache, CLES_DU_PARTAGE.titre, envoi.get("titre"));
    await poser(cache, CLES_DU_PARTAGE.texte, envoi.get("texte"));
    await poser(cache, CLES_DU_PARTAGE.lien, envoi.get("lien"));

    const capture = envoi.get("image");

    if (capture && typeof capture !== "string" && capture.size > 0) {
      await cache.put(
        CLES_DU_PARTAGE.capture,
        new Response(capture, {
          headers: {
            "content-type": capture.type || "application/octet-stream",
            [EN_TETE_DU_NOM]: encodeURIComponent(capture.name || "capture"),
          },
        }),
      );
    }
  } catch (erreur) {
    // Le contenu partagé ne se journalise pas, la panne si.
    console.error("[kairn] partage non rangé", erreur);
    destination.searchParams.set("partage", "absent");
  }

  return Response.redirect(destination.href, 303);
}

async function poser(cache, cle, valeur) {
  if (typeof valeur !== "string" || valeur.trim().length === 0) return;

  await cache.put(cle, new Response(valeur));
}
