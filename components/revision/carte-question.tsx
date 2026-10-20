"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { SignalerLaQuestion } from "@/components/revision/signaler-la-question";

/**
 * La carte de révision : ce qu'on lit avant de répondre, ni le concept (ce
 * serait la réponse) ni la facette (vocabulaire de génération). Les réponses
 * vivent dessous ; sous le trait, les gestes sur le concept ou la question.
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
  /** Le compte de la session ; l'entraînement n'a pas de longueur. */
  chiffree?: boolean;
  tags: string[];
  /** Composé par le format : son titre, et ce qu'il descend dessous. */
  enonce: ReactNode;
  vuIlYaJours?: number | null;
  /** Absent, le signalement ne s'affiche pas. */
  variantId?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const t = useTranslations("revision.question");

  return (
    <section className="flex w-full flex-col">
      <div className="gap-pas-4 flex items-baseline justify-between">
        {/* Resserré sur téléphone : trois tags courants (une quarantaine de
            caractères) n'y tiendraient pas sur une ligne. */}
        <p className="text-mono font-mono tracking-[0.06em] text-stone-500 uppercase sm:tracking-[0.12em]">
          {tags.join(" · ")}
        </p>

        {chiffree ? (
          <p className="text-mono shrink-0 font-mono text-stone-500 tabular-nums">
            {rang + 1} / {total}
          </p>
        ) : null}
      </div>

      {/* `--pas-dedans` suit la hauteur de fenêtre, trop large pour la colonne
          d'un téléphone. */}
      <div className="rounded-carte bg-surface-papier mt-pas-3 p-pas-4 md:p-pas-dedans">
        {/* Porte son propre titre, et parfois un bloc de code hors du `h1`. */}
        {enonce}

        {/* L'intervalle tenu explique l'effort demandé. */}
        {vuIlYaJours === null ? null : (
          <p className="mt-pas-6 text-petit text-stone-500 max-md:text-center">
            {t("dernierPassage", { jours: vuIlYaJours })}
          </p>
        )}
      </div>

      {children}

      {/* Sur téléphone, un pas de scène creuserait une centaine de pixels de vide. */}
      <div className="mt-pas-8 md:mt-pas-scene pt-pas-6 border-t border-stone-300">
        {actions}

        {/* Le plus léger des gestes : un défaut à remonter, pas une décision
            sur la mémoire. */}
        {variantId ? (
          <div className={actions ? "mt-pas-8" : undefined}>
            <SignalerLaQuestion key={variantId} variantId={variantId} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
