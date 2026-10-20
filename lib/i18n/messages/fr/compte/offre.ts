/**
 * `indisponible` ne s'affiche qu'en anglais, où Premium n'est pas vendu ; la
 * clé existe des deux côtés, la forme des messages étant le contrat.
 */
export const offre = {
  titre: "Ton offre",
  complet: "Complet",
  gratuit: "Gratuit",
  parMois: "{plafond} concepts par mois",
  voirTarifs: "Voir les tarifs",
  etat: {
    arrete:
      "Ton abonnement est arrêté. L'accès court jusqu'au {terme}, puis tu retrouves l'offre gratuite. Rien n'est supprimé, jamais.",
    paye: "Ton paiement est passé. Ton offre court jusqu'au {terme}.",
    renouvele: "Renouvelé le {terme}. Tu peux arrêter quand tu veux.",
    enRoute:
      "Ton paiement est passé. Il faut quelques secondes pour qu'il arrive jusqu'ici — cet écran se met à jour tout seul.",
    ferme: "Le paiement n'est pas encore ouvert.",
    gratuit: "Tout ce que le produit sait faire est ouvert. C'est le volume qui est borné.",
  },
  indisponible: "Premium n'est pas encore disponible en anglais.",
  attente:
    "Le retour de Stripe tarde plus que d'habitude. Ton paiement n'est pas perdu : recharge la page dans un moment, ou écris-nous si l'offre n'a pas changé demain.",
  complete: {
    titre: "L'offre complète",
    texte:
      "Sur la même période que la tienne. Le reste ne change pas : ce que tu as déposé, ta série, ton cairn.",
  },
  achat: {
    mensuel: "Payer {prix} € par mois",
    annuel: "Payer {prix} € par an",
    note: "L'année revient à dix mois payés pour douze. La carte se saisit chez Stripe.",
  },
  reprendre: "Reprendre l'abonnement",
  arreter: "Arrêter le renouvellement",
  portail: "Factures et moyen de paiement",
  erreurs: {
    tropVite: "Trop de demandes coup sur coup. Laisse passer quelques secondes.",
    sessionExpiree: "Ta session a expiré. Reconnecte-toi.",
    echec: "Le paiement n'a pas pu s'ouvrir. Réessaie dans un instant.",
    dejaAbonne: "Ton abonnement est déjà ouvert. Recharge la page pour voir où il en est.",
    portailFerme: "Tes factures ne s'ouvrent pas pour l'instant. Réessaie dans un instant.",
    offreInconnue: "Cette offre n'existe pas.",
    gesteInconnu: "Ce geste n'existe pas.",
    arretEchoue: "L'arrêt n'a pas pu être enregistré.",
    repriseEchouee: "La reprise n'a pas pu être enregistrée.",
  },
};
