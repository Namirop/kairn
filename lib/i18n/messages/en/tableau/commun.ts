import type { Messages } from "../../fr";

export const commun: Messages["tableau"]["commun"] = {
  chargement: "One moment.",
  erreur: {
    code: "Incident",
    codeAvecEmpreinte: "Incident {empreinte}",
    titre: "This screen couldn't load",
    explication:
      "The problem is on our end, not something you did. Try again: if the screen comes back, your data hasn't moved.",
    reessayer: "Try again",
    retourAujourdhui: "Back to Today",
  },
  introuvable: {
    titre: "This trail leads nowhere",
    explication:
      "This address doesn't exist, or no longer does. Nothing you dropped in has been deleted.",
    allerAujourdhui: "Go to Today",
    presentation: "See the overview",
  },
  extrait: {
    agrandir: "Expand",
    titre: "Code snippet",
    titreEn: "{langage} code snippet",
    fermerLExtrait: "Close the snippet",
    fermer: "Close",
  },
  fermer: "Close",
  installation: {
    ecarter: "Dismiss this suggestion",
    titre: "Keep Kairn within reach",
    texte: "On your home screen, it opens in one tap, without the browser bar.",
    installer: "Install",
    cestFait: "Done, don't suggest this again",
    dockMenu: "Open Safari's File menu.",
    dockChoix: "Choose “Add to Dock”.",
    partageMenu: "Open the Share menu.",
    partageChoix: "Choose “Add to Home Screen”.",
  },
};
