import type { SeedInput } from "./corpus-types";

/** Ce qui vient de notes rapides : TypeScript et Git. */
export const CORPUS_OUTILLAGE: SeedInput[] = [
  {
    sourceType: "TEXT",
    createdDaysAgo: 35,
    rawContent: `satisfies vérifie qu'une valeur respecte un type, sans remplacer le type inféré par ce type-là. Une annotation, elle, élargit.
unknown force à restreindre avant usage. any supprime la vérification.`,
    atoms: [
      {
        concept:
          "`satisfies` vérifie qu'une valeur respecte un type tout en gardant son type inféré, plus précis. Une annotation, elle, remplace l'inférence par le type déclaré.",
        tags: ["typescript"],
        state: "REVIEWING",
        history: [
          [33, "GOOD"],
          [25, "HARD"],
          [14, "GOOD"],
          [5, "GOOD"],
        ],
        variants: [
          {
            format: "CODE",
            question:
              '`const routes = { accueil: "/", session: "/session" }`. Comment contraindre les valeurs à `string` sans perdre les clés littérales ?',
            answerKey:
              'const routes = { accueil: "/", session: "/session" } satisfies Record<string, string>;\n\n`routes.accueil` reste du type `"/"`, et `keyof typeof routes` reste `"accueil" | "session"`.',
            payload: { language: "ts" },
          },
          {
            format: "SHORT_ANSWER",
            question: "Que perd-on en écrivant `const x: Record<string, string> = { … }` ?",
            answerKey:
              "Les clés et les valeurs littérales : le type devient `Record<string, string>` et `keyof typeof x` devient `string`.",
          },
          {
            format: "TRUE_FALSE",
            question: "`satisfies` modifie le type inféré de la valeur.",
            answerKey: "Faux",
            payload: { statement: "satisfies modifie l'inférence", expected: false },
          },
        ],
      },
      {
        concept:
          "`unknown` oblige à restreindre le type avant tout usage. `any` désactive la vérification et laisse passer n'importe quel accès.",
        tags: ["typescript"],
        state: "CONSOLIDATED",
        history: [
          [34, "EASY"],
          [28, "GOOD"],
          [16, "EASY"],
          [5, "GOOD"],
        ],
        variants: [
          {
            format: "SHORT_ANSWER",
            question: "Que peut-on faire d'une valeur `unknown` sans la restreindre ?",
            answerKey:
              "La comparer, la réaffecter, la passer à quelque chose qui accepte `unknown`. Aucun accès de propriété ni appel.",
          },
          {
            format: "EXPLAIN",
            question: "Pourquoi préférer `unknown` à `any` pour la réponse d'une API ?",
            answerKey:
              "`unknown` force à passer par une validation avant usage. `any` laisse le code compiler sur une forme qui n'existe peut-être pas, et l'erreur ne sort qu'à l'exécution.",
          },
          {
            format: "MCQ",
            question: "Laquelle de ces lignes compile ?",
            answerKey: '`const v: unknown = fetchJson(); if (typeof v === "string") v.trim();`',
            payload: {
              options: [
                '`const v: unknown = fetchJson(); if (typeof v === "string") v.trim();`',
                "`const v: unknown = fetchJson(); v.trim();`",
                "`const v: unknown = fetchJson(); v.length;`",
                "`const v: unknown = fetchJson(); v();`",
              ],
            },
          },
        ],
      },
    ],
  },
  {
    sourceType: "TEXT",
    createdDaysAgo: 41,
    rawContent:
      "rebase rejoue les commits sur une nouvelle base et leur donne de nouveaux identifiants. reflog garde la trace des positions passées de HEAD.",
    atoms: [
      {
        concept:
          "`git rebase` rejoue les commits d'une branche sur une nouvelle base. Les commits rejoués sont de nouveaux objets, avec de nouveaux identifiants.",
        tags: ["git"],
        state: "ARCHIVED",
        archivedDaysAgo: 18,
        history: [
          [39, "EASY"],
          [31, "EASY"],
        ],
        variants: [
          {
            format: "SHORT_ANSWER",
            question: "Que deviennent les identifiants des commits après un rebase ?",
            answerKey:
              "Ils changent : les commits sont recréés sur la nouvelle base. Les anciens restent atteignables par le reflog jusqu'au nettoyage.",
          },
          {
            format: "TRUE_FALSE",
            question: "Un rebase conserve les identifiants des commits rejoués.",
            answerKey: "Faux",
            payload: { statement: "identifiants conservés", expected: false },
          },
          {
            format: "EXPLAIN",
            question: "Pourquoi éviter de rebaser une branche déjà partagée ?",
            answerKey:
              "Les commits rejoués remplacent des commits que d'autres ont déjà en local. Leur prochain `pull` verra deux historiques divergents pour le même travail.",
          },
        ],
      },
      {
        concept:
          "`git reflog` garde la trace des positions passées de `HEAD`. C'est ce qui permet de retrouver un commit après un `reset --hard` ou un rebase raté.",
        tags: ["git"],
        state: "LEARNING",
        history: [
          [7, "AGAIN"],
          [5, "HARD"],
          [2, "GOOD"],
        ],
        variants: [
          {
            format: "CODE",
            question: "Tu viens de perdre un commit avec `git reset --hard HEAD~3`. Récupère-le.",
            answerKey:
              "git reflog                  # repérer la ligne d'avant le reset, ex. HEAD@{1}\ngit reset --hard HEAD@{1}   # ou : git branch sauvetage <sha>",
            payload: { language: "bash" },
          },
          {
            format: "SHORT_ANSWER",
            question: "Le reflog est-il partagé avec le dépôt distant ?",
            answerKey: "Non. Il est local au clone et il expire, par défaut au bout de 90 jours.",
          },
          {
            format: "MCQ",
            question: "Que note le reflog ?",
            answerKey: "Les positions successives de `HEAD` et des branches locales.",
            payload: {
              options: [
                "Les positions successives de `HEAD` et des branches locales.",
                "Les commits poussés vers le distant.",
                "Le contenu des fichiers à chaque commit.",
                "Les conflits de fusion résolus.",
              ],
            },
          },
        ],
      },
    ],
  },
];
