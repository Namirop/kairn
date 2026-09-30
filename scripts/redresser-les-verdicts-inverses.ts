import "dotenv/config";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { conclure, record } from "./verification/journal";

/**
 * Remettre à l'endroit les affirmations dont le verdict contredit le texte.
 *
 * **Ce qui s'est passé.** Un vrai ou faux porte son verdict dans `payload.expected` :
 * c'est lui, et lui seul, qui dit laquelle des deux propositions l'écran
 * surligne. Jusqu'au 24 septembre 2026, le prompt demandait d'y recopier la
 * **cible** reçue dans l'envoi — « écris une affirmation vraie » — et non de
 * décrire l'affirmation effectivement écrite. Un modèle qui n'arrivait pas à
 * tenir la cible avait alors intérêt à mentir sur le verdict plutôt qu'à la
 * manquer : il écrivait une affirmation fausse, la déclarait vraie, et
 * expliquait deux lignes plus bas pourquoi elle était fausse.
 *
 * Le prompt a été corrigé (commit `32500fc`) : `estVraie` décrit désormais ce
 * qui vient d'être écrit, et rater la cible est un défaut mineur qui se mesure.
 * L'audit qui l'accompagnait annonçait « un cas sur soixante-huit corrigé en
 * base ». Il en a trouvé un sur douze : les onze autres ont continué d'être
 * servis, et l'un d'eux a corrigé quelqu'un qui avait raison le 30 septembre —
 * « son `applicationId` peut être modifié tant que son nom affiché reste
 * identique », déclarée vraie.
 *
 * **Pourquoi une liste écrite à la main.** Savoir si une affirmation est vraie
 * de son concept demande de lire les deux. Aucune règle ne le calcule, et un
 * appel modèle pour trancher douze lignes coûterait plus cher que de les lire.
 * Les cent huit affirmations vivantes de la production ont donc été relues une
 * à une, contre leur concept et non contre le monde ; celles qui suivent sont
 * les douze qui se contredisent.
 *
 * **On redresse plutôt que de retirer.** L'affirmation est bonne, son étalon
 * explique déjà la vérité : seul le booléen est faux. Le retrait coûterait à
 * ces concepts leur facette `BOUNDARY` et un appel de réécriture, pour réparer
 * ce qu'un booléen répare.
 *
 * **Il se rejoue.** Chaque ligne porte le verdict tel qu'il a été constaté ; une
 * ligne qui ne le porte plus est laissée intacte et signalée. Un second passage
 * ne redresse donc rien, et ne remet pas à l'envers ce qu'il vient de remettre
 * à l'endroit.
 *
 *   npm run redresser:verdicts                   # simulation, n'écrit rien
 *   npm run redresser:verdicts -- --pour-de-vrai
 */

/**
 * Ce qu'un vrai ou faux pose à côté de sa question.
 *
 * Lu ouvert plutôt que fermé : un vrai ou faux n'y pose aujourd'hui que son
 * verdict, mais ce qui s'y trouverait en plus doit survivre au redressement.
 */
const VERDICT = z.looseObject({ expected: z.boolean() });

/**
 * Les affirmations relues, et le verdict qu'on leur a trouvé.
 *
 * `servi` est ce qui est en base, donc ce qui est faux. La correction est son
 * contraire — il n'y a pas de troisième valeur pour un vrai ou faux.
 */
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
