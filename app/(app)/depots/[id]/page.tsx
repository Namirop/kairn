import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ConceptCorrigeable } from "@/components/depots/concept-corrigeable";
import { EtatVide } from "@/components/etats/etat-vide";
import { Badge } from "@/components/ui/badge";
import { ROUTES } from "@/lib/auth/routes";
import { getCurrentUser } from "@/lib/auth/session";
import { lireDepotDetaille } from "@/lib/db/concepts";
import { lireFuseauUtilisateur } from "@/lib/db/user-settings";
import { anciennete } from "@/lib/domain/echeance";
import { etatDuDepot, libelleEtat } from "@/lib/domain/etat-depot";

export const metadata: Metadata = { title: "Dépôt" };

export default async function PageDepot({ params }: { params: Promise<{ id: string }> }) {
  const utilisateur = await getCurrentUser();

  if (!utilisateur) redirect(ROUTES.connexion);

  const { id } = await params;
  const depot = await lireDepotDetaille(id, utilisateur.id);

  if (!depot) notFound();

  const fuseau = await lireFuseauUtilisateur(utilisateur.id);
  const etat = etatDuDepot({
    status: depot.status,
    travaux: depot.travauxEnCours > 0 ? [{ kind: "VARIANTS" }] : [],
    concepts: depot.concepts.length,
  });
  const texte = depot.rawContent.trim() || depot.extractedText || "";

  return (
    <div className="gap-pas-8 flex flex-col">
      <div>
        <Link
          href={ROUTES.depots}
          className="text-petit rounded-xs text-stone-500 underline decoration-stone-300 underline-offset-4 transition-colors hover:text-stone-900"
        >
          Retour aux dépôts
        </Link>

        <h1 className="mt-pas-3 text-h1-app leading-tight font-bold">
          {depot.concepts.length} {depot.concepts.length === 1 ? "concept" : "concepts"}
        </h1>

        <p className="mt-pas-2 gap-pas-3 text-mono flex flex-wrap items-center text-stone-500">
          {etat === "pret" ? null : <Badge variant="pose">{libelleEtat(etat)}</Badge>}
          <span>Déposé {anciennete(depot.createdAt, new Date(), fuseau)}</span>
        </p>
      </div>

      {depot.failureReason ? (
        <p className="border-alerte pl-pas-4 text-corps max-w-2xl border-l-2 text-stone-900">
          {depot.failureReason}
        </p>
      ) : null}

      {texte ? (
        <section className="max-w-3xl">
          <h2 className="text-mono font-mono tracking-[0.14em] text-stone-500 uppercase">
            Ce que tu as déposé
          </h2>
          <p className="mt-pas-3 p-pas-4 text-petit rounded-xs border border-stone-100 bg-stone-50 whitespace-pre-wrap text-stone-700">
            {texte}
          </p>
        </section>
      ) : null}

      <section className="max-w-3xl">
        <h2 className="text-mono font-mono tracking-[0.14em] text-stone-500 uppercase">
          Ce qu&apos;on en a tiré
        </h2>

        {depot.concepts.length === 0 ? (
          <div className="mt-pas-4">
            <EtatVide
              constat="Aucun concept pour l'instant."
              contexte={
                etat === "echec"
                  ? "Ce dépôt n'a rien donné. Tu peux en déposer un autre, reformulé."
                  : "Le découpage est en cours. Les concepts apparaissent dès qu'il a fini."
              }
            />
          </div>
        ) : (
          <ul className="mt-pas-2">
            {depot.concepts.map((concept) => (
              <ConceptCorrigeable key={concept.id} concept={concept} inputId={depot.id} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
