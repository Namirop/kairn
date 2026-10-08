import Link from "next/link";
import { useTranslations } from "next-intl";
import { SilhouetteDeCairn } from "@/components/cairn/silhouette-de-cairn";
import { Panneau } from "@/components/coquille/panneau";
import { Apparition, Temps } from "@/components/site/apparition";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/auth/routes";

/**
 * Dire ce que le produit n'est pas vaut mieux qu'une liste de fonctionnalités :
 * c'est ce qui permet à quelqu'un de décider en dix secondes que ce n'est pas
 * pour lui, et de partir sans rancune.
 *
 * C'est le panneau de roche de la page publique — l'un des deux de toute
 * l'application. Le noir sert l'affirmation : on ne dit pas « ce n'est pas ça »
 * sur la même surface que tout le reste.
 *
 * C'est aussi le seul endroit qui porte la silhouette du cairn en fond. Elle
 * déborde du panneau et sort du cadre : une forme entière, posée bien au
 * milieu, redeviendrait une illustration.
 *
 * **La première négation nomme la corvée, elle n'invente pas de statistique.**
 * Elle disait « personne ne tient un jeu de cartes plus de trois semaines » :
 * trois semaines ne vient d'aucune mesure, et « tenir un jeu de cartes » se lit
 * d'abord comme des cartes à jouer. Surtout, elle donnait le symptôme sans la
 * cause — or la cause est exactement ce que le produit remplace. Ce qui use
 * n'est pas de réviser, c'est de fabriquer les cartes, et c'est ce travail-là
 * que Kairn fait à la place.
 *
 * Les deux paragraphes n'arrivent pas ensemble, et c'est la seule chose que
 * l'animation fait ici : les négations d'abord, l'affirmation ensuite. « C'est une
 * seule chose » est la conclusion des trois « ce n'est pas », et la lire en même
 * temps qu'elles en fait un quatrième élément de liste.
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
