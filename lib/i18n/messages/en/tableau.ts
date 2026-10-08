import type { Messages } from "../fr";
import { aujourdhui } from "./tableau/aujourdhui";
import { cairn } from "./tableau/cairn";
import { commentCaMarche } from "./tableau/comment-ca-marche";
import { commun } from "./tableau/commun";

export const tableau: Messages["tableau"] = { aujourdhui, cairn, commentCaMarche, commun };
