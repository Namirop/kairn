import type { SortieDExtraction, SortieDeGeneration } from "@/lib/ai/schemas";
import type { LangueDuProduit } from "@/lib/domain/langue-du-produit";
import type { Manquement } from "@/lib/domain/manquement";
import type { NatureDuDepot } from "@/lib/domain/nature-du-depot";

/** Ce qu'un passage du banc rend sur un dépôt, concept par concept. */

export type Concept = SortieDExtraction["atoms"][number];

export type Echec = {
  motif: string;
  brut?: string;
  /** Ce que le modèle avait rendu, tableau par tableau. Voir `compterLesElements`. */
  elements?: string;
};

export type VariantRendu = SortieDeGeneration["lots"][number]["variants"][number];

/**
 * Une question telle qu'elle sera servie : le banc mesure ce que le produit
 * montre, donc après la même remise en ordre des options qu'un Variant écrit.
 * `rangBrut` garde la position donnée par le modèle ; l'écart entre les deux
 * répartitions dit combien le serveur corrige.
 */
export type VariantEvalue = VariantRendu & {
  rangBrut: number | null;
  /** La valeur que l'envoi avait imposée, sur les vrai ou faux seulement. */
  cible: boolean | null;
};

export type ConceptEvalue = {
  concept: Concept;
  manquements: Manquement[];
  variants: VariantEvalue[];
  manquementsVariants: Manquement[];
  echec?: Echec;
  /** Douteux : aucune question n'a été demandée pour ce concept. */
  misDeCote?: boolean;
};

export type DepotEvalue = {
  nom: string;
  texte: string;
  /** La langue de la personne, donc celle qu'on attend en sortie. */
  langue: LangueDuProduit;
  lecture?: { langue: string | null; exploitable: boolean };
  /** Absentes quand l'extraction a échoué : le modèle n'a rien rendu de lisible. */
  nature?: NatureDuDepot;
  rejet: string | null;
  concepts: ConceptEvalue[];
  echec?: Echec;
  /**
   * Concepts déclarés dérivés d'un voisin (mesurés, jamais coupés) et coupe du
   * plafond. Absents sur un rejeu, qui ne rappelle pas l'extraction.
   */
  derives?: number;
  tronque?: boolean;
  /** Appels repris sur ce dépôt, lecture, extraction et générations confondues. */
  reprises: number;
};
