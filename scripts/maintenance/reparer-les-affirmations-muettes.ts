import "dotenv/config";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { demanderDesQuestions } from "@/lib/db/demande-de-questions";
import { choixDUnVraiOuFaux } from "@/lib/domain/choix-proposes";
import { conclure, record } from "../verification/cases/journal";

/**
 * Retire les vrais ou faux muets et redemande le lot de leur concept.
 *
 * Un vrai ou faux ne porte pas ses options en base : c'est le verdict
 * (`payload.expected`) qui dit laquelle est la bonne. Sans lui, l'affirmation
 * retombe en question ouverte, posée à plat comme une vérité — alors qu'une sur
 * deux est fausse par construction.
 *
 * Retirer et redemander, parce qu'aucun des deux ne suffit : le plafond
 * hebdomadaire retarde souvent la réécriture d'une semaine, et d'ici là rien ne
 * doit être servi. `retiredAt` sort la formulation du tirage sans rien
 * supprimer : les passages la citent encore, et la planification vit sur le
 * concept.
 *
 * Le retrait vaut pour tout le monde, la réécriture pour les comptes seulement :
 * elle coûte un appel, et les essais sans compte s'éteignent d'eux-mêmes.
 *
 * Il se rejoue : ce qu'on redemande se lit sur un état (plus d'affirmation
 * servable), pas sur ce qu'on vient de retirer, donc un second passage rattrape
 * ce qu'un premier n'a pas pu redemander.
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
 * Toutes les affirmations, dites muettes ou non. Le test est celui de la
 * lecture (`choixDUnVraiOuFaux`, que `questionServie` appelle), pas une règle
 * recopiée : ce qu'il refuse est exactement ce qui retombe en question ouverte.
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
 * Les concepts de compte qui ont eu une affirmation muette et n'en ont plus de
 * servable. Un état, pas un événement : un passage précédent a pu retirer sans
 * réussir à redemander.
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
    // `reporter` : un refus sans trace laisserait le concept à trois facettes
    // pour toujours, alors que le plafond hebdomadaire n'est qu'un délai.
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
