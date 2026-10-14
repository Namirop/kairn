import "dotenv/config";
import { prisma } from "@/lib/db/client";
import { demanderDesQuestions } from "@/lib/db/demande-de-questions";
import { optionsDUnQCM, texteATrouServi, type VarianteEnBase } from "@/lib/db/question-servie";
import { optionsDistinguables } from "@/lib/domain/options-de-qcm";
import { questionServable } from "@/lib/domain/question-servable";
import { conclure, record } from "../verification/cases/journal";

/**
 * Retirer les questions que l'écran ne sait pas poser, et redemander leur lot.
 *
 * **Ce qui s'est passé.** Le 23 septembre 2026, un lot est arrivé abrégé : le
 * modèle a écrit la première question du concept, puis posé « ... » partout
 * ailleurs — énoncé, étalon, phrase trouée, quatre options de QCM. L'appel
 * n'avait pas été tronqué et la grammaire était satisfaite ; trois points ne
 * sont pas une chaîne vide, et c'est tout ce que les filets refusaient. Une
 * carte portant « ... » a été servie en session le 26.
 *
 * Les filets ont été resserrés — voir `porteDuTexte` et `optionsDistinguables`.
 * Ils valent pour ce qui s'écrit ; ce script s'occupe de ce qui est déjà écrit.
 *
 * **Ce qu'il fait.** Il retire les questions qu'on ne sait pas poser telles que
 * leur format les annonce, et il redemande le lot des concepts qui n'ont plus
 * rien de servable. Les deux, parce qu'aucun des deux ne suffit : le plafond
 * hebdomadaire retarde souvent la réécriture, et pendant ce temps-là il ne faut
 * plus rien servir.
 *
 * Rien n'est supprimé : `retiredAt` sort la formulation du tirage, les passages
 * passés continuent de la citer, et la planification vit sur le concept.
 *
 * **Le retrait vaut pour tout le monde, la réécriture pour les comptes.** Servir
 * une carte vide ne coûte rien à corriger ; réécrire coûte un appel, et les
 * essais sans compte s'éteignent d'eux-mêmes.
 *
 * **Il se rejoue.** Le retrait se lit sur les questions vivantes, la réécriture
 * sur les concepts qui n'ont plus de question servable — retirée à l'instant ou
 * lors d'un passage précédent. Un second passage ne retire donc plus rien et
 * redemande ce qui manquait encore.
 *
 *   npm run reparer:creuses                   # simulation, n'écrit rien
 *   npm run reparer:creuses -- --pour-de-vrai
 */

/** Le concept, tel que `demanderDesQuestions` le veut, et à qui il appartient. */
type Concept = { id: string; inputId: string; userId: string | null };

type Formulation = { variantId: string; concept: Concept; vivante: boolean; creuse: boolean };

/**
 * L'écran sait-il poser cette question telle que son format l'annonce ?
 *
 * Le test est celui de la lecture, et pas une règle recopiée : `questionServable`
 * décide déjà de ce qui entre dans une session, et les deux autres passent par
 * les fonctions que `questionServie` appelle pour reconstruire la charge. Ce
 * qu'on relève ici est donc exactement ce qui ne se pose pas à l'écran.
 *
 * Un QCM dont les options ne se distinguent pas et un texte à trou sans trou
 * sont comptés creux, alors que la lecture les ferait simplement retomber en
 * question ouverte. Ce repli existe pour une charge abîmée sous un énoncé sain ;
 * ici l'énoncé vient du même lot abrégé, et le concept est réécrit de toute
 * façon.
 */
function creuse(variante: VarianteEnBase): boolean {
  if (!questionServable(variante)) return true;

  if (variante.format === "MCQ") {
    const options = optionsDUnQCM(variante.format, variante.payload);

    return options === null || !optionsDistinguables(options);
  }

  if (variante.format === "CLOZE")
    return texteATrouServi(variante.format, variante.payload) === null;

  return false;
}

async function formulations(): Promise<Formulation[]> {
  const variantes = await prisma.variant.findMany({
    select: {
      id: true,
      format: true,
      facet: true,
      question: true,
      answerKey: true,
      payload: true,
      retiredAt: true,
      atom: { select: { id: true, inputId: true, userId: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return variantes.map((variante) => ({
    variantId: variante.id,
    concept: variante.atom,
    vivante: variante.retiredAt === null,
    creuse: creuse(variante),
  }));
}

/**
 * Les concepts de compte qui n'ont plus une seule question servable.
 *
 * La condition est un état, pas un événement : un passage précédent a pu
 * retirer sans réussir à redemander, et ce concept-là doit rester rattrapable.
 */
function conceptsSansQuestion(toutes: readonly Formulation[]): Concept[] {
  const servables = new Set(
    toutes.filter((une) => une.vivante && !une.creuse).map((une) => une.concept.id),
  );
  const touches = new Map<string, Concept>();

  for (const une of toutes) {
    if (!une.creuse || servables.has(une.concept.id)) continue;

    touches.set(une.concept.id, une.concept);
  }

  return [...touches.values()].filter((concept) => concept.userId !== null);
}

async function main(): Promise<string> {
  const toutes = await formulations();
  const aRetirer = toutes.filter((une) => une.vivante && une.creuse);
  const aReecrire = conceptsSansQuestion(toutes);

  console.info(
    `${aRetirer.length} question(s) creuse(s) encore servie(s) sur ${toutes.length}, et ${aReecrire.length} concept(s) de compte à réécrire.\n`,
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

    record("Questions retirées du tirage", retirees.count === aRetirer.length, `${retirees.count}`);
  }

  const issues = new Map<string, number>();

  for (const concept of aReecrire) {
    // `reporter` parce qu'on vient de retirer : refuser sans rien écrire
    // laisserait le concept sans aucune question pour toujours, alors que le
    // plafond hebdomadaire n'est qu'un délai.
    const demande = await demanderDesQuestions(concept, new Date(), { reporter: true });

    issues.set(demande.etat, (issues.get(demande.etat) ?? 0) + 1);
  }

  for (const [etat, nombre] of [...issues].sort((a, b) => b[1] - a[1])) {
    record(`Demandes en état « ${etat} »`, etat !== "trop-tot", `${nombre} concept(s)`);
  }

  return "Plus aucune question creuse n'est servie. Les réécritures sont en file.";
}

main()
  .then(conclure)
  .catch((erreur: unknown) => {
    console.error("La réparation a échoué.", erreur);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
