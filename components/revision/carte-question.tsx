"use client";

import type { ReactNode } from "react";
import { SignalerLaQuestion } from "@/components/revision/signaler-la-question";

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
 * La question est **dans une carte**, et rien d'autre n'y entre : c'est le seul
 * objet posé sur la surface de l'écran, et il tient exactement ce qu'on doit
 * lire avant de répondre. Ce qu'on fait ensuite — choisir, saisir, comparer,
 * renoncer — vit dessous, sur la surface. L'écran dit donc « voilà la question »
 * puis « voilà ce que tu peux en faire », au lieu de couler les deux ensemble.
 *
 * Ce qui vit sous le trait ne sert plus à répondre : ce sont les gestes qui
 * portent sur le concept ou sur la question elle-même. Ils sont séparés du reste
 * par le trait, et hiérarchisés entre eux — une action qui déplace une échéance
 * de trois mois ne peut pas se présenter comme un signalement.
 */

/**
 * Depuis quand le concept dormait, dit du point de vue de la personne.
 *
 * C'est l'intervalle qu'elle vient de tenir, et il explique l'effort qu'on lui
 * demande : sept jours sans y penser, c'est normal de chercher.
 */
function dernierPassage(jours: number): string {
  if (jours === 0) return "Tu l'as vu aujourd'hui.";
  if (jours === 1) return "Tu l'as vu hier.";

  return `Tu l'as vu il y a ${jours} jours.`;
}

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
  /** L'énoncé, composé par le format : un texte, ou une phrase à trou. */
  enonce: ReactNode;
  /** L'intervalle tenu depuis le dernier passage, quand il y en a eu un. */
  vuIlYaJours?: number | null;
  /** La question qu'on peut signaler. Absent, l'action ne s'affiche pas. */
  variantId?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex w-full flex-col">
      <div className="gap-pas-4 flex items-baseline justify-between">
        <p className="text-mono font-mono tracking-[0.12em] text-stone-500 uppercase">
          {tags.join(" · ")}
        </p>

        {chiffree ? (
          <p className="text-mono shrink-0 font-mono text-stone-500 tabular-nums">
            {rang + 1} / {total}
          </p>
        ) : null}
      </div>

      <div className="rounded-carte bg-surface-papier mt-pas-3 p-pas-dedans">
        {/* Les lignes se touchent presque : un titre est une unité, et l'écart du
            corps de texte le faisait lire comme un paragraphe en gras. `text-enonce`
            est un cran sous le titre de page — assez pour dominer l'écran, pas
            assez pour l'occuper — et `break-words` retient les saisies absurdes
            à l'intérieur de la carte.

            **Centré sur téléphone.** Une colonne étroite laisse une dernière
            ligne courte flotter contre le bord gauche, avec le vide de trois
            mots à sa droite : la carte avait alors un côté plein et un côté
            creux, et l'écran penchait. Centré, l'énoncé occupe sa carte comme
            un objet posé au milieu — il est ce qu'on regarde, pas un paragraphe
            qu'on parcourt. Dès `md` la mesure est assez longue pour que le
            drapeau à gauche redevienne le bon réglage. */}
        <h1 className="text-enonce leading-tight font-bold text-pretty break-words text-stone-900 max-md:text-center">
          {enonce}
        </h1>

        {vuIlYaJours === null ? null : (
          <p className="mt-pas-6 text-petit text-stone-500 max-md:text-center">
            {dernierPassage(vuIlYaJours)}
          </p>
        )}
      </div>

      {children}

      {/* Le trait sépare deux natures de gestes, et il ne flotte pas entre
          elles : sur téléphone, un pas de scène au-dessus creusait cent pixels
          de vide entre la dernière réponse possible et lui, sans rien y mettre.
          C'est le seul endroit de l'écran où l'écart doit se voir sans se
          remarquer. */}
      <div className="mt-pas-8 md:mt-pas-scene pt-pas-6 border-t border-stone-300">
        {actions}

        {/* Le signalement est le plus léger des gestes de cette rangée, et il le
            dit : c'est un défaut à remonter, pas une décision sur la mémoire. Il
            doit être trouvable quand on le cherche et invisible quand on
            révise. */}
        {variantId ? (
          <div className={actions ? "mt-pas-8" : undefined}>
            <SignalerLaQuestion key={variantId} variantId={variantId} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
