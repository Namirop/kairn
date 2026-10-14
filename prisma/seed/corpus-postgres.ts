import type { InputDuCorpus } from "./types-du-corpus";

/** Ce qui vient d'un copier-coller de réponse d'assistant sur les index Postgres. */
export const CORPUS_POSTGRES: InputDuCorpus[] = [
  {
    sourceType: "TEXT",
    deposeIlYAJours: 63,
    rawContent: `Quand choisir quel index dans Postgres ?

Un B-tree sert les égalités, les intervalles et le tri. C'est le défaut, et il couvre la grande majorité des cas.
Un GIN indexe le contenu d'une valeur composite : éléments d'un tableau, clés d'un JSONB, lexèmes d'un tsvector.
Dans un index composite, seul un préfixe de gauche des colonnes est utilisable : (a, b) sert a et (a, b), pas b seul.
Un index partiel porte une clause WHERE. Il ne contient que les lignes qui la satisfont, ce qui le rend minuscule quand la condition est rare.`,
    atoms: [
      {
        concept:
          "Un index B-tree sert les égalités, les intervalles et le tri. Il n'aide pas à chercher à l'intérieur d'un tableau ou d'un JSONB : il indexe la valeur entière.",
        tags: ["postgres", "index"],
        state: "CONSOLIDATED",
        historique: [
          [61, "GOOD"],
          [52, "GOOD"],
          [34, "EASY"],
          [12, "GOOD"],
          [2, "EASY"],
        ],
        variants: [
          {
            format: "MCQ",
            facet: "APPLICATION",
            question: "Laquelle de ces requêtes un B-tree sur `créé_le` ne sert-il pas ?",
            answerKey: "`WHERE tags @> ARRAY['css']`",
            payload: {
              options: [
                "`WHERE tags @> ARRAY['css']`",
                "`WHERE créé_le > now() - interval '7 days'`",
                "`ORDER BY créé_le DESC LIMIT 20`",
                "`WHERE créé_le = '2026-01-01'`",
              ],
            },
          },
          {
            format: "SHORT_ANSWER",
            facet: "RECOGNITION",
            question: "Quels trois usages un B-tree couvre-t-il ?",
            answerKey: "L'égalité, l'intervalle et le tri sur la colonne indexée.",
          },
          {
            format: "TRUE_FALSE",
            facet: "BOUNDARY",
            question:
              "Un B-tree sur une colonne JSONB permet de chercher une clé à l'intérieur du document.",
            answerKey: "Faux",
            payload: { statement: "B-tree cherche dans le JSONB", expected: false },
          },
        ],
      },
      {
        concept:
          "Un index GIN indexe le contenu d'une valeur composite — éléments d'un tableau, clés d'un JSONB, lexèmes d'un tsvector — au lieu de la valeur entière.",
        tags: ["postgres", "index"],
        state: "REVIEWING",
        historique: [
          [58, "AGAIN"],
          [51, "HARD"],
          [40, "GOOD"],
          [19, "GOOD"],
        ],
        variants: [
          {
            format: "SHORT_ANSWER",
            facet: "RECOGNITION",
            question: "Qu'indexe un GIN qu'un B-tree n'indexe pas ?",
            answerKey:
              "Les éléments contenus dans la valeur : chaque entrée d'un tableau, chaque clé d'un JSONB, chaque lexème d'un tsvector.",
          },
          {
            format: "CODE",
            facet: "APPLICATION",
            question:
              "Écris l'index qui sert `SELECT * FROM \"Atom\" WHERE tags @> ARRAY['postgres']`.",
            answerKey: 'CREATE INDEX ON "Atom" USING GIN (tags);',
            payload: { language: "sql" },
          },
          {
            format: "EXPLAIN",
            facet: "MECHANISM",
            question: "Pourquoi un GIN est-il plus lent à écrire qu'un B-tree ?",
            answerKey:
              "Une seule ligne produit autant d'entrées d'index qu'elle contient d'éléments. Chaque insertion touche donc plusieurs endroits de l'index.",
          },
        ],
      },
      {
        concept:
          "Dans un index composite, seul un préfixe de gauche des colonnes est utilisable. Un index sur `(userId, due)` sert `userId` seul et le couple, jamais `due` seul.",
        tags: ["postgres", "index"],
        state: "LEARNING",
        historique: [[0, "AGAIN"]],
        variants: [
          {
            format: "MCQ",
            facet: "BOUNDARY",
            question: "Avec un index sur `(userId, due)`, quelle requête ne l'utilise pas ?",
            answerKey: "`WHERE due < now()`",
            payload: {
              options: [
                "`WHERE due < now()`",
                "`WHERE userId = $1`",
                "`WHERE userId = $1 AND due < now()`",
                "`WHERE userId = $1 ORDER BY due`",
              ],
            },
          },
          {
            format: "SHORT_ANSWER",
            facet: "MECHANISM",
            question: "Quelle règle décide de l'ordre des colonnes d'un index composite ?",
            answerKey:
              "Les colonnes filtrées par égalité d'abord, la colonne d'intervalle ou de tri ensuite. Seul un préfixe de gauche est servi.",
          },
          {
            format: "EXPLAIN",
            facet: "APPLICATION",
            question: "Faut-il un second index sur `due` seul si `(userId, due)` existe déjà ?",
            answerKey:
              "Seulement si une requête filtre sur `due` sans `userId`. Dans Kairn la requête chaude porte toujours les deux : le composite suffit.",
          },
        ],
      },
      {
        concept:
          "Un index partiel porte une clause `WHERE` et n'indexe que les lignes qui la satisfont. Il reste minuscule quand la condition est rare.",
        tags: ["postgres", "index"],
        state: "LEARNING",
        historique: [
          [6, "HARD"],
          [1, "AGAIN"],
        ],
        variants: [
          {
            format: "CODE",
            facet: "APPLICATION",
            question:
              "Écris l'index qui sert la reprise des jobs restés en attente, sachant qu'ils sont rares.",
            answerKey: 'CREATE INDEX ON "GenerationJob" ("createdAt") WHERE status = \'QUEUED\';',
            payload: { language: "sql" },
          },
          {
            format: "SHORT_ANSWER",
            facet: "MECHANISM",
            question: "Quand un index partiel est-il rentable ?",
            answerKey:
              "Quand la condition ne retient qu'une petite part de la table et que toutes les requêtes visées la portent aussi.",
          },
          {
            format: "TRUE_FALSE",
            facet: "BOUNDARY",
            question:
              "Une requête sans la clause `WHERE` de l'index partiel peut quand même s'en servir.",
            answerKey: "Faux",
            payload: { statement: "utilisable sans la condition", expected: false },
          },
        ],
      },
    ],
  },
];
