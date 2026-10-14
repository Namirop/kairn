import { callAI } from "@/lib/ai/client";
import { AiError } from "@/lib/ai/errors";
import { SYSTEM_PROMPTS } from "@/lib/ai/prompts";
import { EXTRACT_ATOMS } from "@/lib/ai/schemas";
import { lireReservationsDuJour } from "@/lib/db/ai-quota";
import { enModeCompteur } from "./abus-fabrique";
import { record } from "./journal";

/**
 * Une bascule est une seconde émission réelle : elle doit prendre sa propre
 * place au plafond global, sinon une panne du modèle primaire doublerait les
 * émissions sous le même plafond. Plafond plein, pas de repli : l'échec du
 * primaire remonte seul.
 */

const PARAGRAPHE = `Un index B-tree sert les égalités et les intervalles sur une colonne ordonnable.
Un index GIN sert l'appartenance à un tableau ou à un document JSON, au prix d'écritures plus lentes.`;

/** Un modèle primaire distinct du repli : le mode compteur ferme le repli, ce cas le rouvre. */
const PRIMAIRE = "modele-primaire-de-verification";

async function appelInterne(): Promise<string> {
  const modele = process.env.AI_MODEL;
  process.env.AI_MODEL = PRIMAIRE;

  try {
    await callAI({
      contract: EXTRACT_ATOMS,
      system: SYSTEM_PROMPTS.extract_atoms,
      messages: [{ role: "user", content: PARAGRAPHE }],
    });
    return "servi";
  } catch (erreur) {
    return erreur instanceof AiError ? erreur.code : "inconnu";
  } finally {
    process.env.AI_MODEL = modele;
  }
}

export async function casRepli(): Promise<void> {
  const ouvert = await enModeCompteur(50 + (await lireReservationsDuJour()), appelInterne);

  record(
    "Repli — une bascule prend sa propre place au plafond global",
    ouvert.appels === 2 && ouvert.places === 2,
    `${ouvert.appels} émission(s), ${ouvert.places} place(s), issue ${ouvert.resultat}`,
  );

  const plein = await enModeCompteur(1 + (await lireReservationsDuJour()), appelInterne);

  record(
    "Repli — plafond atteint, pas de repli : une seule émission",
    plein.appels === 1 && plein.places === 1 && plein.resultat === "AI_CALL_FAILED",
    `${plein.appels} émission(s), ${plein.places} place(s), issue ${plein.resultat}`,
  );
}
