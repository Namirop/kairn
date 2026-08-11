import { Panneau } from "@/components/coquille/panneau";

const ETAPES = [
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
 * qu'il est voulu, et non oublié d'une passe précédente.
 *
 * Le titre tient sa colonne à gauche et les étapes occupent la droite : sur un
 * écran large, la moitié droite portait du vide alors que le contenu existait
 * déjà pour la remplir.
 */
export function Sentier() {
  return (
    <Panneau surface="ombre" aere className="gap-pas-12 grid md:grid-cols-[1fr_1.6fr]">
      <h2 className="font-display text-h2-site leading-[1] font-bold tracking-[-0.02em]">
        Trois gestes,
        <br />
        et c&apos;est tout.
      </h2>

      <ol>
        {ETAPES.map((etape) => (
          <li
            key={etape.titre}
            className="gap-pas-6 pb-pas-8 not-last:before:top-pas-6 relative flex not-last:before:absolute not-last:before:bottom-0 not-last:before:left-[7px] not-last:before:w-0.5 not-last:before:bg-stone-300 last:pb-0"
          >
            <span
              aria-hidden
              className="mt-pas-2 relative z-10 h-2 w-4 shrink-0 rounded-xs bg-stone-900"
            />
            <div>
              <h3 className="text-h2-app leading-tight font-bold">{etape.titre}</h3>
              <p className="mt-pas-2 max-w-xl text-stone-500">{etape.texte}</p>
            </div>
          </li>
        ))}
      </ol>
    </Panneau>
  );
}
