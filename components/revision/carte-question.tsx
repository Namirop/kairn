"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
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
        {/* L'interlettrage se resserre sur téléphone.

            Trois tags courants — « TOTALITARISME · PROPAGANDE · EMBRIGADEMENT »
            — font une quarantaine de caractères, et il manquait une vingtaine
            de pixels pour les tenir sur une ligne : le dernier passait seul en
            dessous. Ce n'est pas une veuve, c'est un dépassement, et aucune
            règle de coupure n'y peut quoi que ce soit.

            Le rythme de la police à chasse fixe tient à moitié moins d'écart
            sans se défaire ; sur un écran large, où la place ne manque pas,
            l'espacement d'origine reprend. */}
        <p className="text-mono font-mono tracking-[0.06em] text-stone-500 uppercase sm:tracking-[0.12em]">
          {tags.join(" · ")}
        </p>

        {chiffree ? (
          <p className="text-mono shrink-0 font-mono text-stone-500 tabular-nums">
            {rang + 1} / {total}
          </p>
        ) : null}
      </div>

      {/* Le rembourrage descend d'un cran sur téléphone.

          `--pas-dedans` suit la hauteur de fenêtre : sur un téléphone il fait
          une trentaine de pixels, et la carte les prend quatre fois autour d'un
          énoncé qui n'a déjà qu'une colonne étroite. L'écart entre la question
          et son cadre y devenait plus large que celui entre deux de ses lignes.
          Sur grand écran il n'y a rien à reprendre : la place ne manque pas, et
          c'est ce rythme-là qui donne à la carte sa présence d'objet posé. */}
      <div className="rounded-carte bg-surface-papier mt-pas-3 p-pas-4 md:p-pas-dedans">
        {/* L'énoncé porte son propre titre, et parfois davantage : une question
            `CODE` y descend un extrait cité en bloc, qui ne peut pas vivre dans
            un `h1` — ni comme balise, ni comme mise en forme. La carte ne décide
            donc plus de sa composition ; elle lui donne sa place. Voir
            `EnonceDeQuestion`. */}
        {enonce}

        {/* Depuis quand le concept dormait, dit du point de vue de la personne.

            C'est l'intervalle qu'elle vient de tenir, et il explique l'effort
            qu'on lui demande : sept jours sans y penser, c'est normal de
            chercher. */}
        {vuIlYaJours === null ? null : (
          <p className="mt-pas-6 text-petit text-stone-500 max-md:text-center">
            {t("dernierPassage", { jours: vuIlYaJours })}
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
