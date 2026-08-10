import { z, type ZodType } from "zod";
import { AISchemaError } from "./errors";

/**
 * Le schéma envoyé à `output_config.format`, dérivé de la forme.
 *
 * Le helper du SDK fait ce travail, mais il rétrograde `enum` et `const` en
 * simple texte de description alors que la plateforme les documente comme
 * contraignables. Sur nos sorties, c'est la différence entre un format inventé
 * impossible et un format inventé rattrapé après coup — trois échecs du premier
 * passage. On dérive donc nous-mêmes.
 *
 * Deux natures de mots-clés, deux traitements. Ceux qui bornent une valeur —
 * longueurs, minimum, maximum — ne se font pas respecter par la grammaire :
 * ils partent dans la description, où le modèle les lit comme des indications,
 * et la validation Zod continue de les appliquer. Ceux qui décident de la
 * structure — `$ref`, `allOf`, `not` — n'ont pas d'équivalent en description :
 * les y verser reviendrait à les perdre en silence, alors on lève.
 */

export type OutputSchema = { type: "json_schema"; schema: Record<string, unknown> };

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
 * Ceux-là décident de ce qu'un document a le droit d'être. On ne sait pas les
 * traduire, et une description ne les remplace pas.
 *
 * `$ref` et `$defs` sont le cas concret : Zod les produit dès qu'une forme est
 * réutilisée, et l'objet de facette de `generate_variants` l'est quatre fois.
 * Il les inline aujourd'hui ; le jour où ce défaut change, la contrainte
 * disparaîtrait sans un bruit.
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

/** Ce qui reste après tri : rendu au modèle comme indication, pas comme règle. */
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
    if (reste[motCle] !== undefined) throw new AISchemaError(motCle, chemin);
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

export function toOutputSchema(forme: ZodType): OutputSchema {
  const json = z.toJSONSchema(forme, { target: "draft-2020-12", io: "input" });

  return { type: "json_schema", schema: transformer({ ...json }, "(racine)") };
}
