import type { InputDuCorpus } from "./types-du-corpus";

/**
 * Un dépôt de code, écrit pour faire passer sous les yeux tout ce qui casse un
 * affichage : identifiants courts et longs, directive entre guillemets,
 * chevrons de génériques, trou dont la réponse est du code, options de QCM qui
 * en portent aussi.
 *
 * Le premier concept n'a aucun passage : il est dû tout de suite, et sert à
 * ouvrir une session quand on n'a plus rien à réviser.
 */
export const CORPUS_CODE: InputDuCorpus[] = [
  {
    sourceType: "TEXT",
    deposeIlYAJours: 16,
    rawContent: `Notes de relecture — JavaScript et TypeScript

· \`Array.prototype.at()\` accepte un index négatif : \`valeurs.at(-1)\` rend le dernier élément, là où \`valeurs[-1]\` rend \`undefined\` parce que \`-1\` est lu comme un nom de propriété.
· \`"use client"\` marque une frontière de bundle : le fichier et tout ce qu'il importe partent chez le navigateur. Le placer en haut d'un fichier qui n'en avait pas besoin embarque ses dépendances avec lui.
· \`Record<string, unknown>\` décrit un objet dont on ne connaît pas les clés. \`unknown\` force un contrôle avant usage, contrairement à \`any\` qui l'autorise sans rien vérifier.
· \`Object.freeze()\` est superficiel : il gèle les propriétés du premier niveau, pas les objets qu'elles contiennent.`,
    atoms: [
      {
        concept:
          "`Array.prototype.at()` accepte un index négatif et compte depuis la fin : `valeurs.at(-1)` rend le dernier élément. La notation en crochets, elle, lit `-1` comme un nom de propriété et rend `undefined`.",
        tags: ["javascript", "tableaux"],
        state: "LEARNING",
        historique: [],
        variants: [
          {
            format: "CLOZE",
            facet: "RECOGNITION",
            question: "Complète la phrase.",
            answerKey: "at(-1)",
            payload: {
              sentence:
                "Pour lire le dernier élément d'un tableau de longueur inconnue, on écrit `valeurs.___`.",
              accepted: ["at(-1)", "`at(-1)`", ".at(-1)"],
            },
          },
          {
            format: "MCQ",
            facet: "BOUNDARY",
            question: "Que rend `valeurs[-1]` sur un tableau non vide ?",
            answerKey: "`undefined` : `-1` est lu comme un nom de propriété, pas comme un index.",
            payload: {
              options: [
                "`undefined`, parce que `-1` est lu comme un nom de propriété",
                "Le dernier élément, comme `valeurs.at(-1)`",
                "Le premier élément, l'index étant ramené à `0`",
                "Une `RangeError`, l'index sortant des bornes",
              ],
              correctIndex: 0,
            },
          },
          {
            format: "CODE",
            facet: "APPLICATION",
            question:
              "Complète : `function dernier(valeurs) { return valeurs.___; }`, pour un tableau dont on ne connaît pas la longueur.",
            answerKey:
              "`at(-1)`. Attendu : une expression qui ne suppose pas la longueur connue. `valeurs[valeurs.length]` rend `undefined`, et `valeurs[-1]` aussi.",
          },
          {
            format: "TRUE_FALSE",
            facet: "MECHANISM",
            question: "`valeurs.at(-1)` et `valeurs[valeurs.length - 1]` rendent la même chose.",
            answerKey:
              "Vrai. Les deux lisent le dernier élément ; `at()` évite seulement de recalculer l'index.",
            payload: { expected: true },
          },
        ],
      },
      {
        concept:
          "`\"use client\"` marque une frontière de bundle : le fichier qui la porte et tout ce qu'il importe partent chez le navigateur. Ce n'est pas une annotation locale, c'est le point d'entrée d'un sous-arbre.",
        tags: ["react", "bundle"],
        state: "REVIEWING",
        historique: [
          [14, "GOOD"],
          [9, "AGAIN"],
          [6, "GOOD"],
        ],
        variants: [
          {
            format: "SHORT_ANSWER",
            facet: "MECHANISM",
            question: "Jusqu'où porte un `\"use client\"` placé en haut d'un fichier ?",
            answerKey:
              "Réponse attendue : jusqu'au bout de ce qu'il importe. Le fichier part dans le bundle, et avec lui ses dépendances — y compris celles qu'on croyait rester au serveur.",
          },
          {
            format: "MCQ",
            facet: "APPLICATION",
            question:
              'Un fichier `format-de-date.ts` importe `date-fns` et est importé par un composant marqué `"use client"`. Que se passe-t-il ?',
            answerKey:
              "`date-fns` rejoint le bundle client : la frontière remonte à travers les imports.",
            payload: {
              options: [
                "`date-fns` rejoint le bundle client, la frontière suivant les imports",
                "`date-fns` reste sur le serveur, seul le composant part",
                "Le build échoue : un module serveur ne s'importe pas depuis un client",
                "`date-fns` part deux fois, une par environnement",
              ],
              correctIndex: 0,
            },
          },
          {
            format: "TRUE_FALSE",
            facet: "BOUNDARY",
            question: 'Un composant marqué `"use client"` peut appeler `useState`.',
            answerKey: "Vrai. C'est précisément ce que la directive autorise.",
            payload: { expected: true },
          },
          {
            format: "CLOZE",
            facet: "RECOGNITION",
            question: "Complète la phrase.",
            answerKey: "frontière",
            payload: {
              sentence:
                'La directive `"use client"` ne marque pas un composant mais une ___ : tout ce que le fichier importe la franchit avec lui.',
              accepted: ["frontière", "frontiere", "limite"],
            },
          },
        ],
      },
      {
        concept:
          "`Record<string, unknown>` décrit un objet dont les clés ne sont pas connues à l'écriture. `unknown` oblige à contrôler la valeur avant de s'en servir, là où `any` laisse passer n'importe quel usage sans rien vérifier.",
        tags: ["typescript", "types"],
        state: "LEARNING",
        historique: [[3, "HARD"]],
        variants: [
          {
            format: "EXPLAIN",
            facet: "MECHANISM",
            question:
              "Pourquoi préférer `Record<string, unknown>` à `Record<string, any>` pour une charge utile qu'on vient de recevoir ?",
            answerKey:
              "Réponse attendue : `unknown` n'autorise aucun usage avant contrôle — ni appel, ni accès de propriété, ni arithmétique. `any` désactive le vérificateur et laisse écrire `charge.utilisateur.nom` sur un objet qui n'a ni l'un ni l'autre. Le premier force un `typeof`, un `in`, ou un parsing ; le second reporte l'erreur à l'exécution.",
          },
          {
            format: "CLOZE",
            facet: "BOUNDARY",
            question: "Complète la phrase.",
            answerKey: "unknown",
            payload: {
              sentence:
                "Entre `any` et `___`, seul le second refuse qu'on se serve de la valeur avant de l'avoir contrôlée.",
              accepted: ["unknown", "`unknown`"],
            },
          },
          {
            format: "MCQ",
            facet: "RECOGNITION",
            question: "Que décrit `Record<string, unknown>` ?",
            answerKey:
              "Un objet aux clés `string` et aux valeurs de type inconnu, à contrôler avant usage.",
            payload: {
              options: [
                "Un objet dont les clés sont des `string` et les valeurs de type inconnu",
                "Un objet vide, sans clé possible",
                "Un tableau de paires `[string, unknown]`",
                "Un objet dont toutes les valeurs sont `undefined`",
              ],
              correctIndex: 0,
            },
          },
          {
            format: "TRUE_FALSE",
            facet: "APPLICATION",
            question: "`Object.freeze(reglages)` empêche aussi de modifier `reglages.limites.max`.",
            answerKey:
              "Faux. Le gel est superficiel : il porte sur les propriétés du premier niveau, pas sur les objets qu'elles contiennent.",
            payload: { expected: false },
          },
        ],
      },
    ],
  },
];
