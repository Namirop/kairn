import { accueil } from "./site/accueil";
import { essai } from "./site/essai";
import { sansConcept } from "./site/sans-concept";
import { tarifs } from "./site/tarifs";

/** La landing, l'essai sans compte, les tarifs, la désinscription. */
export const site = {
  accueil,
  essai,
  sansConcept,
  tarifs,
  desinscription: {
    meta: "Ne plus recevoir d'emails",
    titre: "Ne plus recevoir d'emails",
    texte:
      "Ton compte reste intact. Seuls les rappels par email s'arrêtent — tu peux les réactiver quand tu veux.",
    expireTitre: "Ce lien n'est plus valide",
    expireTexte:
      "Les liens de désinscription expirent. Ouvre le dernier email reçu, ou coupe les rappels depuis tes réglages.",
    reglages: "Ouvrir mes réglages",
  },
  /** L'image de partage. Elle se lit en un huitième de seconde : deux lignes et une phrase. */
  partage: {
    alt: "Kairn — dépose ce que tu apprends, il te le repose au bon moment.",
    constat: "Tu lis beaucoup.",
    retournement: "Tu retiens peu.",
    phrase:
      "Dépose ce que tu apprends. Kairn le découpe en concepts et te les repose au bon moment.",
  },
};
