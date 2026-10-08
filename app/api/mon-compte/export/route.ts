import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { requireUser, UnauthenticatedError } from "@/lib/auth/session";
import { exporterLeCompte } from "@/lib/db/compte";

/**
 * L'export des données, en un fichier.
 *
 * Une route et non une Server Action : ce qu'on veut ici est un téléchargement,
 * et une action rendrait la donnée au navigateur sans jamais lui donner de nom
 * de fichier. L'identité vient de la session, jamais de l'URL — il n'y a pas de
 * paramètre à falsifier.
 *
 * `no-store` parce que ce sont les données personnelles de quelqu'un : elles
 * n'ont rien à faire dans le cache d'un intermédiaire.
 */
export const dynamic = "force-dynamic";

/** Le nom du fichier se lit dans le dossier de téléchargement : il suit la langue. */
async function nomDuFichier(): Promise<string> {
  const t = await getTranslations("compte.donnees");

  return t("fichier", { date: new Date().toISOString().slice(0, 10) });
}

export async function GET() {
  let userId: string;

  try {
    userId = (await requireUser()).id;
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
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
