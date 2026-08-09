import type { SeedInput } from "./corpus-types";

/** Ce qui vient du navigateur : CSS, cache HTTP, React. */
export const CORPUS_WEB: SeedInput[] = [
  {
    sourceType: "TEXT",
    createdDaysAgo: 6,
    rawContent:
      "content-visibility: auto laisse le navigateur sauter le rendu d'un élément tant qu'il est loin de la fenêtre.",
    atoms: [
      {
        concept:
          "`content-visibility: auto` autorise le navigateur à sauter le layout et la peinture d'un élément tant qu'il est loin de la fenêtre. L'élément reste dans le DOM.",
        tags: ["css", "performance"],
        state: "LEARNING",
        history: [
          [5, "AGAIN"],
          [1, "HARD"],
        ],
        variants: [
          {
            format: "SHORT_ANSWER",
            question: "Qu'est-ce que `content-visibility: auto` fait sauter au navigateur ?",
            answerKey:
              "Le layout et la peinture de l'élément, tant qu'il n'approche pas de la fenêtre. Le nœud reste dans le DOM et reste trouvable.",
          },
          {
            format: "TRUE_FALSE",
            question:
              "Avec `content-visibility: auto`, l'élément est retiré du DOM tant qu'il est hors écran.",
            answerKey: "Faux",
            payload: { statement: "retiré du DOM", expected: false },
          },
          {
            format: "MCQ",
            question: "Quel effet de bord faut-il compenser, et avec quoi ?",
            answerKey:
              "La hauteur devient nulle avant rendu : on la déclare avec `contain-intrinsic-size`.",
            payload: {
              options: [
                "La hauteur devient nulle avant rendu : on la déclare avec `contain-intrinsic-size`.",
                'Les images ne se chargent plus : on ajoute `loading="eager"`.',
                "Le texte n'est plus sélectionnable : on ajoute `user-select: text`.",
                "Les événements ne remontent plus : on ajoute `pointer-events: auto`.",
              ],
            },
          },
        ],
      },
    ],
  },
  {
    sourceType: "TEXT",
    createdDaysAgo: 92,
    rawContent: `Cache-Control: max-age=<secondes> — durée pendant laquelle la réponse est considérée fraîche, comptée depuis sa génération.
Cache-Control: stale-while-revalidate=<secondes> — après expiration, le cache peut encore servir la réponse périmée pendant ce délai, en revalidant en arrière-plan.
ETag: "<empreinte>" — le client renvoie la valeur en If-None-Match ; le serveur répond 304 sans corps si rien n'a bougé.`,
    atoms: [
      {
        concept:
          "`max-age` fixe la durée de fraîcheur d'une réponse en secondes, comptée depuis sa génération et non depuis sa réception par le client.",
        tags: ["http", "cache"],
        state: "CONSOLIDATED",
        history: [
          [88, "GOOD"],
          [79, "GOOD"],
          [58, "EASY"],
          [24, "GOOD"],
          [4, "EASY"],
        ],
        variants: [
          {
            format: "SHORT_ANSWER",
            question: "À partir de quel instant `max-age` est-il compté ?",
            answerKey:
              "Depuis la génération de la réponse par le serveur, pas depuis sa réception. L'en-tête `Age` dit le temps déjà consommé dans les caches intermédiaires.",
          },
          {
            format: "MCQ",
            question:
              "Une réponse porte `max-age=600` et `Age: 550`. Combien lui reste-t-il de fraîcheur ?",
            answerKey: "50 secondes",
            payload: { options: ["50 secondes", "600 secondes", "550 secondes", "1150 secondes"] },
          },
          {
            format: "TRUE_FALSE",
            question: "`max-age` se compte à partir du moment où le client reçoit la réponse.",
            answerKey: "Faux",
            payload: { statement: "à partir de la réception", expected: false },
          },
        ],
      },
      {
        concept:
          "`stale-while-revalidate` laisse le cache servir une réponse périmée sans attendre, pendant qu'il la revalide en arrière-plan. Le premier visiteur après expiration ne paie pas l'attente.",
        tags: ["http", "cache"],
        state: "REVIEWING",
        history: [
          [31, "HARD"],
          [22, "GOOD"],
          [11, "GOOD"],
        ],
        variants: [
          {
            format: "SHORT_ANSWER",
            question: "Qui profite de `stale-while-revalidate`, et comment ?",
            answerKey:
              "Le premier visiteur après expiration : il reçoit la version périmée immédiatement, la revalidation se fait derrière lui.",
          },
          {
            format: "EXPLAIN",
            question:
              "Explique pourquoi `stale-while-revalidate` change la forme du pic de charge sur l'origine.",
            answerKey:
              "Sans lui, toutes les requêtes arrivées après expiration attendent la revalidation et frappent l'origine ensemble. Avec lui, une seule revalidation part et les autres sont servies depuis le cache.",
          },
          {
            format: "TRUE_FALSE",
            question:
              "Pendant la fenêtre `stale-while-revalidate`, le client attend la réponse revalidée.",
            answerKey: "Faux",
            payload: { statement: "le client attend", expected: false },
          },
        ],
      },
      {
        concept:
          "Un `ETag` identifie une version de ressource. Le client la renvoie dans `If-None-Match` et le serveur répond `304 Not Modified`, sans corps, si la version n'a pas bougé.",
        tags: ["http", "cache"],
        state: "CONSOLIDATED",
        history: [
          [90, "GOOD"],
          [76, "GOOD"],
          [49, "GOOD"],
          [18, "EASY"],
          [3, "GOOD"],
        ],
        variants: [
          {
            format: "SHORT_ANSWER",
            question: "Quel en-tête le client envoie-t-il pour faire valider son `ETag` ?",
            answerKey:
              "`If-None-Match`. Le serveur répond `304` sans corps si l'empreinte correspond.",
          },
          {
            format: "MCQ",
            question: "Que contient le corps d'une réponse `304 Not Modified` ?",
            answerKey: "Rien : le corps est vide, le client réutilise sa copie.",
            payload: {
              options: [
                "Rien : le corps est vide, le client réutilise sa copie.",
                "La ressource complète, à jour.",
                "Un diff entre l'ancienne et la nouvelle version.",
                "Le nouvel ETag et rien d'autre.",
              ],
            },
          },
          {
            format: "EXPLAIN",
            question: "Quand un `ETag` faible (`W/`) suffit-il, et quand faut-il un fort ?",
            answerKey:
              "Un ETag faible affirme une équivalence sémantique et suffit au cache. Un ETag fort affirme une identité octet par octet : il est exigé pour les requêtes par intervalle.",
          },
        ],
      },
    ],
  },
];
