import { z, type ZodType } from "zod";
import { SchemaIntraduisibleError } from "./errors";

/**
 * Le schéma de sortie contrainte, dérivé de la forme Zod. Pas le helper du SDK :
 * il rétrograde `enum` et `const` en description, et un format inventé
 * n'échouerait qu'à la validation.
 *
 * Les bornes de valeur (longueurs, minimum, maximum) ne sont pas imposables :
 * elles partent en description. Les mots-clés de structure (`$ref`, `allOf`,
 * `not`…) s'y perdraient en silence : on lève.
 */

export type SchemaDeSortie = { type: "json_schema"; schema: Record<string, unknown> };

type Noeud = Record<string, unknown>;

/** Les seuls formats de chaîne que la contrainte connaît. */
const FORMATS_CONNUS = new Set([
  "date-time",
  "time",
  "date",
  "duration",
  "email",
  "hostname",
  "uri",
  "ipv4",
  "ipv6",
  "uuid",
]);

/** Recopiées telles quelles : la grammaire sait les faire respecter. */
const CONTRAINTES = ["type", "enum", "const", "required"];

/**
 * `$ref` et `$defs` sont le cas concret : Zod y extrait toute instance partagée,
 * d'où les schémas neufs de `generate-variants-question.ts`. Un partage qui
 * s'y glisserait doit se voir par une erreur.
 */
const STRUCTURELS = [
  "$ref",
  "$defs",
  "$anchor",
  "$dynamicRef",
  "oneOf",
  "allOf",
  "not",
  "if",
  "then",
  "else",
  "prefixItems",
  "contains",
  "patternProperties",
  "dependentSchemas",
  "propertyNames",
  "unevaluatedItems",
  "unevaluatedProperties",
];

function estNoeud(valeur: unknown): valeur is Noeud {
  return typeof valeur === "object" && valeur !== null && !Array.isArray(valeur);
}

function sousNoeuds(valeur: unknown): Noeud[] {
  return Array.isArray(valeur) ? valeur.filter(estNoeud) : [];
}

/** Ce qui reste après tri, rendu au modèle comme indication. */
function enIndication(reste: Noeud, description: unknown): string | undefined {
  const notes = Object.entries(reste).map(([cle, valeur]) => `${cle}: ${JSON.stringify(valeur)}`);
  const texte = typeof description === "string" ? description : undefined;

  if (notes.length === 0) return texte;

  return [texte, `{${notes.join(", ")}}`].filter(Boolean).join("\n\n");
}

function transformer(entree: Noeud, chemin: string): Noeud {
  const reste: Noeud = { ...entree };
  const sortie: Noeud = {};
  const prendre = (cle: string): unknown => {
    const valeur = reste[cle];
    delete reste[cle];
    return valeur;
  };

  for (const motCle of STRUCTURELS) {
    if (reste[motCle] !== undefined) throw new SchemaIntraduisibleError(motCle, chemin);
  }

  prendre("$schema");
  const description = prendre("description");

  for (const cle of CONTRAINTES) {
    const valeur = prendre(cle);
    if (valeur !== undefined) sortie[cle] = valeur;
  }

  const anyOf = prendre("anyOf");
  if (Array.isArray(anyOf)) {
    sortie.anyOf = sousNoeuds(anyOf).map((sous, rang) =>
      transformer(sous, `${chemin}.anyOf[${rang}]`),
    );
  }

  const proprietes = prendre("properties");
  if (estNoeud(proprietes)) {
    sortie.properties = Object.fromEntries(
      Object.entries(proprietes).map(([nom, sous]) => [
        nom,
        estNoeud(sous) ? transformer(sous, `${chemin}.${nom}`) : sous,
      ]),
    );
    // Exigé sur chaque objet par la sortie contrainte.
    prendre("additionalProperties");
    sortie.additionalProperties = false;
  }

  const items = prendre("items");
  if (estNoeud(items)) sortie.items = transformer(items, `${chemin}[]`);

  const minItems = prendre("minItems");
  if (minItems === 0 || minItems === 1) sortie.minItems = minItems;
  else if (minItems !== undefined) reste.minItems = minItems;

  const format = prendre("format");
  if (typeof format === "string" && FORMATS_CONNUS.has(format)) sortie.format = format;
  else if (format !== undefined) reste.format = format;

  const indication = enIndication(reste, description);
  if (indication !== undefined) sortie.description = indication;

  return sortie;
}

export function deriverLeSchemaDeSortie(forme: ZodType): SchemaDeSortie {
  const json = z.toJSONSchema(forme, { target: "draft-2020-12", io: "input" });

  return { type: "json_schema", schema: transformer({ ...json }, "(racine)") };
}
