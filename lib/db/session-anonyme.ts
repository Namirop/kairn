import { createHash } from "node:crypto";
import { prisma } from "@/lib/db/client";

/**
 * Le visiteur qui dépose avant d'avoir un compte.
 *
 * C'est le seul endroit du produit qui dépense sans compte identifié. Il est
 * donc le plus serré des verrous du budget : **deux essais dus et deux pannes
 * tolérées par visite**, **deux visites par empreinte d'adresse**, et l'arrêt à
 * l'extraction — les questions, qui coûtent l'essentiel, n'arrivent qu'après la
 * création du compte. Le pire cas complet est écrit sous `VISITES_PAR_ADRESSE`.
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

/**
 * Essais tolérés par visite quand le premier n'a rien donné.
 *
 * Un essai qui ne rend aucun concept — une liste de courses, un lien nu —
 * laisserait sinon quelqu'un devant une page morte : la visite est consommée, il
 * ne peut plus rien tenter, et il n'a rien vu du produit. Une seconde chance
 * coûte une extraction et sauve la seule page qui convertit. Un essai **réussi**,
 * lui, ferme la visite : il a montré ce qu'il avait à montrer.
 */
export const ESSAIS_PAR_VISITE = 2;

/**
 * Les pannes qu'une visite absorbe avant qu'on referme.
 *
 * Un compteur **à part**, et c'est tout l'objet de la règle. Un plafond total de
 * quatre semblait suffire — deux essais dus, deux reprises franches — mais un
 * total ne distingue pas qui l'a consommé : trois pannes d'affilée laissaient un
 * seul essai imputable au lieu de deux, et la promesse « une panne ne te coûte
 * rien » devenait fausse au moment précis où elle comptait.
 *
 * Deux compteurs indépendants la tiennent vraiment : quoi qu'il arrive de notre
 * côté, les deux essais dus restent dus. Le maximum d'extractions par visite
 * reste quatre, mais réparti et non partagé.
 */
export const PANNES_TOLEREES = 2;

/**
 * Cette visite peut-elle encore déposer ?
 *
 * **Une panne ne compte pas.** Un dépôt en `FAILED` est un incident de notre
 * côté — appel qui lève, sortie illisible, plafond atteint — et facturer un
 * essai pour ça revient à dire « tu as fait tes deux tentatives » à quelqu'un
 * qui n'en a réellement fait aucune. Le produit se serait cassé et aurait fermé
 * la porte derrière lui, sur la page qui convertit. Seul un `REJECTED` compte :
 * là, la chaîne a tourné, l'extraction est due, et c'est le texte qui n'avait
 * rien à retenir.
 *
 * La règle est la même que celle de `marquerEchec` pour un compte, qui rembourse
 * sa place à un dépôt en panne. Elle s'applique ici à la seule monnaie qu'ait un
 * visiteur : ses essais.
 *
 * Les deux compteurs sont indépendants, et c'est ce qui rend la promesse vraie :
 * épuiser les pannes tolérées ne prend rien aux essais dus, et inversement. La
 * visite se ferme dès que l'un des deux est plein.
 */
export async function sessionDisponible(sessionId: string): Promise<boolean> {
  const session = await prisma.anonymousSession.findUnique({
    where: { id: sessionId },
    select: { claimedAt: true, _count: { select: { atoms: true } } },
  });

  if (!session || session.claimedAt !== null) return false;

  // Des concepts existent : l'essai a abouti, il n'y a plus rien à démontrer.
  if (session._count.atoms > 0) return false;

  const { imputables, pannes } = await compterLesDepots(sessionId);

  return imputables < ESSAIS_PAR_VISITE && pannes < PANNES_TOLEREES;
}

/**
 * Ce qu'une visite a déjà dépensé, dans les deux monnaies.
 *
 * Un dépôt encore en cours compte comme imputable : on ne sait pas encore ce
 * qu'il rendra, et le supposer réussi ouvrirait un essai de plus à qui a deux
 * onglets. Il redeviendra une panne si c'en est une.
 */
export async function compterLesDepots(
  sessionId: string,
): Promise<{ imputables: number; pannes: number }> {
  const [imputables, pannes] = await Promise.all([
    prisma.input.count({ where: { anonymousSessionId: sessionId, status: { not: "FAILED" } } }),
    prisma.input.count({ where: { anonymousSessionId: sessionId, status: "FAILED" } }),
  ]);

  return { imputables, pannes };
}

/**
 * L'essai de cette visite a-t-il produit quelque chose ?
 *
 * Sert à choisir ce qu'on dit en refusant un dépôt de plus. « Crée un compte pour
 * garder tes concepts » à quelqu'un qui n'en a aucun désigne du vide, et fait
 * passer une invitation pour une erreur.
 */
export async function essaiAbouti(sessionId: string): Promise<boolean> {
  return (await prisma.atom.count({ where: { anonymousSessionId: sessionId } })) > 0;
}

