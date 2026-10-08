import type { Langue } from "@/lib/db/types";
import { en } from "./en";
import { fr, type Messages } from "./fr";

export const MESSAGES: Record<Langue, Messages> = { FR: fr, EN: en };

export type { Messages };
