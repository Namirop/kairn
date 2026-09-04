import "dotenv/config";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { demanderDesQuestions } from "@/lib/db/demande-de-questions";
import { choixDUnVraiOuFaux } from "@/lib/domain/choix-proposes";
import { conclure, record } from "./verification/journal";

/**
 * Retirer les vrais ou faux qu'on ne sait plus poser, et redemander leur lot.
 *
 * **Ce qui s'est passé.** Un vrai ou faux ne porte pas ses options en base : ce
 * sont toujours les deux mêmes, et c'est le verdict qui dit laquelle est la
 * bonne. Ce verdict n'a jamais été écrit dans le `payload` — la génération le
 * rendait, l'écriture le jetait — et la seule trace qui restait était le mot
 * « Vrai » ou « Faux » en tête de la réponse-étalon. Le 02/09, le prompt a
 * interdit ce verdict en tête, à raison ; le stock a été réécrit sous ce prompt,
 * et chaque affirmation a perdu ses deux boutons du même coup. Elle est servie
 * depuis en question ouverte : une phrase posée à plat, qu'on lit comme le
 * concept à retenir — alors qu'une sur deux est fausse par construction.
 *
 * **Ce que ce script fait.** Il les retire, et il redemande le lot du concept.
 * Les deux, parce qu'aucun des deux ne suffit : le plafond hebdomadaire retarde
 * souvent la réécriture d'une semaine, et pendant cette semaine-là il ne faut
 * plus rien servir. Un concept qui perd son affirmation garde ses trois autres
 * facettes ; c'est la même perte assumée que pour une question qui renvoie à un
 * concept qu'on ne montre pas.
 *
 * Rien n'est supprimé : `retiredAt` sort la formulation du tirage, les passages
 * passés continuent de la citer, et la planification vit sur le concept.
 *
 * **Le retrait vaut pour tout le monde, la réécriture pour les comptes.** Servir
 * une contre-vérité ne coûte rien à corriger et ne se négocie pas ; réécrire
 * coûte un appel, et les essais sans compte s'éteignent d'eux-mêmes.
 *
 * **Il se rejoue.** Les deux gestes ne se déduisent pas l'un de l'autre : ce
 * qu'on retire se lit sur les affirmations vivantes, ce qu'on redemande se lit
 * sur les concepts qui n'ont plus d'affirmation servable — retirée à l'instant
 * ou lors d'un passage précédent. Un second passage ne retire donc plus rien et
 * redemande ce qui manquait encore, au lieu de ne rien trouver du tout.
 *
 *   npm run reparer:affirmations                   # simulation, n'écrit rien
 *   npm run reparer:affirmations -- --pour-de-vrai
 */

/** Ce qu'un vrai ou faux devrait poser à côté de sa question. */
const VERDICT = z.object({ expected: z.boolean() });

/** Le concept, tel que `demanderDesQuestions` le veut, et à qui il appartient. */
type Concept = { id: string; inputId: string; userId: string | null };

type Affirmation = {
  variantId: string;
  concept: Concept;
  vivante: boolean;
  muette: boolean;
};

/**
 * Toutes les affirmations, dites muettes ou non.
 *
 * Le test est celui de la lecture, et pas une règle recopiée : `choixDUnVraiOuFaux`
 * est la fonction que `questionServie` appelle pour reconstruire les deux
 * propositions. Ce qu'elle refuse ici est exactement ce qui retombe en question
 * ouverte à l'écran.
 */
async function affirmations(): Promise<Affirmation[]> {
  const vraisOuFaux = await prisma.variant.findMany({
    where: { format: "TRUE_FALSE" },
    select: {
      id: true,
      answerKey: true,
      payload: true,
      retiredAt: true,
      atom: { select: { id: true, inputId: true, userId: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return vraisOuFaux.map((variante) => {
    const verdict = VERDICT.safeParse(variante.payload);

    return {
      variantId: variante.id,
      concept: variante.atom,
      vivante: variante.retiredAt === null,
      muette:
        choixDUnVraiOuFaux(verdict.success ? verdict.data.expected : null, variante.answerKey) ===
        null,
    };
  });
}

/**
 * Les concepts qui n'ont plus d'affirmation servable, et qui en avaient une.
 *
 * On ne se fie pas à ce qu'on vient de retirer : un passage précédent a pu
 * retirer sans réussir à redemander, et ce concept-là doit rester rattrapable.
 * La condition est donc un état, pas un événement — au moins une affirmation
 * muette dans son histoire, et aucune affirmation vivante et servable.
 */
function conceptsSansAffirmation(toutes: readonly Affirmation[]): Concept[] {
  const servables = new Set(
    toutes.filter((une) => une.vivante && !une.muette).map((une) => une.concept.id),
  );
  const touches = new Map<string, Concept>();

  for (const une of toutes) {
    if (!une.muette || servables.has(une.concept.id)) continue;

    touches.set(une.concept.id, une.concept);
  }

  return [...touches.values()].filter((concept) => concept.userId !== null);
}

async function main(): Promise<string> {
  const toutes = await affirmations();
  const aRetirer = toutes.filter((une) => une.vivante && une.muette);
  const aReecrire = conceptsSansAffirmation(toutes);

  console.info(
    `${aRetirer.length} affirmation(s) sans verdict encore servie(s), et ${aReecrire.length} concept(s) de compte à réécrire.\n`,
  );

  if (aRetirer.length === 0 && aReecrire.length === 0) return "Rien à réparer.";

  if (!process.argv.includes("--pour-de-vrai")) {
    return "Simulation : rien n'a été écrit. Ajoute --pour-de-vrai pour retirer et remettre en file.";
  }

  if (aRetirer.length > 0) {
    const retirees = await prisma.variant.updateMany({
      where: { id: { in: aRetirer.map((une) => une.variantId) }, retiredAt: null },
      data: { retiredAt: new Date() },
    });

    record(
      "Affirmations retirées du tirage",
      retirees.count === aRetirer.length,
      `${retirees.count}`,
    );
  }

  const issues = new Map<string, number>();

  for (const concept of aReecrire) {
    // `reporter` parce qu'on vient de retirer une question : refuser sans rien
    // écrire laisserait le concept avec trois facettes pour toujours, alors que
    // le plafond hebdomadaire n'est qu'un délai. La demande part toute seule le
    // jour où elle devient légitime.
    const demande = await demanderDesQuestions(concept, new Date(), { reporter: true });

    issues.set(demande.etat, (issues.get(demande.etat) ?? 0) + 1);
  }

  for (const [etat, nombre] of [...issues].sort((a, b) => b[1] - a[1])) {
    record(`Demandes en état « ${etat} »`, etat !== "trop-tot", `${nombre} concept(s)`);
  }

  return "Plus aucune affirmation muette n'est servie. Les réécritures sont en file.";
}

main()
  .then(conclure)
  .catch((erreur: unknown) => {
    console.error("La réparation a échoué.", erreur);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
