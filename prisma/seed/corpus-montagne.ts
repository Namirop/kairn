import type { SeedInput } from "./corpus-types";

/**
 * Hors informatique : une observation de terrain, et une carte qu'on apprend
 * à lire. La démonstration doit montrer que Kairn ne sert pas qu'au code.
 */
export const CORPUS_MONTAGNE: SeedInput[] = [
  {
    sourceType: "TEXT",
    createdDaysAgo: 34,
    rawContent:
      "Un lichen n'est pas une plante mais une association entre un champignon et une algue. Il pousse de quelques millimètres par an, ce qui permet de dater un éboulement en mesurant les plus gros.",
    atoms: [
      {
        concept:
          "Un lichen n'est pas une plante : c'est une symbiose entre un champignon, qui retient l'eau et abrite, et une algue, qui produit les sucres par photosynthèse. Aucun des deux ne survivrait seul là où le lichen s'installe.",
        tags: ["biologie", "montagne"],
        state: "CONSOLIDATED",
        history: [
          [33, "GOOD"],
          [27, "GOOD"],
          [12, "EASY"],
        ],
        variants: [
          {
            format: "CLOZE",
            facet: "RECOGNITION",
            question: "Complète la phrase.",
            answerKey: "symbiose",
            payload: {
              sentence:
                "Un lichen est une ___ entre un champignon et une algue : chacun y tire un bénéfice que l'autre lui apporte.",
              accepted: ["symbiose", "symbioses"],
            },
          },
          {
            format: "EXPLAIN",
            facet: "MECHANISM",
            question: "Qu'apporte chacun des deux partenaires à l'autre ?",
            answerKey:
              "Le champignon retient l'eau et forme la structure qui abrite ; l'algue produit les sucres par photosynthèse. Une réponse qui n'attribue pas la photosynthèse à l'algue passe à côté.",
          },
          {
            format: "TRUE_FALSE",
            facet: "BOUNDARY",
            question: "Le champignon d'un lichen parasite l'algue.",
            answerKey:
              "Faux. Les deux tirent un bénéfice de l'association : c'est ce qui la distingue du parasitisme, où l'un vit aux dépens de l'autre.",
            payload: { expected: false },
          },
        ],
      },
      {
        concept:
          "Un lichen pousse de quelques millimètres par an sur la roche nue. En mesurant le diamètre des plus grands lichens installés sur des blocs, on remonte à l'année où la roche s'est retrouvée à l'air libre — c'est la lichénométrie, qui sert à dater un éboulement.",
        tags: ["biologie", "montagne"],
        state: "REVIEWING",
        history: [
          [30, "HARD"],
          [22, "AGAIN"],
          [15, "GOOD"],
          [4, "GOOD"],
        ],
        variants: [
          {
            format: "CLOZE",
            facet: "RECOGNITION",
            question: "Complète la phrase.",
            answerKey: "diamètre",
            payload: {
              sentence:
                "On date un éboulement en mesurant le ___ des plus grands lichens installés sur les blocs.",
              accepted: ["diamètre", "diametre", "diamètres"],
            },
          },
          {
            format: "MCQ",
            facet: "MECHANISM",
            question: "Sur quoi repose la datation d'un éboulement par les lichens ?",
            answerKey: "Sur une croissance lente et régulière, de quelques millimètres par an.",
            payload: {
              options: [
                "Sur une croissance lente et régulière, de quelques millimètres par an.",
                "Sur le nombre d'espèces différentes installées sur le bloc.",
                "Sur la couleur du lichen, qui fonce avec les années.",
                "Sur l'épaisseur de la couche, qui double chaque décennie.",
              ],
              correctIndex: 0,
            },
          },
          {
            format: "TRUE_FALSE",
            facet: "BOUNDARY",
            question: "La méthode donne la date à l'année près.",
            answerKey:
              "Faux. La croissance varie avec l'exposition et l'humidité : la datation est grossière, et se cale sur des surfaces dont l'âge est connu.",
            payload: { expected: false },
          },
        ],
      },
    ],
  },
  {
    sourceType: "TEXT",
    createdDaysAgo: 9,
    rawContent:
      "Sur une carte de rando, les courbes de niveau relient les points de même altitude. L'écart entre deux courbes voisines est fixe : c'est l'équidistance. Ce qui compte, c'est l'espacement entre les courbes.",
    atoms: [
      {
        concept:
          "Sur une carte, les courbes de niveau relient les points de même altitude. L'écart d'altitude entre deux courbes voisines ne change jamais sur une même carte : c'est l'équidistance, indiquée dans la légende, souvent dix mètres.",
        tags: ["cartographie", "montagne"],
        state: "LEARNING",
        history: [[3, "HARD"]],
        variants: [
          {
            format: "CLOZE",
            facet: "RECOGNITION",
            question: "Complète la phrase.",
            answerKey: "équidistance",
            payload: {
              sentence:
                "L'écart d'altitude constant entre deux courbes de niveau voisines s'appelle l'___.",
              accepted: ["équidistance", "equidistance"],
            },
          },
          {
            format: "MCQ",
            facet: "BOUNDARY",
            question: "Que signifient des courbes très serrées à un endroit de la carte ?",
            answerKey: "Une pente raide : la même dénivelée y tient sur moins de distance.",
            payload: {
              options: [
                "Une pente raide : la même dénivelée y tient sur moins de distance.",
                "Une altitude élevée, quelle que soit la pente du terrain.",
                "Un terrain accidenté mais globalement plat.",
                "Une zone où la carte a été relevée avec plus de précision.",
              ],
              correctIndex: 0,
            },
          },
          {
            format: "SHORT_ANSWER",
            facet: "APPLICATION",
            question:
              "Tu vois une courbe fermée en anneau. Comment sais-tu si c'est un sommet ou une cuvette ?",
            answerKey:
              "En lisant les altitudes portées le long des courbes : si les chiffres augmentent vers le centre, c'est un sommet ; s'ils diminuent, c'est une dépression. Le dessin seul ne permet pas de trancher.",
          },
        ],
      },
    ],
  },
];
