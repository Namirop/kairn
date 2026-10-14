import { CairnRenversable } from "@/components/cairn/cairn-renversable";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ROUTES } from "@/lib/auth/routes";
import { Button } from "@/components/ui/button";
import { Panneau } from "@/components/coquille/panneau";
import { Apparition, Temps } from "@/components/site/apparition";
import { PaysageDeCairns } from "@/components/site/paysage-de-cairns";

/**
 * L'ouverture. Titre à gauche, cairn à droite.
 *
 * La seconde ligne du titre arrive pleine et se vide (`ligne-oubli`) : elle
 * perd son encre au moment où elle dit qu'on perd ce qu'on a lu. Le contour
 * tient le contraste d'un texte (`titre-creux`, dans
 * `app/styles/utilities/titre-creux.css`).
 *
 * Les deux colonnes se calent en bas et partagent `--hauteur-cairn` : le cairn
 * plafonne quand le panneau, lui, suit la fenêtre, donc le titre prend la
 * hauteur du cairn et s'y centre pour rester sur le même axe. Le rembourrage
 * bas est posé sur les deux ; n'en décaler qu'une ferait glisser le cairn par
 * rapport au titre.
 */
export function Ouverture({ connecte }: { connecte: boolean }) {
  const t = useTranslations("site.accueil.hero");

  return (
    <Panneau
      surface="papier"
      /* Le seul panneau qui porte le ciel plutôt que sa surface. */
      ciel
      aere
      mesure="large"
      /* Sur téléphone, un rembourrage haut réduit : le cairn et son geste
         doivent tenir au-dessus du pli. `--hauteur-cairn` vit ici parce
         qu'aucune des deux colonnes ne peut la lire chez l'autre. */
      className="max-md:pt-pas-8 gap-pas-12 grid items-center [--hauteur-cairn:clamp(20rem,52vh,36rem)] md:min-h-[calc(100svh-5rem-2rem)] md:grid-cols-[1.7fr_1fr] md:items-end"
      fond={<PaysageDeCairns />}
    >
      {/* `z-10` : le titre passe devant le cairn, qui vient après dans le
          balisage. Renversé, ses pierres traversent l'écran et effaceraient la
          phrase. `min-h` et non `h` : un titre trop long pousse sa boîte au lieu
          d'en sortir. */}
      <Apparition className="md:pb-pas-24 relative z-10 md:flex md:min-h-[var(--hauteur-cairn)] md:flex-col md:justify-center">
        <h1 className="font-display text-ouverture leading-[0.95] font-bold tracking-[-0.03em] text-balance md:leading-[0.84] md:tracking-[-0.045em]">
          <Temps balise="span" className="block">
            {t("constat")}
          </Temps>

          {/* Le creux occupe le flux, le plein se pose dessus et s'en va : la
              hauteur du titre ne dépend donc jamais de l'animation. Les deux
              copies sont masquées aux lecteurs d'écran, qui n'annoncent que la
              troisième — sans quoi la phrase serait lue trois fois. */}
          <Temps balise="span" className="ligne-oubli block">
            <span aria-hidden className="titre-creux block">
              {t("retournement")}
            </span>
            <span aria-hidden className="oubli-plein">
              {t("retournement")}
            </span>
            <span className="sr-only">{t("retournement")}</span>
          </Temps>
        </h1>

        {/* Visiteur : l'essai plus bas. Connecté : sa journée. Le bouton en
            contour porte la surface du panneau, sans quoi une pierre renversée
            se verrait au travers. */}
        <Temps>
          <Button
            asChild
            variant="outline"
            size="lg"
            /* Un cran plus petit sur téléphone : le sujet de l'ouverture est la
               phrase, pas le geste. */
            className="mt-pas-4 md:mt-pas-6 geste-du-ciel max-md:px-pas-6 max-md:text-petit max-md:h-10"
          >
            {connecte ? (
              <Link href={ROUTES.aujourdhui}>{t("aujourdhui")}</Link>
            ) : (
              <a href="#depot">{t("essayer")}</a>
            )}
          </Button>
        </Temps>
      </Apparition>

      {/* Sur téléphone, le cairn descend jusqu'à mi-butte : la crête proche
          est à 11,5 % de la hauteur du panneau (`PLANS_TELEPHONE`) et le pied
          de la pierre la plus basse se pose au milieu de la bande qui va de là
          au bas. Si la crête bouge, ce `-mb` se remesure. */}
      <div className="-mb-pas-12 md:pb-pas-24 flex justify-center md:mb-0">
        <div className="relative aspect-[100/93] w-[min(62vw,17rem)] md:aspect-auto md:h-[var(--hauteur-cairn)] md:w-full">
          <span
            aria-hidden
            /* L'ombre portée passe par des variables : réglée pour du papier,
               elle disparaîtrait sur un sol coloré, et c'est elle qui dit que
               la pierre touche terre. */
            className="rounded-galet absolute bottom-[1%] left-1/2 h-[6%] w-[54%] -translate-x-1/2 blur-[12px]"
            style={{
              background: "var(--ombre-du-cairn)",
              opacity: "var(--ombre-du-cairn-part)",
            }}
          />
          <CairnRenversable nombre={7} />
        </div>
      </div>
    </Panneau>
  );
}
