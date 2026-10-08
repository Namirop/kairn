/**
 * Les emails : sujets, corps, pieds de page.
 *
 * Seuls les emails reçus par les personnes passent ici. Les alertes
 * d'exploitation adressées à l'administrateur restent en français, dans leurs
 * gabarits : elles n'ont qu'un lecteur.
 *
 * Un paragraphe par clé : la version HTML et la version texte d'un même email
 * se composent des mêmes phrases, et ne peuvent donc pas diverger.
 */
export const emails = {
  commun: {
    /** Le libellé de la série, après son nombre : « 12 sessions d'affilée ». */
    uniteDeSerie: "{nombre, plural, =1 {session} other {sessions d'affilée}}",
    /** Le bouton porte le mot de l'interface, et le même dans tout le flux. */
    commencer: "Commencer",
    deposer: "Déposer",
    nePlusRecevoirEmails: "Ne plus recevoir d'emails de Kairn : {url}",
  },
  pied: {
    raisonParDefaut:
      "Tu reçois ce message parce que le rappel quotidien est activé sur ton compte.",
    nePlusEnRecevoir: "Ne plus en recevoir",
  },
  accueil: {
    sujetPlein: "{nombre, plural, =1 {1 concept} other {# concepts}} t'attendent",
    sujetVide: "Ton compte Kairn est ouvert",
    arrives:
      "{nombre, plural, =1 {1 concept} other {# concepts}} sont arrivés avec toi. Leurs questions s'écrivent, et la première session t'attend.",
    ouvert: "Ton compte est ouvert.",
    premierePierre:
      "Il attend sa première pierre. Dépose une information que tu veux garder — une phrase entendue, un paragraphe copié, une capture d'écran. Elle n'a pas à être propre ni longue.",
    decoupe:
      "Kairn la découpe en concepts, en fait des questions, et te les repose quand tu es sur le point de les oublier.",
    raison: "Tu reçois ce message parce que tu viens de créer un compte sur Kairn.",
  },
  rappel: {
    sujet: "{nombre, plural, =1 {1 concept} other {# concepts}} à revoir aujourd'hui",
    echeance:
      "{nombre, plural, =1 {1 concept} other {# concepts}} arrivent à échéance aujourd'hui.",
    serieTexte: "{nombre} jours d'affilée.",
    nePlusRecevoir: "Ne plus recevoir ce rappel : {url}",
  },
  serie: {
    sujet: "Ta série se joue aujourd'hui",
    /** `serie` arrive composée : le nombre, puis son libellé. */
    preheader: "{serie}, et rien aujourd'hui.",
    constat:
      "Rien n'a été revu aujourd'hui, et {nombre, plural, =1 {1 concept} other {# concepts}} attendent. Une seule question suffit à tenir la série.",
    nePlusRecevoir: "Ne plus recevoir cette alerte : {url}",
    raison: "Tu reçois ce message parce que l'alerte de série est activée sur ton compte.",
  },
  relance: {
    sujet: "Ton compte Kairn est encore vide",
    titre: "Rien n'est encore déposé.",
    exemples:
      "Kairn marche avec ce qui te passe sous les yeux : une recommandation qu'on t'a faite, un raccourci que tu réapprends tous les mois, trois lignes d'un article. Une seule chose suffit à commencer.",
    retour:
      "Elle devient quelques concepts, et ils te reviennent espacés dans le temps, juste avant le moment où tu les aurais oubliés.",
    preheader: "Une seule chose suffit à commencer.",
    raison:
      "Tu reçois ce message une fois, parce que ton compte Kairn est resté vide depuis son ouverture.",
  },
  /**
   * Le code de connexion. Le mot « code » reste près des chiffres dans chaque
   * langue : c'est sur lui que s'appuie la suggestion du clavier mobile.
   */
  code: {
    sujet: "{code} — ton code pour entrer dans Kairn",
    preheader: "Ton code de connexion Kairn : {code}",
    intro: "Voici ton code pour entrer dans Kairn.",
    ligneCode: "Code : {code}",
    retape:
      "Retape-le dans la fenêtre où tu l'as demandé. Il fonctionne une seule fois et expire dans {minutes} minutes.",
    ignore: "Si tu n'as pas demandé ce code, ignore ce message : personne ne peut entrer sans lui.",
    ignoreCourt: "Si tu n'as pas demandé ce code, ignore ce message.",
  },
};
