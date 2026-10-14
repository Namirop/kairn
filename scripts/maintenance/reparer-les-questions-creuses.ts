import "dotenv/config";
import { prisma } from "@/lib/db/client";
import { demanderDesQuestions } from "@/lib/db/demande-de-questions";
import { optionsDUnQCM, texteATrouServi, type VarianteEnBase } from "@/lib/db/question-servie";
import { optionsDistinguables } from "@/lib/domain/options-de-qcm";
import { questionServable } from "@/lib/domain/question-servable";
import { conclure, noter } from "../verification/cases/journal";

/**
 * Retire les questions que l'écran ne sait pas poser (un lot abrégé en « ... »
 * passé avant `porteDuTexte` et `optionsDistinguables`), et redemande le lot
 * des concepts qui n'ont plus rien de servable. Les deux : le plafond
 * hebdomadaire retarde souvent la réécriture, et d'ici là rien ne doit être
 * servi.
 *
 * Rien n'est supprimé : `retiredAt` sort la formulation du tirage, les passages
 * passés continuent de la citer. Le retrait vaut pour tout le monde, la
 * réécriture (un appel) pour les comptes seuls. Le script se rejoue : un second
 * passage ne retire plus rien et redemande ce qui manquait encore.
 *
 *   npm run reparer:creuses                   # simulation, n'écrit rien
 *   npm run reparer:creuses -- --pour-de-vrai
 */

/** Le concept, tel que `demanderDesQuestions` le veut, et à qui il appartient. */
type Concept = { id: string; inputId: string; userId: string | null };

type Formulation = { variantId: string; concept: Concept; vivante: boolean; creuse: boolean };

/**
 * L'écran sait-il poser cette question telle que son format l'annonce ? Le
 * test réutilise `questionServable` et les fonctions de `questionServie`, pas
 * une règle recopiée.
 *
 * Un QCM indistinct ou un texte à trou sans trou comptent creux, alors que la
 * lecture les replierait en question ouverte : ce repli vaut pour une charge
 * abîmée sous un énoncé sain, et ici l'énoncé vient du même lot abrégé.
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
 * Les concepts de compte qui n'ont plus une seule question servable. Un état,
 * pas un événement : un passage précédent a pu retirer sans redemander.
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

    noter("Questions retirées du tirage", retirees.count === aRetirer.length, `${retirees.count}`);
  }

  const issues = new Map<string, number>();

  for (const concept of aReecrire) {
    // `reporter` : refuser sans rien écrire laisserait le concept sans question
    // pour toujours, alors que le plafond hebdomadaire n'est qu'un délai.
    const demande = await demanderDesQuestions(concept, new Date(), { reporter: true });

    issues.set(demande.etat, (issues.get(demande.etat) ?? 0) + 1);
  }

  for (const [etat, nombre] of [...issues].sort((a, b) => b[1] - a[1])) {
    noter(`Demandes en état « ${etat} »`, etat !== "trop-tot", `${nombre} concept(s)`);
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
