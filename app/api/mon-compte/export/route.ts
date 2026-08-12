import { NextResponse } from "next/server";
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

function nomDuFichier(): string {
  return `kairn-mes-donnees-${new Date().toISOString().slice(0, 10)}.json`;
}

export async function GET() {
  let userId: string;

  try {
    userId = (await requireUser()).id;
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ erreur: "Session absente." }, { status: 401 });
    }
    throw error;
  }

  const donnees = await exporterLeCompte(userId);

  if (!donnees) {
    return NextResponse.json({ erreur: "Ce compte est introuvable." }, { status: 404 });
  }

  return new NextResponse(JSON.stringify(donnees, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${nomDuFichier()}"`,
      "cache-control": "no-store",
    },
  });
}
