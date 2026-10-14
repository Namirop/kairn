import type { SeedInput } from "./corpus-types";

/**
 * Un podcast et un livre de cuisine : du savoir ordinaire, mal écrit pour l'un,
 * propre pour l'autre. Les notes décousues portent aussi l'état `ARCHIVED`,
 * pour qu'il se voie dans la démonstration.
 */
export const CORPUS_CUISINE: SeedInput[] = [
  {
    sourceType: "TEXT",
    createdDaysAgo: 61,
    rawContent:
      "notes du podcast sur le commerce de la glace : ils sciaient des blocs sur les lacs gelés et les gardaient dans des glacières. ce qui compte c'est pas le froid c'est l'isolation, et le volume du tas.",
    atoms: [
      {
        concept:
          "Avant les réfrigérateurs, la glace découpée l'hiver sur les lacs gelés se gardait des mois dans des bâtiments isolés. Ce qui la conserve n'est pas le froid ambiant mais la lenteur avec laquelle la chaleur extérieure pénètre.",
        tags: ["histoire", "physique"],
        state: "ARCHIVED",
        archivedDaysAgo: 16,
        history: [
          [59, "GOOD"],
          [48, "GOOD"],
          [30, "EASY"],
          [16, "EASY"],
        ],
        variants: [
          {
            format: "CLOZE",
            facet: "RECOGNITION",
            question: "Complète la phrase.",
            answerKey: "isolation",
            payload: {
              sentence:
                "Ce qui garde un bloc de glace des mois, ce n'est pas le froid autour de lui, c'est l'___ qui ralentit l'entrée de la chaleur.",
              accepted: ["isolation", "l'isolation"],
            },
          },
          {
            format: "EXPLAIN",
            facet: "MECHANISM",
            question: "Pourquoi un gros tas de glace fond-il moins vite qu'un petit ?",
            answerKey:
              "Parce qu'il présente moins de surface par rapport à sa masse : la chaleur entre par la surface, et la masse à faire fondre grandit plus vite qu'elle. C'est pour ça qu'on empilait le plus gros possible plutôt que d'étaler.",
          },
          {
            format: "MCQ",
            facet: "APPLICATION",
            question: "À quoi servait la sciure de bois placée entre les blocs ?",
            answerKey: "À isoler, et à empêcher les blocs de se ressouder en regelant.",
            payload: {
              options: [
                "À isoler, et à empêcher les blocs de se ressouder en regelant.",
                "À absorber l'eau de fonte pour qu'elle ne stagne pas au sol.",
                "À parfumer la glace destinée aux boissons.",
                "À caler les blocs pour qu'ils ne basculent pas pendant le transport.",
              ],
              correctIndex: 0,
            },
          },
        ],
      },
      {
        concept:
          "Un bloc de glace transporté par bateau jusqu'aux Antilles arrivait à plus de la moitié de son poids de départ, après plusieurs semaines de traversée. C'est le rapport entre la surface et la masse d'un chargement entier qui rend la chose possible.",
        tags: ["histoire"],
        state: "LEARNING",
        history: [
          [7, "AGAIN"],
          [2, "HARD"],
        ],
        variants: [
          {
            format: "CLOZE",
            facet: "RECOGNITION",
            question: "Complète la phrase.",
            answerKey: "surface",
            payload: {
              sentence:
                "Un gros chargement de glace fond lentement parce qu'il présente peu de ___ exposée par rapport à sa masse.",
              accepted: ["surface", "surfaces"],
            },
          },
          {
            format: "TRUE_FALSE",
            facet: "BOUNDARY",
            question: "Doubler la taille d'un bloc double le temps qu'il met à fondre.",
            answerKey:
              "Faux. La masse croît plus vite que la surface par laquelle la chaleur entre : le temps de fonte augmente davantage que le double.",
            payload: { expected: false },
          },
          {
            format: "SHORT_ANSWER",
            facet: "APPLICATION",
            question:
              "Tu dois garder de la glace une journée entière sans réfrigérateur. Que fais-tu de ce que tu as ?",
            answerKey:
              "Un seul tas compact plutôt que des morceaux séparés, dans un contenant isolé, ouvert le moins souvent possible. Attendu : la compacité, pas seulement « mettre au frais ».",
          },
        ],
      },
    ],
  },
  {
    sourceType: "TEXT",
    createdDaysAgo: 21,
    rawContent:
      "La réaction de Maillard n'est pas une caramélisation : elle fait réagir les acides aminés avec les sucres, et démarre vers 140 °C. C'est pour ça qu'une viande ne dore pas dans une poêle où elle rend de l'eau.",
    atoms: [
      {
        concept:
          "La réaction de Maillard fait réagir les acides aminés d'un aliment avec ses sucres, à partir d'environ 140 °C. Elle produit la croûte dorée et l'essentiel des arômes de grillé. Elle est distincte de la caramélisation, qui ne concerne que les sucres.",
        tags: ["cuisine", "chimie"],
        state: "REVIEWING",
        history: [
          [19, "GOOD"],
          [11, "HARD"],
          [3, "GOOD"],
        ],
        variants: [
          {
            format: "CLOZE",
            facet: "RECOGNITION",
            question: "Complète la phrase.",
            answerKey: "acides aminés",
            payload: {
              sentence:
                "La réaction de Maillard fait réagir les sucres d'un aliment avec ses ___, ce qui la distingue de la caramélisation.",
              accepted: ["acides aminés", "acides amines", "protéines", "acide aminé"],
            },
          },
          {
            format: "MCQ",
            facet: "BOUNDARY",
            question: "Qu'est-ce qui distingue la caramélisation de la réaction de Maillard ?",
            answerKey: "La caramélisation ne met en jeu que les sucres, sans acides aminés.",
            payload: {
              options: [
                "La caramélisation ne met en jeu que les sucres, sans acides aminés.",
                "La caramélisation démarre à température plus basse, vers 60 °C.",
                "La caramélisation ne se produit qu'en présence d'eau.",
                "La caramélisation ne concerne que les aliments d'origine animale.",
              ],
              correctIndex: 0,
            },
          },
          {
            format: "EXPLAIN",
            facet: "APPLICATION",
            question:
              "Une viande posée dans une poêle rend de l'eau et reste grise. Qu'est-ce qui l'empêche de dorer ?",
            answerKey:
              "Tant que de l'eau s'évapore, la surface reste bloquée autour de 100 °C, en dessous du seuil de la réaction. Il faut sécher la surface, ne pas surcharger la poêle, et laisser la température remonter.",
          },
        ],
      },
    ],
  },
];
