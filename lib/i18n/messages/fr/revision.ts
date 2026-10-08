import { entrainement } from "./revision/entrainement";
import { paliers } from "./revision/paliers";
import { question } from "./revision/question";
import { session } from "./revision/session";
import { signalement } from "./revision/signalement";

/** La révision et l'entraînement : la session, les formats de question, la correction, les fins de session. */
export const revision = {
  /** Les titres d'onglet des deux pages. */
  pages: {
    reviser: "Réviser",
    entrainement: "Entraînement",
  },
  session,
  question,
  signalement,
  paliers,
  entrainement,
};
