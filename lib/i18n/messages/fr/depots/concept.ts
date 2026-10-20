import type { VariantFacet, VariantFormat } from "@/lib/db/types";

/** Un concept sur la page de son dépôt, et ce qu'on peut en faire. */
export const concept = {
  questionsEcrites: "{nombre, plural, =1 {# question écrite} other {# questions écrites}}",
  reecrire: "Réécrire le concept",
  avertissementReecriture:
    "Les questions écrites sur l'ancienne formulation seront remplacées, et la planification repart de zéro.",
  enregistrer: "Enregistrer",
  annuler: "Annuler",
  aVerifier: "À vérifier",
  sortiDuCycle: "Sorti du cycle",
  douteux:
    "Ce passage a été extrait tel que tu l'as déposé, mais il paraît factuellement douteux. Personne ne l'a vérifié — aucune question n'a été écrite dessus pour ne pas river une erreur.",
  declareSu: "Tu l'as déclaré su. Il revient dans trois mois pour vérifier.",
  remettreEnRevision: "Remettre en révision",
  supprimer: "Supprimer",
  supprimerCeConcept: "Supprimer ce concept",
  consequence:
    "Ses questions et les passages que tu as faits dessus partent avec. Ça ne se défait pas.",
  garderTelQuel: "Le garder tel quel",
  modifier: "Modifier",
};

/** L'enum parle la langue du schéma ; le `Record` refuse une facette sans libellé. */
export const facettes: Record<VariantFacet, string> = {
  RECOGNITION: "Reconnaître",
  MECHANISM: "Expliquer",
  BOUNDARY: "Délimiter",
  APPLICATION: "Appliquer",
};

/** Le pendant de `facettes` pour les formats. */
export const formats: Record<VariantFormat, string> = {
  MCQ: "QCM",
  CLOZE: "Texte à trou",
  TRUE_FALSE: "Vrai ou faux",
  SHORT_ANSWER: "Réponse courte",
  CODE: "Code",
  EXPLAIN: "Explication",
};
