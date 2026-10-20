import Link from "next/link";
import { useTranslations } from "next-intl";
import { SilhouetteDeCairn } from "@/components/cairn/silhouette-de-cairn";
import { Panneau } from "@/components/coquille/panneau";
import { Apparition, Temps } from "@/components/site/apparition";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/auth/routes";

/**
 * Ce que le produit n'est pas. La silhouette déborde du panneau : entière, elle
 * redeviendrait une illustration. L'affirmation arrive après les négations,
 * sans quoi elle se lirait comme un élément de plus de la liste.
 */
export function PasCeci({ connecte }: { connecte: boolean }) {
  const t = useTranslations("site.accueil.pasCeci");

  return (
    <Panneau
      surface="roche"
      aere
      className="gap-pas-8 md:gap-pas-16 grid md:grid-cols-[1fr_minmax(0,36rem)]"
      fond={
        <SilhouetteDeCairn className="absolute -right-8 bottom-0 h-[130%] md:right-8 md:h-[150%]" />
      }
    >
      <Apparition ecart={0.26}>
        <h2 className="font-display text-h2-site leading-[1] font-bold tracking-[-0.02em]">
          <Temps balise="span" pierre className="block">
            {t("titreHaut")}
          </Temps>
          <Temps balise="span" pierre className="block">
            {t("titreBas")}
          </Temps>
        </h2>
      </Apparition>

      <Apparition className="text-stone-300">
        <Temps>
          <p>{t("negations")}</p>
        </Temps>

        <Temps>
          <p className="mt-pas-4 text-stone-50">{t("affirmation")}</p>
        </Temps>

        <Temps>
          <Button
            asChild
            size="lg"
            className="mt-pas-8 bg-stone-50 text-stone-900 hover:bg-stone-300"
          >
            <Link href={connecte ? ROUTES.aujourdhui : ROUTES.connexion}>
              {connecte ? t("aujourdhui") : t("creerCompte")}
            </Link>
          </Button>
        </Temps>
      </Apparition>
    </Panneau>
  );
}
