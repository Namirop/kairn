import "dotenv/config";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { conclure, record } from "../verification/cases/journal";

/**
 * Remet à l'endroit les vrai ou faux dont `payload.expected` contredit
 * l'affirmation écrite : c'est ce booléen seul qui dit quelle proposition
 * l'écran surligne.
 *
 * La liste est écrite à la main : savoir si une affirmation est vraie de son
 * concept demande de lire les deux, et aucune règle ne le calcule. On redresse
 * plutôt que de retirer : l'affirmation et son étalon sont justes, seul le
 * booléen est faux, et un retrait coûterait la facette `BOUNDARY` et une
 * réécriture.
 *
 * Rejouable : une ligne qui ne porte plus le verdict constaté est laissée
 * intacte et signalée, donc un second passage ne remet rien à l'envers.
 *
 *   npm run redresser:verdicts                   # simulation, n'écrit rien
 *   npm run redresser:verdicts -- --pour-de-vrai
 */

/**
 * Lu ouvert : ce que le payload porterait en plus du verdict doit survivre au
 * redressement.
 */
const VERDICT = z.looseObject({ expected: z.boolean() });

/** `servi` est le verdict faux constaté en base ; la correction est son contraire. */
const INVERSEES: readonly { id: string; servi: boolean; texte: string }[] = [
  {
    id: "cmtmvf6bm001w04k00sdqoso7",
    servi: true,
    texte: "Le chiffrement du trafic applicatif suffit à masquer les domaines du DNS historique",
  },
  {
    id: "cmtmvf6ci002404k02cz5vwms",
    servi: true,
    texte: "Une annonce BGP erronée ne détourne que quelques requêtes isolées",
  },
  {
    id: "cmtn0iy8n001p04i9xtknqv4l",
    servi: true,
    texte: "Un réveil en sommeil léger désoriente une demi-heure",
  },
  {
    id: "cmtn0j2vo002l04i98bhq7d8m",
    servi: true,
    texte: "La pression de sommeil diminue pendant la journée",
  },
  {
    id: "cmtn0j2vy002p04i9kz42qzxo",
    servi: true,
    texte: "La caféine apporte de l'énergie et arrête l'accumulation d'adénosine",
  },
  {
    id: "cmtn0j2w7002s04i9xfpqkeco",
    servi: true,
    texte: "Un café pris à seize heures n'agit plus du tout à vingt-deux heures",
  },
  {
    id: "cmtn0j7ye003s04i99p7iug35",
    servi: true,
    texte: "Un adolescent qui s'endort tard le fait nécessairement par choix",
  },
  {
    id: "cmtn0jkwd004q04i9m9zwp25y",
    servi: true,
    texte: "L'humidité varie plus lentement pour les brindilles que pour les grosses branches",
  },
  {
    id: "cmtn10om4000b04ickc3tdvl6",
    servi: false,
    texte: "Une sieste longue réduit la pression de sommeil et retarde l'endormissement",
  },
  {
    id: "cmtn447vg000h04l8a391lvag",
    servi: true,
    texte: "Une asymétrie entre les deux testicules est généralement anormale",
  },
  {
    id: "cmueiqacp001304l2xunqji5s",
    servi: true,
    texte: "Un « applicationId » peut être modifié après publication",
  },
  {
    id: "cmueiqad3001704l290llhd18",
    servi: true,
    texte: "Pour « 1.0.1+2 », « versionName » vaut « 2 » et « versionCode » vaut « 1.0.1 »",
  },
];

type ARedresser = {
  id: string;
  texte: string;
  payload: z.infer<typeof VERDICT>;
  corrige: boolean;
};

/** Les lignes qui portent encore le verdict constaté, prêtes à être redressées. */
async function aRedresser(): Promise<{ pretes: ARedresser[]; ignorees: string[] }> {
  const lignes = await prisma.variant.findMany({
    where: { id: { in: INVERSEES.map((une) => une.id) }, format: "TRUE_FALSE", retiredAt: null },
    select: { id: true, payload: true },
  });
  const parId = new Map(lignes.map((ligne) => [ligne.id, ligne.payload]));
  const pretes: ARedresser[] = [];
  const ignorees: string[] = [];

  for (const relue of INVERSEES) {
    const payload = parId.get(relue.id);
    const verdict = VERDICT.safeParse(payload);

    if (!verdict.success || verdict.data.expected !== relue.servi) {
      ignorees.push(relue.texte);
      continue;
    }

    pretes.push({
      id: relue.id,
      texte: relue.texte,
      payload: verdict.data,
      corrige: !relue.servi,
    });
  }

  return { pretes, ignorees };
}

async function main(): Promise<string> {
  const { pretes, ignorees } = await aRedresser();

  console.info(
    `${pretes.length} affirmation(s) à redresser sur ${INVERSEES.length} relue(s), ${ignorees.length} déjà à l'endroit ou modifiée(s).\n`,
  );

  for (const ignoree of ignorees) console.info(`  passée — ${ignoree}`);
  for (const prete of pretes) {
    console.info(`  ${prete.corrige ? "vrai " : "faux "} ← « ${prete.texte} »`);
  }

  if (pretes.length === 0) return "Aucun verdict à redresser.";

  if (!process.argv.includes("--pour-de-vrai")) {
    return "\nSimulation : rien n'a été écrit. Ajoute --pour-de-vrai pour redresser.";
  }

  for (const prete of pretes) {
    await prisma.variant.update({
      where: { id: prete.id },
      data: { payload: { ...prete.payload, expected: prete.corrige } },
    });
  }

  record("Verdicts redressés", true, `${pretes.length} affirmation(s)`);

  return "Les affirmations relues surlignent maintenant la proposition que leur étalon explique.";
}

main()
  .then(conclure)
  .catch((erreur: unknown) => {
    console.error("Le redressement a échoué.", erreur);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
