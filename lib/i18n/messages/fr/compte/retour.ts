/**
 * Le retour sur le produit, depuis les réglages.
 *
 * Les libellés des sujets sont redits ici plutôt que lus dans
 * `lib/retours/libelle-du-sujet.ts` : celui-là sert aussi l'écran interne et
 * l'email d'alerte, qui restent en français quelle que soit la langue de qui
 * écrit.
 */
export const retour = {
  sujet: "De quoi s'agit-il",
  sujets: {
    BUG: "Ça ne marche pas",
    COMPORTEMENT: "Ça me surprend",
    TEXTE: "Un mot de travers",
    AUTRE: "Autre chose",
  },
  envoye:
    "C'est envoyé, et c'est lu. Tu n'auras pas de réponse — mais ce que tu viens d'écrire finira corrigé.",
  message: "Ce que tu as rencontré",
  messageExemple: "Ce que tu faisais, ce à quoi tu t'attendais, ce qui s'est passé.",
  ecran: "Sur quel écran, si tu t'en souviens",
  ecranExemple: "La session, le dépôt, la page d'accueil…",
  unInstant: "Un instant",
  envoyer: "Envoyer",
  joindreCapture: "Joindre une capture",
  changerCapture: "Changer la capture",
  retirerCapture: "Retirer la capture",
  erreurs: {
    sujet: "Choisis de quoi il s'agit avant d'envoyer.",
    longueur: "Écris entre {min} et {max} signes. Même une phrase suffit.",
    image: "Cette image dépasse 5 Mo. Recadre-la, ou envoie le retour sans elle.",
    plafond: "Tu as envoyé {nombre} retours aujourd'hui. Reviens demain — ils sont lus.",
  },
};
