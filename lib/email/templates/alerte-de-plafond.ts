import type { CompteurDeQuota } from "@/lib/db/types";
import { EMAIL_STYLE as S, renderShell } from "./shell";
import type { RenderedEmail } from "./daily-reminder";

/**
 * L'alerte d'exploitation quand un compteur d'appels se remplit.
 *
 * Elle ne s'adresse pas à un utilisateur mais à qui tient le produit, et elle a
 * un seul travail : permettre de décider sans ouvrir le tableau de bord. D'où
 * ce qu'elle porte — où en est le compteur, quelle heure il est en UTC, ce que
 * la journée a déjà coûté, et le nom exact de la variable à changer. Une alerte
 * qui oblige à aller chercher ces quatre chiffres ailleurs est une alerte qu'on
 * traite le lendemain.
 *
 * **L'heure UTC est dedans, et c'est le renseignement qu'on oublie.** « Trente-
 * six sur cinquante » ne veut pas dire la même chose à deux heures du matin qu'à
 * vingt-trois heures : dans un cas la journée fait que commencer et le plafond
 * sautera, dans l'autre elle se termine et il ne se passera rien.
 *
 * Aucun désabonnement, comme le lien de connexion : ce n'est pas un envoi
 * périodique, et le destinataire est une adresse d'exploitation, pas un compte.
 */

export type AlerteDePlafondPayload = {
  compteur: CompteurDeQuota;
  /** Le compte concerné, pour le compteur par compte. Nul pour les deux autres. */
  cible: string | null;
  seuil: number;
  utilisees: number;
  plafond: number;
  /** Le nom exact de la variable d'environnement qui porte ce plafond. */
  variable: string;
  /** Dépense du jour, en dollars, telle que le registre l'a enregistrée. */
  depenseDuJourUsd: string;
  /** L'instant de l'alerte, pour dire l'heure qu'il est en UTC. */
  instant: Date;
};

/**
 * Ce que chaque compteur s'appelle, et ce qu'on en dit quand il est plein.
 *
 * `plein` s'écrit en bas de casse : il ne commence jamais une phrase, il suit
 * toujours « Kairn — » dans un objet d'email.
 *
 * La phrase du plafond atteint est écrite entière plutôt que composée. Assemblée
 * — « … est atteint » collé derrière le nom — elle accordait au masculin sur
 * deux compteurs féminins sur trois : « la part du trafic public est atteint ».
 * Une alerte d'exploitation qui se lit de travers est une alerte qu'on relit
 * deux fois avant d'agir, et les trois phrases écrites à la main disent chacune
 * quelque chose de plus juste que la formule commune.
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

function heureUtc(instant: Date): string {
  return `${instant.toISOString().slice(11, 16)} UTC`;
}

function dollars(montant: string): string {
  const valeur = Number(montant);

  if (!Number.isFinite(valeur)) return "inconnue";

  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "USD" }).format(valeur);
}

/**
 * Le plafond atteint n'annonce pas, il constate — et c'est le seul des trois qui
 * décrive quelque chose qui se casse pendant qu'on lit.
 */
function sujet({ compteur, cible, seuil }: AlerteDePlafondPayload): string {
  const { nom, plein } = COMPTEURS[compteur];
  const qui = compteur === "COMPTE" && cible ? ` — ${cible}` : "";

  if (seuil >= 100) return `Kairn — ${plein}, des dépôts échouent${qui}`;

  return `Kairn — ${nom.toLowerCase()} est à ${seuil} %${qui}`;
}

export function renderAlerteDePlafond(payload: AlerteDePlafondPayload): RenderedEmail {
  const { compteur, cible, seuil, utilisees, plafond, variable, depenseDuJourUsd, instant } =
    payload;

  const atteint = seuil >= 100;
  const teinte = atteint ? S.alerte : S.ink;
  const constat = atteint
    ? "Des dépôts échouent en ce moment. Ils reprendront demain sans rien perdre, mais la journée est fermée."
    : "Il reste de quoi décider : relever le plafond, ou regarder ce qui consomme.";

  const lignes = [
    [`${utilisees} appels sur ${plafond}`, COMPTEURS[compteur].nom.toLowerCase()],
    [heureUtc(instant), "heure de la journée qui compte"],
    [dollars(depenseDuJourUsd), "dépensé aujourd'hui, au registre"],
    [variable, "la variable à changer"],
  ];

  const tableau = lignes
    .map(
      ([valeur, legende]) =>
        `<tr><td style="padding:0 12px 8px 0;font-family:${S.MONO};font-size:15px;color:${S.ink};white-space:nowrap;">${valeur}</td><td style="padding:0 0 8px;font-size:14px;color:${S.muted};">${legende}</td></tr>`,
    )
    .join("");

  const compteConcerne =
    compteur === "COMPTE" && cible
      ? `<p style="margin:0 0 8px;font-family:${S.MONO};font-size:13px;color:${S.muted};">compte ${cible}</p>`
      : "";

  const body = `<p style="margin:0 0 4px;font-family:${S.MONO};font-size:44px;line-height:1;color:${teinte};">${seuil} %</p>
<p style="margin:0 0 24px;font-family:${S.MONO};font-size:13px;color:${teinte};">${COMPTEURS[compteur].nom.toLowerCase()}</p>
${compteConcerne}
<p style="margin:0 0 24px;font-size:15px;line-height:23px;color:${S.muted};">${constat} ${COMPTEURS[compteur].protege}</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0;">${tableau}</table>`;

  // Les lignes vides sont des séparations voulues : seul `null` disparaît. Les
  // filtrer toutes collait les quatre blocs les uns aux autres, et la version
  // texte est celle que lisent les clients mail qui refusent le HTML.
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
    html: renderShell({
      preheader: `${utilisees} appels sur ${plafond}, ${heureUtc(instant)}.`,
      body,
      raisonDeLEnvoi:
        "Alerte d'exploitation. Elle part une fois par seuil et par jour, à l'adresse posée dans EMAIL_ALERTES.",
    }),
    text,
  };
}
