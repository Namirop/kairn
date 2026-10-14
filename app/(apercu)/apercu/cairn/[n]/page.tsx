import { notFound } from "next/navigation";
import { Cairn } from "@/components/cairn/cairn";

/** Rendue à la demande : la hauteur vient de l'URL, pas d'un build. */
export const dynamic = "force-dynamic";

/**
 * Le cairn seul, à une hauteur donnée, pour les captures. Vrai composant et
 * vraie géométrie : au-delà d'une dizaine de pierres, `tracerLeSentier` ouvre
 * un cairn de plus à droite.
 */
export default async function PageApercuCairn({ params }: { params: Promise<{ n: string }> }) {
  if (process.env.NODE_ENV === "production" || process.env.ASSETS_PREVIEW !== "1") notFound();

  const { n } = await params;
  const nombre = Number.parseInt(n, 10);

  if (!Number.isInteger(nombre) || nombre < 0 || nombre > 200) notFound();

  return (
    <main className="p-pas-8 flex min-h-dvh items-center justify-center">
      <div data-cairn className="flex h-[70vh] w-full max-w-md items-end justify-center">
        <Cairn nombre={nombre} />
      </div>
    </main>
  );
}
