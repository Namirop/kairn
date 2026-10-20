// i18n-ignore-fichier — outil de l'administrateur, qui reste en français.
import type { CompteurDeQuota } from "@/lib/db/types";
import { STYLE_DES_EMAILS as S, envelopper, type EmailRendu } from "./gabarit";
import { heureUtc, lignesDeValeurs } from "./blocs-d-alerte";

/**
 * Quand un compteur d'appels se remplit. Doit permettre de décider sans ouvrir le
 * tableau de bord, d'où l'heure UTC (36/50 à 2 h ou à 23 h ne dit pas la même
 * chose) et la variable à changer. Pas de désabonnement : adresse d'exploitation.
 */

export type AlerteDePlafondPayload = {
  compteur: CompteurDeQuota;
  /** Nul hors du compteur par compte. */
  cible: string | null;
  seuil: number;
  utilisees: number;
  plafond: number;
  variable: string;
  /** Telle que le registre l'a enregistrée. */
  depenseDuJourUsd: string;
  instant: Date;
};

/**
 * `plein` en bas de casse : il suit « Kairn — » dans l'objet. Écrit entier, pas
 * composé de `nom`, pour l'accord en genre.
 */
const COMPTEURS: Record<CompteurDeQuota, { nom: string; plein: string; protege: string }> = {
  GLOBAL: {
    nom: "Le plafond global",
    plein: "le plafond global est atteint",
    protege: "C'est le budget du produit qui se remplit.",
  },
  COMPTE: {
    nom: "La part d'un compte",
    plein: "un compte a pris toute sa part",
    protege:
      "Ce compte-là seulement. Les autres gardent leur part, et le plafond global n'est pas en cause.",
  },
  ANONYME: {
    nom: "La part du trafic public",
    plein: "le trafic public a pris toute sa part",
    protege: "C'est ce que la landing peut prendre au produit. Les comptes gardent la leur.",
  },
};

function dollars(montant: string): string {
  const valeur = Number(montant);

  if (!Number.isFinite(valeur)) return "inconnue";

  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "USD" }).format(valeur);
}

/** À 100 %, l'objet dit ce qui casse pendant qu'on lit. */
function sujet({ compteur, cible, seuil }: AlerteDePlafondPayload): string {
  const { nom, plein } = COMPTEURS[compteur];
  const qui = compteur === "COMPTE" && cible ? ` — ${cible}` : "";

  if (seuil >= 100) return `Kairn — ${plein}, des dépôts échouent${qui}`;

  return `Kairn — ${nom.toLowerCase()} est à ${seuil} %${qui}`;
}

export function composerLAlerteDePlafond(payload: AlerteDePlafondPayload): EmailRendu {
  const { compteur, cible, seuil, utilisees, plafond, variable, depenseDuJourUsd, instant } =
    payload;

  const atteint = seuil >= 100;
  const teinte = atteint ? S.alerte : S.encre;
  const constat = atteint
    ? "Des dépôts échouent en ce moment. Ils reprendront demain sans rien perdre, mais la journée est fermée."
    : "Il reste de quoi décider : relever le plafond, ou regarder ce qui consomme.";

  const lignes: [string, string][] = [
    [`${utilisees} appels sur ${plafond}`, COMPTEURS[compteur].nom.toLowerCase()],
    [heureUtc(instant), "heure de la journée qui compte"],
    [dollars(depenseDuJourUsd), "dépensé aujourd'hui, au registre"],
    [variable, "la variable à changer"],
  ];

  const tableau = lignesDeValeurs(lignes);

  const compteConcerne =
    compteur === "COMPTE" && cible
      ? `<p style="margin:0 0 8px;font-family:${S.MONO};font-size:13px;color:${S.secondaire};">compte ${cible}</p>`
      : "";

  const corps = `<p style="margin:0 0 4px;font-family:${S.MONO};font-size:44px;line-height:1;color:${teinte};">${seuil} %</p>
<p style="margin:0 0 24px;font-family:${S.MONO};font-size:13px;color:${teinte};">${COMPTEURS[compteur].nom.toLowerCase()}</p>
${compteConcerne}
<p style="margin:0 0 24px;font-size:15px;line-height:23px;color:${S.secondaire};">${constat} ${COMPTEURS[compteur].protege}</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0;">${tableau}</table>`;

  // Les chaînes vides séparent les blocs : seul `null` disparaît.
  const text = [
    `${COMPTEURS[compteur].nom} : ${seuil} %.`,
    compteur === "COMPTE" && cible ? `Compte ${cible}.` : null,
    "",
    `${constat} ${COMPTEURS[compteur].protege}`,
    "",
    `${utilisees} appels sur ${plafond}`,
    heureUtc(instant),
    `${dollars(depenseDuJourUsd)} dépensés aujourd'hui`,
    `Variable à changer : ${variable}`,
  ]
    .filter((ligne) => ligne !== null)
    .join("\n");

  return {
    subject: sujet(payload),
    html: envelopper({
      preentete: `${utilisees} appels sur ${plafond}, ${heureUtc(instant)}.`,
      corps,
      raisonDeLEnvoi:
        "Alerte d'exploitation. Elle part une fois par seuil et par jour, à l'adresse posée dans EMAIL_ALERTES.",
    }),
    text,
  };
}
