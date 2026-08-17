import { Panneau } from "@/components/coquille/panneau";
import { Apparition, Temps } from "@/components/site/apparition";
import { TraceDuSentier, type EtapeDuSentier } from "@/components/site/trace-du-sentier";

const ETAPES: EtapeDuSentier[] = [
  {
    titre: "Tu déposes",
    texte:
      "Une phrase notée à la volée pendant un cours, un article collé en entier, la photo d'une page de livre. Rien à formater, rien à découper toi-même.",
  },
  {
    titre: "Kairn découpe",
    texte:
      "Le dépôt devient des concepts unitaires, chacun avec trois ou quatre façons d'être questionné : un terme à retrouver dans une phrase, un choix à faire, une explication à donner. La formulation tourne pour que tu retiennes l'idée, pas la phrase.",
  },
  {
    titre: "Ça revient",
    texte:
      "Chaque concept revient à l'instant où tu es sur le point de l'oublier. Plus tu le sais, plus il s'espace. Une pierre de plus au cairn quand il est acquis.",
  },
];

/**
 * Le sentier : une séquence réelle, donc une liste verticale reliée par un
 * trait, pas trois cartes côte à côte. Les marqueurs sont des pierres.
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
  return (
    <Panneau surface="ombre" aere className="gap-pas-12 grid md:grid-cols-[1fr_minmax(0,36rem)]">
      <Apparition>
        <Temps>
          <h2 className="font-display text-h2-site leading-[1] font-bold tracking-[-0.02em]">
            Trois gestes,
            <br />
            et c&apos;est tout.
          </h2>
        </Temps>
      </Apparition>

      <TraceDuSentier etapes={ETAPES} />
    </Panneau>
  );
}
