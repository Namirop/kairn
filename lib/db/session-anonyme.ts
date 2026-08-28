import { createHash } from "node:crypto";
import { prisma } from "@/lib/db/client";

/**
 * L'ouverture d'une visite : qui a le droit de déposer sans compte.
 *
 * Ce qu'il **reste** à une visite ouverte se compte dans
 * `essais-de-la-visite.ts` — deux règles, deux fenêtres, deux fichiers.
 *
 * C'est le seul endroit du produit qui dépense sans compte identifié. Il est
 * donc le plus serré des verrous du budget : **deux essais dus et deux pannes
 * tolérées par visite et par tranche de vingt-quatre heures**, **deux visites
 * par empreinte d'adresse**, et un seul concept questionné — les trois autres
 * lots de questions n'arrivent qu'après la création du compte. Le pire cas
 * complet est écrit sous `VISITES_PAR_ADRESSE`.
 *
 * Rien ici ne conserve d'adresse IP. Ce qu'on veut compter est « combien de
 * dépôts viennent d'ici », et une empreinte y répond aussi bien sans garder de
 * donnée qui désigne quelqu'un. Elle est salée par le secret d'application :
 * une base volée ne se retourne pas en liste d'adresses.
 */

/**
 * **Visites** tolérées par empreinte d'adresse, sur la fenêtre — pas dépôts.
 *
 * Le nom précédent, `DEPOTS_PAR_ADRESSE`, mentait sur ce qui est compté : la
 * constante borne les appels à `ouvrirUneSession`, donc des visites, et chaque
 * visite porte plusieurs dépôts. On lisait « deux dépôts par adresse » là où le
 * vrai maximum est quatre fois plus haut.
 *
 * **Le pire cas par empreinte et par 24 h se lit ici, et nulle part ailleurs :**
 *
 *     2 visites × (2 essais dus + 2 pannes tolérées) = 8 extractions
 *
 * **Ce compte-là ne vaut que pour des visites neuves.** Un navigateur qui garde
 * son cookie ne repasse jamais par ici : il puise dans les essais de sa propre
 * visite, renouvelés toutes les vingt-quatre heures, et la sortie réseau qu'il
 * emprunte n'en sait rien. Sur les sept jours du cookie, ça fait quatorze
 * extractions imputables pour un seul visiteur obstiné — et c'est assumé pour la
 * même raison que le reste : ce verrou-ci freine le passant qui recommence, la
 * dépense est bornée par le plafond journalier d'appels.
 *
 * Deux visites, et pas une. Une seule par adresse serait le réglage évident si
 * une adresse désignait une personne — mais elle n'en désigne pas une. Un
 * bureau, un coworking, une école ou un opérateur mobile derrière son CGNAT
 * sortent tous par une seule IPv4 : à une visite par adresse, le premier arrivé
 * grillerait l'essai de tous les autres pour la journée, et précisément dans les
 * endroits où quelqu'un partage un outil à ses collègues.
 *
 * Serrer davantage ne protégerait d'ailleurs de personne : basculer en 4G ou
 * ouvrir un VPN change d'adresse en cinq secondes. Ce verrou-ci freine le
 * passant qui recommence, pas l'abuseur — c'est le plafond journalier d'appels
 * qui borne la dépense, et lui ne se contourne pas.
 */
export const VISITES_PAR_ADRESSE = 2;

/** La fenêtre de la limite par adresse. Un jour : on n'est pas à la minute. */
export const FENETRE_ADRESSE_HEURES = 24;

export function empreinteDeLAdresse(adresse: string): string {
  const sel = process.env.BETTER_AUTH_SECRET ?? "";

  return createHash("sha256").update(`${sel}:${adresse}`).digest("hex").slice(0, 32);
}

export type OuvertureDeSession =
  { ouverte: true; sessionId: string } | { ouverte: false; motif: "adresse" };

/**
 * Ouvre une session de visite, ou la refuse.
 *
 * Le refus par empreinte se lit avant d'écrire : c'est une lecture puis une
 * écriture, donc une course, et deux visiteurs simultanés depuis la même adresse
 * peuvent passer à trois. C'est assumé — la conséquence d'une course ici est un
 * dépôt de plus, soit deux centimes, là où la fermer demanderait une table de
 * compteurs pour des lignes qu'on efface au bout d'une semaine.
 *
 * `sansCompte` porte l'échappement de vérification en ligne, décidé par
 * `lib/depots/essai-sans-limite.ts` et passé en paramètre plutôt que relu ici :
 * l'accès aux données ne lit pas d'interrupteur, sinon la même fonction ne fait
 * plus la même chose selon l'environnement et les scripts de vérification n'ont
 * plus de prise dessus.
 */
export async function ouvrirUneSession(
  adresse: string,
  sansCompte = false,
): Promise<OuvertureDeSession> {
  const ipHash = empreinteDeLAdresse(adresse);

  if (!sansCompte) {
    const depuis = new Date(Date.now() - FENETRE_ADRESSE_HEURES * 60 * 60 * 1000);
    const recentes = await prisma.anonymousSession.count({
      where: { ipHash, createdAt: { gte: depuis } },
    });

    if (recentes >= VISITES_PAR_ADRESSE) return { ouverte: false, motif: "adresse" };
  }

  const session = await prisma.anonymousSession.create({
    data: { ipHash },
    select: { id: true },
  });

  return { ouverte: true, sessionId: session.id };
}
