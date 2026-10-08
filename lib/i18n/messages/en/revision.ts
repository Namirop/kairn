import type { Messages } from "../fr";
import { entrainement } from "./revision/entrainement";
import { paliers } from "./revision/paliers";
import { question } from "./revision/question";
import { session } from "./revision/session";
import { signalement } from "./revision/signalement";

export const revision: Messages["revision"] = {
  pages: {
    reviser: "Review",
    entrainement: "Practice",
  },
  session,
  question,
  signalement,
  paliers,
  entrainement,
};
