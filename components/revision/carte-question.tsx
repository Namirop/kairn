"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { SignalerLaQuestion } from "@/components/revision/signaler-la-question";

/**
 * La carte de révision.
 *
 * Elle ne montre ni le concept (ce serait donner la réponse) ni la facette,
 * vocabulaire de génération inutile à qui répond. La carte ne contient que ce
 * qu'on lit avant de répondre ; les réponses vivent dessous, et sous le trait
 * les gestes qui portent sur le concept ou la question elle-même.
 */

export function CarteQuestion({
  rang,
  total,
  chiffree,
  tags,
  enonce,
  vuIlYaJours = null,
  variantId,
  actions,
  children,
}: {
  rang: number;
  total: number;
  /** Le compte de la session. L'entraînement ne tient pas de longueur. */
  chiffree?: boolean;
  tags: string[];
  /** L'énoncé, composé par le format : son titre, et ce qu'il descend dessous. */
  enonce: ReactNode;
  /** L'intervalle tenu depuis le dernier passage, quand il y en a eu un. */
  vuIlYaJours?: number | null;
  /** La question qu'on peut signaler. Absent, l'action ne s'affiche pas. */
  variantId?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const t = useTranslations("revision.question");

  return (
    <section className="flex w-full flex-col">
      <div className="gap-pas-4 flex items-baseline justify-between">
        {/* L'interlettrage se resserre sur téléphone : trois tags courants
            (une quarantaine de caractères) n'y tiendraient pas sur une ligne. */}
        <p className="text-mono font-mono tracking-[0.06em] text-stone-500 uppercase sm:tracking-[0.12em]">
          {tags.join(" · ")}
        </p>

        {chiffree ? (
          <p className="text-mono shrink-0 font-mono text-stone-500 tabular-nums">
            {rang + 1} / {total}
          </p>
        ) : null}
      </div>

      {/* `--pas-dedans` suit la hauteur de fenêtre et serait trop large autour
          de la colonne étroite d'un téléphone : un cran de moins y suffit. */}
      <div className="rounded-carte bg-surface-papier mt-pas-3 p-pas-4 md:p-pas-dedans">
        {/* L'énoncé porte son propre titre, et parfois un extrait de code en bloc
            qui ne peut pas vivre dans un `h1`. Voir `EnonceDeQuestion`. */}
        {enonce}

        {/* L'intervalle qu'on vient de tenir explique l'effort demandé. */}
        {vuIlYaJours === null ? null : (
          <p className="mt-pas-6 text-petit text-stone-500 max-md:text-center">
            {t("dernierPassage", { jours: vuIlYaJours })}
          </p>
        )}
      </div>

      {children}

      {/* Sur téléphone, un pas de scène au-dessus du trait creuserait une
          centaine de pixels de vide : un écart plus court y suffit. */}
      <div className="mt-pas-8 md:mt-pas-scene pt-pas-6 border-t border-stone-300">
        {actions}

        {/* Le signalement est le plus léger des gestes : un défaut à remonter,
            pas une décision sur la mémoire. */}
        {variantId ? (
          <div className={actions ? "mt-pas-8" : undefined}>
            <SignalerLaQuestion key={variantId} variantId={variantId} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
