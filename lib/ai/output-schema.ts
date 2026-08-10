import { z, type ZodType } from "zod";

/**
 * Le schéma envoyé à `output_config.format`, dérivé de la forme.
 *
 * Le helper du SDK fait ce travail, mais il rétrograde `enum` et `const` en
 * simple texte de description alors que la plateforme les documente comme
 * contraignables. Sur nos sorties, c'est la différence entre un format inventé
 * impossible et un format inventé rattrapé après coup — trois échecs du premier
 * passage. On dérive donc nous-mêmes.
 *
 * Le reste suit le même parti que le SDK : ce que la grammaire ne sait pas
 * contraindre — bornes de longueur, minimum, maximum — n'est pas envoyé comme
 * contrainte mais versé dans la description, où le modèle le lit comme une
 * indication. La validation Zod, elle, continue de tout appliquer.
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

function transformer(entree: Noeud): Noeud {
  const reste: Noeud = { ...entree };
  const sortie: Noeud = {};
  const prendre = (cle: string): unknown => {
    const valeur = reste[cle];
    delete reste[cle];
    return valeur;
  };

  prendre("$schema");
  const description = prendre("description");

  for (const cle of CONTRAINTES) {
    const valeur = prendre(cle);
    if (valeur !== undefined) sortie[cle] = valeur;
  }

  const anyOf = prendre("anyOf");
  if (Array.isArray(anyOf)) sortie.anyOf = sousNoeuds(anyOf).map(transformer);

  const proprietes = prendre("properties");
  if (estNoeud(proprietes)) {
    sortie.properties = Object.fromEntries(
      Object.entries(proprietes).map(([nom, sous]) => [
        nom,
        estNoeud(sous) ? transformer(sous) : sous,
      ]),
    );
    // Exigé sur chaque objet par la sortie contrainte.
    prendre("additionalProperties");
    sortie.additionalProperties = false;
  }

  const items = prendre("items");
  if (estNoeud(items)) sortie.items = transformer(items);

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

  return { type: "json_schema", schema: transformer({ ...json }) };
}
