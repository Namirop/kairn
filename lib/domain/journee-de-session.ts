import { alternerLesSujets } from "./alternance-des-sujets";
import { gesteDeReponse } from "./geste-de-reponse";
import { questionServable, type FormulationLisible } from "./question-servable";
import { repartirLesFormats, type VarianteRepartissable } from "./repartition-des-formats";
import { variantesEquivalentes, type VarianteServable } from "./rotation-variantes";
import { conceptsDeLaJournee, estServableAujourdhui, type ConceptDu } from "./selection-session";

/**
 * La journée d'une session une fois les candidats lus : quels concepts, sous
 * quelle formulation, dans quel ordre.
 */

/** Ce qu'une variante doit porter pour être filtrée, tournée et répartie. */
export type VarianteDeSession = VarianteServable & VarianteRepartissable & FormulationLisible;

export type ConceptCandidat = ConceptDu & { variants: VarianteDeSession[] };

/** La variante que porte ce concept, avec tout ce que l'appelant y a lu. */
type VarianteDe<T extends ConceptCandidat> = T["variants"][number];

export type ConceptProposable<T extends ConceptCandidat> = T & {
  equivalentes: VarianteDe<T>[];
};

export type JourneeComposee<T extends ConceptCandidat> = {
  /** Les concepts servis, dans l'ordre de service, chacun avec sa formulation. */
  servis: (ConceptProposable<T> & { variante: VarianteDe<T> })[];
  /** Tout ce qui est dû aujourd'hui, plafond ignoré. */
  dus: number;
};

/**
 * Les candidats qui ont au moins une formulation posable, avec celles que la
 * rotation juge également bonnes.
 */
export function conceptsProposables<T extends ConceptCandidat>(
  candidats: T[],
  derniereFacetteDe: (concept: T) => string | null,
): ConceptProposable<T>[] {
  return candidats.flatMap((atome) => {
    // Une formulation vide se trie ici : un `not: ""` en SQL laisserait passer
    // une espace.
    const equivalentes = variantesEquivalentes(
      atome.variants.filter(questionServable),
      derniereFacetteDe(atome),
    );

    return equivalentes.length > 0 ? [{ ...atome, equivalentes }] : [];
  });
}

export function composerLaJournee<T extends ConceptCandidat>(
  candidats: T[],
  derniereFacetteDe: (concept: T) => string | null,
  maintenant: Date,
  fuseau: string,
  reste: number,
): JourneeComposee<T> {
  /*
    La journée est composée avant de choisir les formulations : la requête
    ramène 36 h d'avance, et répartir les formats sur tous les candidats ferait
    consommer des QCM par des concepts dus demain.

    Le répartiteur reçoit l'ordre des identifiants, pas celui de l'urgence : le
    glouton en dépend, et une session doit se recomposer à l'identique.
  */
  const proposables = conceptsProposables(candidats, derniereFacetteDe);

  const dus = proposables.filter((concept) => estServableAujourdhui(concept, maintenant, fuseau));
  const retenus = conceptsDeLaJournee(proposables, maintenant, fuseau, reste);

  const ordreStable = [...retenus].sort((une, deux) => une.id.localeCompare(deux.id));
  const choisies = repartirLesFormats(ordreStable.map((concept) => concept.equivalentes));
  const parConcept = new Map(ordreStable.map((concept, rang) => [concept.id, choisies[rang]]));

  const servis = alternerLesSujets(
    retenus.flatMap((concept) => {
      const variante = parConcept.get(concept.id);

      // Écarté plus haut en principe ; on ne pose pas une carte vide au cas où.
      return variante ? [{ ...concept, variante }] : [];
    }),
    (concept) => gesteDeReponse(concept.variante.format),
  );

  return { servis, dus: dus.length };
}
