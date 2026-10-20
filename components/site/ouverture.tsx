import { CairnRenversable } from "@/components/cairn/cairn-renversable";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ROUTES } from "@/lib/auth/routes";
import { Button } from "@/components/ui/button";
import { Panneau } from "@/components/coquille/panneau";
import { Apparition, Temps } from "@/components/site/apparition";
import { PaysageDeCairns } from "@/components/site/paysage-de-cairns";

/**
 * L'ouverture. La seconde ligne du titre arrive pleine et se vide
 * (`ligne-oubli`) : elle perd son encre en disant qu'on oublie.
 *
 * Les deux colonnes partagent `--hauteur-cairn` : le cairn plafonne, le titre
 * prend sa hauteur et s'y centre. Le rembourrage bas est posé sur les deux ;
 * n'en décaler qu'une désaligne le cairn et le titre.
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
      /* Rembourrage haut réduit sur téléphone : le cairn et son geste tiennent
         au-dessus du pli. `--hauteur-cairn` vit sur le parent commun. */
      className="max-md:pt-pas-8 gap-pas-12 grid items-center [--hauteur-cairn:clamp(20rem,52vh,36rem)] md:min-h-[calc(100svh-5rem-2rem)] md:grid-cols-[1.7fr_1fr] md:items-end"
      fond={<PaysageDeCairns />}
    >
      {/* `z-10` : renversé, le cairn (après dans le balisage) traverse l'écran
          et effacerait la phrase. `min-h` : un titre long pousse sa boîte. */}
      <Apparition className="md:pb-pas-24 relative z-10 md:flex md:min-h-[var(--hauteur-cairn)] md:flex-col md:justify-center">
        <h1 className="font-display text-ouverture leading-[0.95] font-bold tracking-[-0.03em] text-balance md:leading-[0.84] md:tracking-[-0.045em]">
          <Temps balise="span" className="block">
            {t("constat")}
          </Temps>

          {/* Le creux tient le flux, le plein s'y superpose : la hauteur ne
              dépend pas de l'animation. Seule la copie `sr-only` est lue. */}
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

        {/* Le bouton en contour porte la surface du panneau, sans quoi une
            pierre renversée se verrait au travers. */}
        <Temps>
          <Button
            asChild
            variant="outline"
            size="lg"
            /* Plus petit sur téléphone : le sujet est la phrase, pas le geste. */
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

      {/* Sur téléphone, le pied du cairn se pose à mi-butte, la crête proche
          étant à 11,5 % du panneau (`PLANS_TELEPHONE`) : si elle bouge, ce
          `-mb` se remesure. */}
      <div className="-mb-pas-12 md:pb-pas-24 flex justify-center md:mb-0">
        <div className="relative aspect-[100/93] w-[min(62vw,17rem)] md:aspect-auto md:h-[var(--hauteur-cairn)] md:w-full">
          <span
            aria-hidden
            /* Ombre en variables : réglée pour du papier, elle disparaîtrait
               sur un sol coloré, et c'est elle qui pose le cairn au sol. */
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
