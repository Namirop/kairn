import type { Catalogue, EtapeDeLAttente } from "./catalogue-dattente";

/**
 * Écrites pour l'anglais, pas traduites : une phrase drôle ne l'est pas mot pour
 * mot. Les paliers suivent le catalogue français (testés dans `phrases-dattente`).
 */

const LECTURE: Catalogue = [
  ["Reading your screenshot.", "Picking out the text on it.", "Seeing what there is to keep."],
  [
    "There's text in there, clearly.",
    "The screenshot is loaded. Taking our time.",
    "Still making out a line or two.",
  ],
  [
    "Reading an image is slower than reading text.",
    "Rereading a line that won't give in.",
    "Still on it. This image isn't in a hurry.",
  ],
  [
    "We've stopped promising a time.",
    "You can close this. Reading carries on without you.",
    "Your screenshot is safe. It'll wait for you here.",
  ],
];

const DECOUPAGE: Catalogue = [
  [
    "Reading what you dropped in.",
    "Looking for ideas that stand on their own.",
    "Setting aside what isn't worth keeping.",
  ],
  [
    "There's a fair amount here, clearly.",
    "This is taking a little longer than usual.",
    "Rereading. Some passages are up for debate.",
  ],
  [
    "Breaking it down takes its time. It's not in a rush.",
    "We've seen cairns go up faster.",
    "Still on it. We never promised anything.",
    "At this point, we're rereading on principle.",
  ],
  [
    "We're not promising a time anymore.",
    "You can close the tab. It carries on without you.",
    "Your text is safe. It'll wait for you here.",
  ],
];

const ECRITURE: Catalogue = [
  [
    "Working out how to ask you again.",
    "One idea, several ways to ask about it.",
    "Phrasing it, then rephrasing it.",
  ],
  [
    "Writing four, not one.",
    "Avoiding questions that give the answer away.",
    "This one deserves better than true or false.",
  ],
  [
    "Writing is slower than breaking down.",
    "Hesitating over a word. It happens.",
    "Still choosing the words.",
  ],
  [
    "Your concepts are saved. It's the sample that's dragging.",
    "You can close this, we'll keep going on our end.",
    "Honestly, we're out of explanations.",
  ],
];

export const CATALOGUES_EN: Record<EtapeDeLAttente, Catalogue> = {
  LECTURE,
  DECOUPAGE,
  ECRITURE,
};
