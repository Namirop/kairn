import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { exigerLUtilisateur, SessionAbsenteError } from "@/lib/auth/session";
import { exporterLeCompte } from "@/lib/db/compte";

/**
 * Une route, pas une Server Action : il faut un téléchargement nommé. Identité
 * par la session. `no-store` : pas de données personnelles dans un cache
 * intermédiaire.
 */
export const dynamic = "force-dynamic";

/** Il se lit dans le dossier de téléchargement : il suit la langue. */
async function nomDuFichier(): Promise<string> {
  const t = await getTranslations("compte.donnees");

  return t("fichier", { date: new Date().toISOString().slice(0, 10) });
}

export async function GET() {
  let userId: string;

  try {
    userId = (await exigerLUtilisateur()).id;
  } catch (error) {
    if (error instanceof SessionAbsenteError) {
      // i18n-ignore — réponse technique d'API, lue par du code et jamais rendue par un écran
      return NextResponse.json({ erreur: "Session absente." }, { status: 401 });
    }
    throw error;
  }

  const donnees = await exporterLeCompte(userId);

  if (!donnees) {
    // i18n-ignore — réponse technique d'API, lue par du code et jamais rendue par un écran
    return NextResponse.json({ erreur: "Ce compte est introuvable." }, { status: 404 });
  }

  const fichier = await nomDuFichier();

  return new NextResponse(JSON.stringify(donnees, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${fichier}"`,
      "cache-control": "no-store",
    },
  });
}
