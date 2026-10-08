"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { changerDeLangue } from "@/lib/db/user-settings";
import { COOKIE_DE_LANGUE, LOCALE } from "@/lib/i18n/langues";

const LANGUE = z.enum(["FR", "EN"]);

/**
 * Change la langue du compte.
 *
 * Elle vaut pour l'interface, les emails et les dépôts **à venir** : ce qui est
 * déjà déposé garde la sienne, parce que le retraduire coûterait des appels et
 * réécrirait des concepts déjà planifiés.
 *
 * Le choix est aussi retenu en cookie, pour que la landing et l'écran de
 * connexion parlent la même langue que le compte sur cet appareil.
 */
export async function changerDeLangueAction(langue: unknown): Promise<{ ok: boolean }> {
  const utilisateur = await getCurrentUser();
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
