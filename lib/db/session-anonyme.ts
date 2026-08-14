import { createHash } from "node:crypto";
import { prisma } from "@/lib/db/client";

/**
 * Le visiteur qui dépose avant d'avoir un compte.
 *
 * C'est le seul endroit du produit qui dépense sans compte identifié. Il est
 * donc le plus serré des trois verrous du budget : **un dépôt par session**, une
 * poignée par empreinte d'adresse, et l'arrêt à l'extraction — les questions,
 * qui coûtent l'essentiel, n'arrivent qu'après la création du compte.
 *
 * Rien ici ne conserve d'adresse IP. Ce qu'on veut compter est « combien de
 * dépôts viennent d'ici », et une empreinte y répond aussi bien sans garder de
 * donnée qui désigne quelqu'un. Elle est salée par le secret d'application :
 * une base volée ne se retourne pas en liste d'adresses.
 */

/**
 * Sessions anonymes tolérées par empreinte d'adresse, sur la fenêtre.
 *
 * Deux, et pas une. Une seule par adresse serait le réglage évident si une
 * adresse désignait une personne — mais elle n'en désigne pas une. Un bureau, un
 * coworking, une école ou un opérateur mobile derrière son CGNAT sortent tous
 * par une seule IPv4 : à une visite par adresse, le premier arrivé grillerait
 * l'essai de tous les autres pour la journée, et précisément dans les endroits
 * où quelqu'un partage un outil à ses collègues.
 *
 * Serrer davantage ne protégerait d'ailleurs de personne : basculer en 4G ou
 * ouvrir un VPN change d'adresse en cinq secondes. Ce verrou-ci freine le
 * passant qui recommence, pas l'abuseur — c'est `AI_DAILY_CALL_CAP` qui borne la
 * dépense, et lui ne se contourne pas.
 */
export const DEPOTS_PAR_ADRESSE = 2;

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

    if (recentes >= DEPOTS_PAR_ADRESSE) return { ouverte: false, motif: "adresse" };
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
 * Le plafond dur, celui que même nos propres pannes ne franchissent pas.
 *
 * Une panne ne consomme pas d'essai — voir plus bas — et sans cette borne, une
 * panne *systématique* rendrait la visite infinie : chaque reprise repart pour
 * une extraction, et la seule chose qui finirait par arrêter la page serait le
 * plafond journalier du produit entier. Quatre laisse deux reprises franches
 * par-dessus les deux essais dus, et referme après.
 */
export const ESSAIS_MAXIMUM_PAR_VISITE = 4;

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
 */
export async function sessionDisponible(sessionId: string): Promise<boolean> {
  const session = await prisma.anonymousSession.findUnique({
    where: { id: sessionId },
    select: { claimedAt: true, _count: { select: { atoms: true } } },
  });

  if (!session || session.claimedAt !== null) return false;

  // Des concepts existent : l'essai a abouti, il n'y a plus rien à démontrer.
  if (session._count.atoms > 0) return false;

  const [total, imputables] = await Promise.all([
    prisma.input.count({ where: { anonymousSessionId: sessionId } }),
    prisma.input.count({ where: { anonymousSessionId: sessionId, status: { not: "FAILED" } } }),
  ]);

  if (total >= ESSAIS_MAXIMUM_PAR_VISITE) return false;

  return imputables < ESSAIS_PAR_VISITE;
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

