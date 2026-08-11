"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { compterDemainAction } from "@/app/(app)/reviser/actions";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/auth/routes";

/**
 * La fin d'une session.
 *
 * Ce qui vient d'être revu, ce qui revient demain, et la carte de maîtrise si
 * elle s'est déclenchée. Pas de score, pas de série, pas de niveau : la
 * progression se lit dans l'espacement qui s'allonge, pas dans un compteur.
 */

function phraseDemain(nombre: number | null): string {
  if (nombre === null) return "";
  if (nombre === 0) return "Rien ne revient demain.";
  if (nombre === 1) return "Un concept revient demain.";

  return `${nombre} concepts reviennent demain.`;
}

export function FinDeSession({
  revus,
  carte,
}: {
  revus: number;
  carte: { atomId: string; concept: string } | null;
}) {
  const [demain, setDemain] = useState<number | null>(null);

  useEffect(() => {
    let vivant = true;

    // Lu après coup : les notes qui viennent d'être données ont déplacé les
    // échéances, le chiffre d'avant serait faux.
    void compterDemainAction().then((nombre) => {
      if (vivant) setDemain(nombre);
    });

    return () => {
      vivant = false;
    };
  }, []);

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col">
      <p className="text-mono font-mono tracking-[0.14em] text-stone-500 uppercase">Session</p>

      <h1 className="mt-pas-4 text-h1-app leading-tight font-bold text-stone-900">
        {revus === 0
          ? "Rien n'a été revu."
          : `${revus} ${revus === 1 ? "concept revu" : "concepts revus"}.`}
      </h1>

      {/* L'espace est réservé : la phrase arrive après un aller-retour, elle ne
          doit pas pousser le bouton vers le bas en apparaissant. */}
      <p className="mt-pas-3 text-corps min-h-6 text-stone-500">{phraseDemain(demain)}</p>

      {carte ? (
        <div className="mt-pas-12 border-lichen pl-pas-4 border-l-2">
          <p className="text-mono font-mono tracking-[0.12em] text-stone-500 uppercase">
            Tu maîtrises ça
          </p>
          <p className="mt-pas-2 text-corps leading-relaxed text-stone-900">{carte.concept}</p>
          <p className="mt-pas-2 text-petit text-stone-500">
            Trois passages justes, de plus en plus rapides. Tu ne le reconstruis plus, tu le sais.
          </p>
        </div>
      ) : null}

      {/* Déposer d'abord, s'entraîner ensuite. La boucle de croissance du
          produit, ce sont les dépôts : quelqu'un avec deux concepts n'a pas un
          problème de session, il a un problème de contenu. */}
      <div className="gap-pas-3 mt-pas-12 flex flex-col sm:flex-row">
        <Button asChild>
          <Link href={`${ROUTES.depots}/nouveau`}>Déposer autre chose</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={ROUTES.entrainement}>S&apos;entraîner</Link>
        </Button>
      </div>

      <p className="mt-pas-4 text-petit text-stone-500">
        L&apos;entraînement repose d&apos;autres questions sur les mêmes concepts. Il ne change pas
        ton planning.
      </p>

      <div className="mt-pas-8">
        <Link
          href={ROUTES.aujourdhui}
          className="text-petit text-stone-500 underline-offset-4 hover:underline focus-visible:underline"
        >
          Retour à aujourd&apos;hui
        </Link>
      </div>
    </section>
  );
}
