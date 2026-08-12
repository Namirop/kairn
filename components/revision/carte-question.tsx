"use client";

import type { ReactNode } from "react";
import { PileDeSession } from "@/components/revision/pile-de-session";
import { SignalerLaQuestion } from "@/components/revision/signaler-la-question";
import { TexteTechnique } from "@/components/typographie/texte-technique";

/**
 * La carte de révision.
 *
 * Elle ne montre jamais le concept — seulement la question. Afficher l'énoncé
 * dont la question est tirée reviendrait à donner la réponse avec l'exercice.
 *
 * Elle ne montre pas non plus la facette. « Reconnaître », « Appliquer » : c'est
 * du vocabulaire de génération, utile pour équilibrer les Variants d'un Atom,
 * inutile à qui répond. Savoir qu'on est interrogé sur du rappel ne change rien
 * à l'effort de rappel — et l'annoncer met une étiquette de système en tête d'un
 * écran qui doit porter une question.
 *
 * L'avancement est là parce qu'une session se finit mieux quand on en voit le
 * bout. Ce n'est ni un score ni une série : il disparaît avec la session.
 *
 * Ce qui vit sous le trait dépend du mode. La session du jour y met « Je
 * maîtrise ça », qui sort le concept du cycle ; l'entraînement libre n'y met
 * rien, puisqu'il ne décide de rien.
 */
export function CarteQuestion({
  rang,
  total,
  chiffree,
  tags,
  question,
  variantId,
  actions,
  children,
}: {
  rang: number;
  total: number;
  /** Le compte exact à côté de la pile. L'entraînement ne le porte pas. */
  chiffree?: boolean;
  tags: string[];
  question: string;
  /** La question qu'on peut signaler. Absent, l'action ne s'affiche pas. */
  variantId?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col">
      <div className="gap-pas-4 flex items-end justify-between">
        <p className="text-mono font-mono tracking-[0.12em] text-stone-500 uppercase">
          {tags.join(" · ")}
        </p>

        <PileDeSession rang={rang} total={total} chiffree={chiffree} />
      </div>

      <h1 className="mt-pas-8 text-h1-app leading-snug font-bold text-pretty text-stone-900">
        <TexteTechnique>{question}</TexteTechnique>
      </h1>

      {children}

      {actions ? <div className="mt-pas-12 pt-pas-6">{actions}</div> : null}

      {/* Sous tout le reste, et volontairement en retrait : c'est un défaut à
          remonter, pas une note à donner. Elle doit être trouvable quand on la
          cherche et invisible quand on révise. */}
      {variantId ? (
        <div className={actions ? "mt-pas-6" : "mt-pas-12"}>
          <SignalerLaQuestion key={variantId} variantId={variantId} />
        </div>
      ) : null}
    </section>
  );
}
