/** Emporter ses données, ou effacer son compte. */
export const donnees = {
  titre: "Tes données",
  texte:
    "Tu peux emporter ce que tu as déposé à tout moment : un fichier avec tes dépôts, les concepts qui en ont été tirés, leurs questions et tes passages.",
  telecharger: "Télécharger mes données",
  /** Le nom du fichier exporté ; `date` arrive en AAAA-MM-JJ. */
  fichier: "kairn-mes-donnees-{date}.json",
  avertissement:
    "Ça efface le compte, tes dépôts, tes concepts, leurs questions et tous tes passages. C'est immédiat et il n'y a pas de retour en arrière. Pense à télécharger tes données avant.",
  recopie: "Recopie « {mot} » pour confirmer",
  suppression: "Suppression…",
  supprimer: "Supprimer définitivement",
  annuler: "Annuler",
  ouvrir: "Supprimer mon compte",
  erreurs: {
    confirmation: "Recopie « {mot} » pour confirmer.",
    abonnement:
      "Ton abonnement n'a pas pu être arrêté, et on ne supprime pas un compte qui paie encore. Réessaie dans un instant.",
    introuvable: "Ce compte est introuvable.",
  },
};
