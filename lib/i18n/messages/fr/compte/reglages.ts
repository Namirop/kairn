/** La page des réglages, son formulaire et ce que l'enregistrement répond. */
export const reglages = {
  metaTitre: "Réglages",
  titre: "Réglages",
  chapo: "Ce que tu fais dans Kairn, et ce que Kairn fait sans toi.",
  adresse: {
    intitule: "Adresse",
    raison:
      "C'est l'identité du compte : elle sert à s'y connecter, puisqu'il n'y a pas de mot de passe. La changer demande de vérifier la nouvelle avant de basculer.",
  },
  fuseau: {
    intitule: "Fuseau horaire",
    raison:
      "Détecté depuis ton navigateur à chaque visite, et corrigé tout seul si tu changes de pays. Il décide quel jour il est pour toi, et à quelle heure part ton rappel.",
  },
  langue: {
    intitule: "Langue",
    explication:
      "Celle de l'application, des emails et de tes prochains dépôts. Ce que tu as déjà déposé garde la sienne.",
    echec: "La langue n'a pas pu changer. Réessaie dans un instant.",
  },
  probleme: {
    titre: "Un problème, une remarque",
    texte:
      "Une logique qui surprend, un mot de travers, un écran qui déborde. Ça arrive à une personne, jamais aux chiffres — sans toi, personne ne le saura.",
  },
  commentCaMarche: "Comment ça marche",
  formulaire: {
    session: "La session",
    plafond: {
      intitule: "Concepts par jour",
      explication:
        "De {min} à {max}. Au-delà, une session devient une corvée qu'on abandonne au milieu, et ce qui déborde n'est pas perdu : il reste dû, et revient en tête le lendemain.",
    },
    envois: "Ce qu'on t'envoie",
    rappel: {
      intitule: "Rappel quotidien",
      explication:
        "Un email à l'heure que tu choisis, les jours où quelque chose est dû. Rien à revoir, rien n'est envoyé.",
      a: "À",
      fuseau: "dans ton fuseau.",
    },
    alerte: {
      intitule: "Alerte de série",
      explication:
        "Le soir, seulement si ta série est en cours, que rien n'a été revu et qu'il reste quelque chose à faire. La plupart des jours, elle ne part pas.",
    },
    emails: {
      intitule: "Emails",
      explication:
        "Coupé, plus rien ne part sauf le code de connexion — sans lui, personne ne pourrait plus entrer dans son compte.",
    },
    modifie: "Modifié, pas encore enregistré",
    unInstant: "Un instant",
    enregistrer: "Enregistrer",
  },
  reponses: {
    plafond: "La session porte de {min} à {max} concepts. Ce qui déborde revient le lendemain.",
    heure: "L'heure du rappel est une heure pile, de 0 à 23. Par exemple 19 h.",
    echec: "Ces réglages n'ont pas pu être enregistrés. Réessaie.",
    enregistre: "Enregistré.",
    enregistreSansEmails: "Enregistré. Emails coupés.",
  },
};
