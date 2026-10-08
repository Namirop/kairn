/**
 * Les mentions légales. Comme pour la confidentialité, l'identité de l'éditeur
 * arrive en paramètres depuis `lib/site/editeur.ts`.
 */
export const mentionsLegales = {
  titre: "Mentions légales",
  chapeau: "Qui édite Kairn, où le service est hébergé, et à qui s'adresser.",
  misAJour:
    "Dernière vérification des informations d'hébergement et de sous-traitance : {verifieLe}.",
  editeur: {
    titre: "Éditeur du service",
    p1: "{nom} — {mentionEI}.",
    p2: "{statut}.",
    p3: "Siège : {adresse}.",
    p4: "SIREN : {siren}.",
    p5: "{tva}",
    p6: "Contact : {email} — {telephone}.",
  },
  directeur: {
    titre: "Directeur de la publication",
    p1: "{nom}, joignable à {email}.",
  },
  hebergement: {
    titre: "Hébergement",
    p1: "L'application est hébergée par Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis, joignable à legalnotices@vercel.com. Vercel ne publie pas de numéro de téléphone. Les fonctions serveur sont exécutées depuis une région européenne.",
    p2: "La base de données est opérée par Neon, LLC, société du groupe Databricks, Inc., 160 Spear Street, Suite 1300, San Francisco, CA 94105, États-Unis. L'infrastructure qui la porte est située à Francfort, en Allemagne.",
    p3: "Les emails transactionnels sont acheminés par Plus Five Five, Inc. (Resend), 2261 Market Street #5039, San Francisco, CA 94114, États-Unis.",
  },
  traitement: {
    titre: "Traitement du contenu déposé",
    p1: "Le texte et les images déposés sont transmis à OpenRouter, Inc. — 169 Madison Avenue, New York, NY 10016, États-Unis — pour être découpés en concepts et transformés en questions. OpenRouter fait appel à OpenAI, L.L.C. — 1455 Third Street, San Francisco, CA 94158, États-Unis — comme sous-traitant ultérieur pour exécuter les modèles. Ce traitement est le service lui-même : sans lui, l'application ne fait rien.",
    p2: "En cas d'indisponibilité d'OpenRouter, le traitement bascule automatiquement sur Anthropic Ireland, Limited — 6th Floor, South Bank House, Barrow Street, Dublin 4, D04 TR29, Irlande —, avec les mêmes règles.",
  },
  propriete: {
    titre: "Propriété intellectuelle",
    p1: "Le code source de Kairn, le nom « Kairn », le logo, l'identité visuelle et l'ensemble des éléments composant le service sont la propriété de {nom} et sont protégés par le droit d'auteur. Toute reproduction ou représentation, totale ou partielle, sans autorisation écrite préalable est interdite.",
    p2: "Le contenu que tu déposes reste le tien. Kairn n'acquiert aucun droit dessus, hormis celui strictement nécessaire à son traitement pour te fournir le service : le découper en concepts, en produire des questions et te les reposer.",
    p3: "Il n'est ni réutilisé à d'autres fins, ni cédé à des tiers, ni utilisé pour entraîner un modèle. Ce dernier point n'est pas une intention mais une clause : le compte OpenRouter est réglé pour interdire l'entraînement sur nos données côté modèles routés, et les conditions commerciales d'Anthropic (sous-traitant de repli) interdisent l'entraînement sur le contenu de leurs clients.",
  },
  signaler: {
    titre: "Signaler un contenu ou un problème",
    p1: "Écris à {email}. Nous accusons réception de tout signalement sous cinq jours ouvrés et y donnons suite dans les meilleurs délais.",
    p2: "Les dépôts sont privés et ne sont jamais diffusés publiquement : Kairn n'est pas une plateforme de contenus publics. Ce canal existe pour les questions défectueuses et les problèmes de service, et il double le signalement présent sous chaque question.",
  },
};
