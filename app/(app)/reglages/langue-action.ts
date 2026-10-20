"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { lireLUtilisateur } from "@/lib/auth/session";
import { changerDeLangue } from "@/lib/db/reglages-du-compte";
import { COOKIE_DE_LANGUE, LOCALE } from "@/lib/i18n/langues";

const LANGUE = z.enum(["FR", "EN"]);

/**
 * Vaut pour les dépôts à venir : retraduire l'existant coûterait des appels et
 * réécrirait des concepts planifiés. Le cookie sert la landing et la connexion.
 */
export async function changerDeLangueAction(langue: unknown): Promise<{ ok: boolean }> {
  const utilisateur = await lireLUtilisateur();
  const valide = LANGUE.safeParse(langue);

  if (!utilisateur || !valide.success) return { ok: false };

  if (!(await changerDeLangue(utilisateur.id, valide.data))) return { ok: false };

  (await cookies()).set(COOKIE_DE_LANGUE, LOCALE[valide.data], {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");

  return { ok: true };
}
