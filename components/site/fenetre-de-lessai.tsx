"use client";

import type { ReactNode } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * La fenêtre où l'essai se joue : l'attente, puis ce qu'elle a donné.
 *
 * **Pourquoi une fenêtre et pas la suite de la page.** La bande de l'essai
 * devait être quatre mises en page à elle seule — le formulaire sur deux
 * colonnes, l'attente pleine largeur, les concepts avec une seconde attente
 * imbriquée dedans, le résultat entier. Aucune ne pouvait être bien composée,
 * parce qu'elles se disputaient le même cadre et que chacune devait laisser la
 * place aux trois autres. La fenêtre rend à la bande son seul travail : inviter
 * à déposer, toujours de la même façon.
 *
 * Elle est légitime parce qu'elle est la **conséquence directe d'un geste** — on
 * vient de cliquer « Voir ce que ça donne » — et jamais une interruption. C'est
 * la seule condition qui rende une fenêtre modale acceptable sur une page
 * publique, et elle est remplie ici.
 *
 * **Elle se ferme à tout moment, et fermer n'annule rien.** Le découpage tourne
 * côté serveur, derrière la réponse ; la bande garde ensuite de quoi rouvrir. Une
 * fenêtre qu'on ne peut pas fermer pendant une attente qu'on ne maîtrise pas
 * serait une prise d'otage.
 *
 * **Elle est de roche, et c'est le seul endroit public qui le soit avec le
 * panneau du bas.** C'est le plus grand écart de valeur dont le système dispose :
 * la page est claire, la fenêtre est sombre, et la bascule fait de la révélation
 * un événement au lieu d'un remplacement de paragraphes. Le lichen, qui ne tient
 * pas sur le papier, y tient enfin.
 *
 * **Elle ne réutilise pas `ui/dialog.tsx`, et c'est délibéré.** Celui-ci est une
 * boîte de dialogue d'application : quatre cents pixels de large, du papier, un
 * rembourrage uniforme. Celle-là est une feuille qui prend l'écran entier sur
 * téléphone, avec un pied qui ne défile pas. Les faire tenir dans le même
 * composant aurait produit une fonction à deux branches sur toute sa longueur.
 *
 * **Le titre est masqué visuellement, pas absent.** Radix exige un nom pour la
 * fenêtre, et le contenu porte déjà son propre titre — qui change selon qu'on
 * attend, qu'on a des concepts, ou que le texte n'a rien donné. Deux titres
 * visibles l'un sur l'autre pour dire la même chose ne servent personne ; un nom
 * stable annoncé à l'ouverture, oui.
 */
export function FenetreDeLEssai({
  ouverte,
  surFermeture,
  pied,
  children,
}: {
  ouverte: boolean;
  surFermeture: () => void;
  /**
   * Ce qui ne défile pas, en bas. Réservé au geste qui ferme l'essai : sur un
   * téléphone, un appel à garder posé à la fin d'une liste de concepts se
   * trouve à deux écrans du pouce.
   */
  pied?: ReactNode;
  children: ReactNode;
}) {
  const t = useTranslations("site.essai.fenetre");

  return (
    <DialogPrimitive.Root
      open={ouverte}
      onOpenChange={(ouvert) => {
        if (!ouvert) surFermeture();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 fixed inset-0 z-50 bg-stone-900/45" />

        {/*
          Le centrage vit sur une enveloppe, et pas sur la fenêtre elle-même.

          Une fenêtre centrée par `top-1/2 left-1/2 -translate-1/2` doit annuler
          ses quatre réglages pour devenir plein écran sur téléphone, et
          `inset-0` contre `top-1/2` est une course entre deux utilitaires qui
          écrivent la même propriété. Une enveloppe en `flex` fait les deux sans
          conflit : étirée par défaut, donc pleine hauteur sur téléphone ;
          centrée à partir de `md`. Elle évite au passage la transformation, qui
          rend le texte flou sur certains écrans.

          Cliquer dessus ferme quand même : Radix écoute les pointeurs hors du
          contenu, et l'enveloppe est hors du contenu.
        */}
        <div className="md:p-pas-8 fixed inset-0 z-50 flex md:items-center md:justify-center">
          <DialogPrimitive.Content
            className="grain grain-clair md:rounded-carte data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 bg-surface-roche relative flex w-full flex-col overflow-hidden text-stone-50 outline-none md:max-h-[88svh] md:w-full md:max-w-4xl"
            aria-describedby={undefined}
          >
            <DialogPrimitive.Title className="sr-only">{t("titre")}</DialogPrimitive.Title>

            {/*
              La croix vit dans une barre, et pas en absolu par-dessus.

              Posée en absolu dans le coin, elle se retrouvait sous le cairn de
              l'en-tête du résultat — deux objets clairs au même endroit —, et
              chaque écran de la fenêtre aurait dû réserver sa place dans son
              propre coin. Une barre la met hors du chemin une fois pour toutes,
              quel que soit ce qui suit ; sur la roche, elle ne se voit pas : il
              n'y a que la croix.
            */}
            <div className="px-pas-3 pt-pas-3 md:px-pas-6 md:pt-pas-6 relative z-20 flex shrink-0 justify-end">
              <DialogPrimitive.Close
                className="inline-flex size-10 items-center justify-center rounded-xs text-stone-400 transition-colors hover:bg-stone-700 hover:text-stone-50"
                aria-label={t("fermer")}
              >
                <X className="size-5" />
              </DialogPrimitive.Close>
            </div>

            {/*
              Le contenu défile, la fenêtre non. C'est ce qui permet au grain de
              couvrir toute la surface — posé sur l'élément qui défile, il
              s'arrêterait au premier écran et laisserait la roche nue en
              dessous — et au pied de rester sous le pouce.

              Il défile avec l'ascenseur de la roche, et pas celui du système.
              Sous Windows, celui-ci pose un rail gris clair sur toute la hauteur
              du bord droit : sur une fenêtre sombre, c'est l'objet le plus
              lumineux de l'écran, et le seul qui vienne d'un autre dessin que le
              nôtre. Il ne disparaît pas pour autant — c'est la seule chose qui
              dise qu'il reste des concepts sous le pli.
            */}
            <div className="px-pas-6 pb-pas-8 md:px-pas-12 md:pb-pas-12 ascenseur-sur-roche relative z-10 flex-1 overflow-y-auto">
              {children}
            </div>

            {pied ? (
              <div className="px-pas-6 py-pas-4 md:px-pas-12 md:py-pas-6 relative z-10 shrink-0 bg-stone-800 pb-[max(var(--pas-4),env(safe-area-inset-bottom))] md:pb-[var(--pas-6)]">
                {pied}
              </div>
            ) : null}
          </DialogPrimitive.Content>
        </div>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
