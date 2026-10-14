/**
 * La page des tarifs et ses deux offres.
 *
 * Premium n'est pas vendu en anglais. Les clés
 * `indisponible` ne servent donc qu'à l'anglais, et `complet`, `arreter`,
 * `quand` qu'au français ; elles existent des deux côtés parce que la forme de
 * cet objet est le contrat entre les deux langues.
 */
export const tarifs = {
  meta: {
    titre: "Ce que ça coûte",
    description:
      "Cinquante concepts par mois gratuitement, cinq cents pour sept euros. Ce qui change entre les deux, et ce qui ne change pas.",
  },
  titre: "Ce que ça coûte.",
  chapeau:
    "Un concept, c'est une idée que Kairn a découpée dans ce que tu déposes, et qu'il te repose au bon moment. Tu en gardes {plafond} par mois sans payer.",
  offres: {
    conceptsParMois: "concepts par mois",
    gratuit: {
      nom: "Gratuit",
      prix: "0 €",
      cadence: "pour toujours",
      raison: "De quoi savoir si la mémoire tient, avant de payer quoi que ce soit.",
    },
    complet: {
      nom: "Complet",
      prix: "{prix} €",
      cadence: "par mois",
      second: "ou {annuel} € par an, deux mois offerts",
      raison: "De quoi alimenter un domaine entier — une documentation, un cours, une veille.",
    },
    indisponible: {
      nom: "Premium",
      titre: "Premium n'est pas encore disponible en anglais.",
      texte:
        "Il porte la limite à {concepts} nouveaux concepts par mois. Tout le reste est déjà dans le plan gratuit.",
    },
  },
  precisions: {
    titre: "Ce que le prix ne change pas.",
    identique: {
      titre: "Tout le reste est identique",
      texte:
        "Les révisions, l'entraînement, les formats de questions, le cairn : rien de tout ça ne regarde ton offre. Le seul chiffre qui change est le nombre de concepts que tu peux garder dans le mois.",
    },
    mois: {
      titre: "Le mois part de ton inscription",
      texte:
        "Pas du premier du mois. Si tu t'inscris un 12, ton compteur repart le 12. Ce qui n'a pas servi ne se reporte pas au mois suivant.",
    },
    arreter: {
      titre: "Arrêter ne te retire rien",
      texte:
        "Tes concepts restent, tes révisions continuent. Tu retournes simplement à {plafond} nouveaux concepts par mois. Rien n'est supprimé, jamais.",
    },
    quand: {
      titre: "Tu arrêtes quand tu veux",
      texte:
        "L'abonnement court jusqu'au terme déjà payé, puis s'arrête. Il n'y a pas d'engagement, et rien à demander à personne.",
    },
  },
  geste: {
    choisir: "Choisir mon offre",
    aujourdhui: "Aujourd'hui",
    commencer: "Commencer gratuitement",
    sansCarte: "Sans carte, sans engagement.",
  },
};
