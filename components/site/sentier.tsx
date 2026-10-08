import { useTranslations } from "next-intl";
import { Panneau } from "@/components/coquille/panneau";
import { Apparition, Temps } from "@/components/site/apparition";
import { TraceDuSentier } from "@/components/site/trace-du-sentier";

/**
 * Les trois étapes, dans l'ordre, par leur clé dans `site.accueil.sentier`.
 *
 * Sur la première : l'énumération est partie : le champ de l'essai en porte
 * une, deux plis plus haut, au moment où la question « qu'est-ce que j'y mets ? »
 * se pose vraiment. Reste ce que cette étape est seule à pouvoir dire — qu'il
 * n'y a rien à faire — et le seul exemple que personne ne devine, la photo.
 */
const ETAPES = ["deposer", "decouper", "revenir"] as const;

/**
 * Le sentier : une séquence réelle, donc une liste verticale reliée par un
 * trait, pas trois cartes côte à côte. Les marqueurs sont des pierres.
 *
 * **Les trois étapes s'écrivent de la même encre.** « Ça revient » a porté un
 * temps le gris plein, pour la désigner comme la seule que l'essai ne peut pas
 * montrer. L'intention était bonne, l'effet non : dans une liste de trois
 * blocs identiques, un paragraphe d'une autre valeur ne se lit pas comme « ceci
 * compte plus », il se lit comme une erreur — la première question qu'il
 * soulève est « pourquoi celui-là est différent ? ». Une hiérarchie qui doit
 * s'expliquer n'en est pas une.
 *
 * Le titre, lui, reste court. Une version plus explicative — « deux gestes se
 * voient, le troisième non » — disait la même chose en trois lignes de display
 * et perdait la frappe ; ce qu'un titre de campagne gagne en précision, il le
 * paie en impact, et la précision est déjà dans la liste d'à côté.
 *
 * Ce trait-là reste, et il est le seul du produit : il ne sépare pas deux
 * sujets, il relie trois étapes qui s'enchaînent. Il s'épaissit pour qu'on voie
 * qu'il est voulu, et non oublié d'une passe précédente. Et il se **trace** à
 * mesure qu'on descend : c'est `TraceDuSentier` qui s'en charge, parce que ça
 * demande de suivre le défilement et donc de vivre côté client.
 *
 * Le titre tient sa colonne à gauche, les étapes occupent la droite, et la
 * colonne de droite vaut exactement la mesure de lecture. Laissée en fraction,
 * elle s'ouvrait plus large que le texte qu'elle porte : le paragraphe se coupait
 * à sa propre mesure et abandonnait le reste, ce qui creusait un vide contre le
 * bord droit et faisait pencher toute la section à gauche. Le mou est maintenant
 * entre les deux colonnes, où il se lit comme une séparation voulue.
 */
export function Sentier() {
  const t = useTranslations("site.accueil.sentier");

  return (
    <Panneau surface="ombre" aere className="gap-pas-12 grid md:grid-cols-[1fr_minmax(0,36rem)]">
      <Apparition ecart={0.26}>
        {/* Une ligne, un temps : le titre s'empile au lieu d'apparaître d'un
            bloc. C'est le geste du produit, et il ne coûte rien à la lecture —
            l'ordre des lignes ne change pas. */}
        <h2 className="font-display text-h2-site leading-[1] font-bold tracking-[-0.02em]">
          <Temps balise="span" pierre className="block">
            {t("titreHaut")}
          </Temps>
          <Temps balise="span" pierre className="block">
            {t("titreBas")}
          </Temps>
        </h2>
      </Apparition>

      <TraceDuSentier
        etapes={ETAPES.map((etape) => ({
          titre: t(`${etape}.titre`),
          texte: t(`${etape}.texte`),
        }))}
      />
    </Panneau>
  );
}
