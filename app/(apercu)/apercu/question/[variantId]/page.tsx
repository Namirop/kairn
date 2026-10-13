import { notFound } from "next/navigation";
import { ApercuQuestion, type EtatDApercu } from "./apercu-question";
import { lireVariantePourApercu } from "@/lib/db/apercu";
import { questionServie } from "@/lib/db/question-servie";

/** Jamais mise en cache : elle lit une ligne de la base à chaque appel. */
export const dynamic = "force-dynamic";

function estEtat(valeur: string | undefined): valeur is EtatDApercu {
  return valeur === "juste" || valeur === "faux" || valeur === "revele";
}

export default async function PageApercuQuestion({
  params,
  searchParams,
}: {
  params: Promise<{ variantId: string }>;
  searchParams: Promise<{ etat?: string }>;
}) {
  // Double garde, en plus du layout : aucune lecture de base au build de prod.
  if (process.env.NODE_ENV === "production" || process.env.ASSETS_PREVIEW !== "1") notFound();

  const { variantId } = await params;
  const { etat } = await searchParams;

  const donnees = await lireVariantePourApercu(variantId);

  if (!donnees) notFound();

  const question = questionServie(donnees.concept, donnees.variante);
  const etatChoisi: EtatDApercu = estEtat(etat) ? etat : "juste";

  return (
    <main className="px-pas-4 py-pas-8 mx-auto w-full max-w-xl">
      <ApercuQuestion question={question} etat={etatChoisi} />
    </main>
  );
}
