"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { compterDemainAction } from "@/app/(app)/reviser/actions";
import { Palier } from "@/components/revision/palier";
import { PrincipeDeLEspacement } from "@/components/revision/principe-de-lespacement";
import { ROUTES } from "@/lib/auth/routes";

/**
 * La fin d'une session.
 *
 * Ce qui vient d'être revu, ce qui revient demain, et la carte de maîtrise si
 * elle s'est déclenchée. Pas de score, pas de série, pas de niveau : la
 * progression se lit dans l'espacement qui s'allonge, pas dans un compteur.
 *
 * C'est un palier, comme les écrans où il n'y avait rien à revoir : on vient de
 * finir, et la seule différence avec « tu es à jour » est le chemin qui y mène.
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
  expliquerLEspacement = false,
}: {
  revus: number;
  carte: { atomId: string; concept: string } | null;
  /** Première session de ce compte : c'est le moment de dire pourquoi ça s'arrête. */
  expliquerLEspacement?: boolean;
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
    // Déposer d'abord, s'entraîner ensuite. La boucle de croissance du produit,
    // ce sont les dépôts : quelqu'un avec deux concepts n'a pas un problème de
    // session, il a un problème de contenu.
    <Palier
      intitule="Session"
      titre={
        revus === 0
          ? "Rien n'a été revu"
          : `${revus} ${revus === 1 ? "concept revu" : "concepts revus"}`
      }
      // L'espace est réservé : la phrase arrive après un aller-retour, elle ne
      // doit pas pousser le bouton vers le bas en apparaissant.
      explication={<span className="block min-h-6">{phraseDemain(demain)}</span>}
      action={{ libelle: "Déposer autre chose", href: `${ROUTES.depots}/nouveau` }}
      secondaire={{ libelle: "S'entraîner", href: ROUTES.entrainement }}
      note="L'entraînement repose d'autres questions sur les mêmes concepts. Il ne change pas ton planning."
      pied={
        <Link
          href={ROUTES.aujourdhui}
          className="text-petit text-stone-500 underline-offset-4 hover:underline focus-visible:underline"
        >
          Retour à aujourd&apos;hui
        </Link>
      }
    >
      {expliquerLEspacement ? (
        <div className="mt-pas-12 w-full text-left">
          <PrincipeDeLEspacement />
        </div>
      ) : null}

      {/* Le concept est cité, donc aligné à gauche : une phrase de contenu
          centrée se lit moins bien, et c'est le seul texte de l'écran qui ne
          vient pas du produit. */}
      {carte ? (
        <div className="mt-pas-12 border-lichen pl-pas-4 max-w-lg border-l-2 text-left">
          <p className="text-mono font-mono tracking-[0.12em] text-stone-500 uppercase">
            Tu maîtrises ça
          </p>
          <p className="mt-pas-2 text-corps leading-relaxed text-stone-900">{carte.concept}</p>
          <p className="mt-pas-2 text-petit text-stone-500">
            Trois passages justes, de plus en plus rapides. Tu ne le reconstruis plus, tu le sais.
          </p>
        </div>
      ) : null}
    </Palier>
  );
}
