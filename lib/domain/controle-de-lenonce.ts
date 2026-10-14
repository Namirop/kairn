import type { VariantAControler } from "./controle-question";
import type { Manquement } from "./manquement";
import { motsNormalises } from "./mots-normalises";
import { renvoiAuConcept } from "./renvoi-au-concept";

/**
 * Ce que l'énoncé affiché laisse lire : une coquille à la place de la question,
 * un renvoi au concept qu'on ne montre pas, ou la réponse elle-même.
 */

/** Nombre de mots en deçà duquel une réponse citée ne prouve rien. */
const MOTS_MINIMUM_POUR_CITER = 3;

/**
 * Un texte de question qui est une coquille : « placeholder » ou consigne
 * générique qui ne redit rien de la question réelle. Invisible à l'écran pour
 * un CLOZE, elle fausse pourtant la mesure du radotage (paires identiques).
 *
 * `lib/ai/schemas/generate-variants.ts` dérive déjà la question d'un CLOZE ; ce
 * contrôle attrape le reste. Signalé, pas refusé.
 */
const COQUILLES = [
  /^placeholder\d*$/i,
  /^Complète la phrase\b/i,
  /^Complete the (?:sentence|key claim|statement)\b/i,
  /^Complète l'affirmation\b/i,
];

function estCoquille(texte: string): boolean {
  return COQUILLES.some((r) => r.test(texte.trim()));
}

function controlerCoquille(variant: VariantAControler): Manquement[] {
  // Un CLOZE affiche `cloze.sentence`, pas `question`. Un cloze absent est
  // déjà signalé par `controlerCloze`.
  if (variant.format === "CLOZE") {
    if (!variant.cloze) return [];
    if (!estCoquille(variant.cloze.sentence)) return [];
    return [
      {
        regle: "question coquille",
        detail: `charge d'un CLOZE qui ne porte pas la phrase à trou : « ${variant.cloze.sentence.slice(0, 80)} »`,
      },
    ];
  }

  if (!estCoquille(variant.question)) return [];

  return [
    {
      regle: "question coquille",
      detail: `texte de question qui ne porte pas la question réelle : « ${variant.question.slice(0, 80)} »`,
    },
  ];
}

/**
 * La question qui renvoie au concept (« mentionné dans le concept »), que
 * l'écran de révision ne montre jamais puisqu'il donnerait la réponse.
 *
 * On lit ce qui s'affiche, comme pour les coquilles. Signalé, jamais refusé :
 * la tournure est maladroite, pas fausse, et jeter l'appel coûterait plus.
 */
function controlerRenvoi(variant: VariantAControler): Manquement[] {
  const affiche = variant.format === "CLOZE" ? (variant.cloze?.sentence ?? "") : variant.question;
  const renvoi = renvoiAuConcept(affiche);

  if (!renvoi) return [];

  return [
    {
      regle: "renvoi au concept",
      detail: `la question renvoie à « ${renvoi} », qu'on ne montre pas`,
    },
  ];
}

/** La réponse attendue ne doit pas se lire dans l'énoncé. */
function controlerReponseCachee(variant: VariantAControler): Manquement[] {
  const [premierePhrase = ""] = variant.answerKey.split(/[.\n]/);
  const reponse = motsNormalises(premierePhrase);

  if (reponse.trim().split(" ").filter(Boolean).length < MOTS_MINIMUM_POUR_CITER) return [];
  if (!motsNormalises(variant.question).includes(reponse)) return [];

  return [
    { regle: "réponse citée", detail: `« ${premierePhrase.trim()} » figure dans la question` },
  ];
}

/** Tout ce que l'énoncé de cette question laisse lire de travers. */
export function controlerLEnonce(variant: VariantAControler): Manquement[] {
  return [
    ...controlerCoquille(variant),
    ...controlerRenvoi(variant),
    ...controlerReponseCachee(variant),
  ];
}
