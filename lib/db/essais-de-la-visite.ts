import { prisma } from "@/lib/db/client";

/**
 * Ce qu'une visite sans compte peut encore dépenser.
 *
 * Séparé de `session-anonyme.ts`, qui décide **qui** a le droit d'ouvrir une
 * visite : ici, la visite existe déjà et la question est ce qu'il lui reste. Les
 * deux règles se lisaient dans le même fichier tant qu'un cookie ne valait qu'un
 * seul dépôt ; depuis que les essais se renouvellent, celle-ci a sa propre
 * fenêtre, ses propres compteurs, et de quoi tenir seule.
 */

/**
 * Essais accordés à une visite, par tranche de vingt-quatre heures.
 *
 * **Ils sont dus quoi qu'il arrive, et le succès n'en consomme plus la totalité.**
 * La règle précédente refermait la visite dès qu'un essai avait rendu des
 * concepts : il avait « montré ce qu'il avait à montrer », donc la porte se
 * fermait derrière lui pour les sept jours du cookie. Ça tenait tant que l'essai
 * était une démonstration à voir une fois ; ça ne tient plus dès qu'on admet la
 * raison la plus courante de vouloir recommencer — le premier texte était un
 * bout de n'importe quoi collé pour voir, et le vrai vient après.
 *
 * Deux, et pas plus : c'est ce qui laisse retenter sans faire de la landing un
 * compte gratuit déguisé.
 */
export const ESSAIS_PAR_VISITE = 2;

/**
 * La fenêtre sur laquelle les essais d'une visite se comptent.
 *
 * **Glissante, et c'est elle qui rouvre la porte le lendemain.** Comptés sur la
 * vie entière de la visite, les essais s'épuisaient une fois pour toutes : le
 * cookie dure sept jours, donc quelqu'un qui revient le lendemain retrouvait un
 * refus jusqu'à la semaine suivante, sur une page qui n'a rien d'autre à
 * proposer qu'un essai.
 *
 * L'autre chemin — ouvrir une visite neuve au retour — aurait laissé la
 * précédente derrière : la reprise au compte se fait par le cookie, et ce qu'il
 * ne désigne plus n'est plus repris par personne. Compter sur une fenêtre plutôt
 * que déplacer le cookie garde tout ce qui a été déposé rattachable, du premier
 * jour au septième.
 *
 * Elle vaut la même chose que la fenêtre par adresse sans en dépendre : les deux
 * bornent des choses différentes — celle-ci un navigateur, l'autre une sortie
 * réseau — et rien n'exige qu'elles bougent ensemble.
 */
export const FENETRE_ESSAIS_HEURES = 24;

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
 * côté, les deux essais dus restent dus. Le maximum d'extractions reste quatre
 * par visite et par tranche de vingt-quatre heures, mais réparti et non partagé.
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
 * visite se ferme dès que l'un des deux est plein, et se rouvre quand la fenêtre
 * de vingt-quatre heures a fini de passer dessus.
 *
 * Une visite réclamée, elle, ne se rouvre jamais : son contenu appartient à un
 * compte. Elle n'interdit rien pour autant — c'est une visite neuve qui prend le
 * relais, voir `etatDeLaVisite`.
 */
export type EtatDeLaVisite = "ouverte" | "epuisee" | "close";

/**
 * Trois états, et le troisième manquait.
 *
 * **Une visite close n'est pas une visite épuisée**, et les confondre a fermé la
 * landing à quelqu'un qui n'avait rien dépensé. Le cookie vit sept jours et
 * survit à ce qu'il désigne : une visite réclamée par un compte, une visite
 * purgée de la base. Dans les deux cas il n'y a rien à compter — donc rien à
 * refuser. C'est une visite de plus qui commence, et le plafond par adresse
 * reste seul juge de savoir s'il en reste une à ouvrir.
 *
 * « Une visite réclamée ne se rouvre jamais » reste vrai, et c'est bien ce qui se
 * passe : elle ne se rouvre pas, une autre s'ouvre. Ce qu'elle contient
 * appartient au compte et n'est repris par personne d'autre.
 */
export async function etatDeLaVisite(sessionId: string): Promise<EtatDeLaVisite> {
  const session = await prisma.anonymousSession.findUnique({
    where: { id: sessionId },
    select: { claimedAt: true },
  });

  if (!session || session.claimedAt !== null) return "close";

  const { imputables, pannes } = await compterLesDepots(sessionId);

  return imputables < ESSAIS_PAR_VISITE && pannes < PANNES_TOLEREES ? "ouverte" : "epuisee";
}

export async function sessionDisponible(sessionId: string): Promise<boolean> {
  return (await etatDeLaVisite(sessionId)) !== "epuisee";
}

/**
 * Ce qu'une visite a dépensé sur les vingt-quatre dernières heures, dans les
 * deux monnaies.
 *
 * Un dépôt encore en cours compte comme imputable : on ne sait pas encore ce
 * qu'il rendra, et le supposer réussi ouvrirait un essai de plus à qui a deux
 * onglets. Il redeviendra une panne si c'en est une.
 *
 * `maintenant` est un paramètre parce que les scripts de vérification ont besoin
 * de se placer après la fenêtre sans attendre un jour, et parce qu'une fonction
 * qui lit l'horloge elle-même n'est éprouvable qu'en la déréglant.
 */
export async function compterLesDepots(
  sessionId: string,
  maintenant: Date = new Date(),
): Promise<{ imputables: number; pannes: number }> {
  const depuis = new Date(maintenant.getTime() - FENETRE_ESSAIS_HEURES * 60 * 60 * 1000);
  const dansLaFenetre = { anonymousSessionId: sessionId, createdAt: { gte: depuis } };

  const [imputables, pannes] = await Promise.all([
    prisma.input.count({ where: { ...dansLaFenetre, status: { not: "FAILED" } } }),
    prisma.input.count({ where: { ...dansLaFenetre, status: "FAILED" } }),
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
