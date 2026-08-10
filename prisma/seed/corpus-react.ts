import type { SeedInput } from "./corpus-types";

/** Ce qui vient d'une capture d'écran : une diapositive sur React. */
export const CORPUS_REACT: SeedInput[] = [
  {
    sourceType: "IMAGE",
    createdDaysAgo: 47,
    imageUrl: "/seed/diapo-server-components.png",
    rawContent: "Capture d'une diapositive : « Server Components — ce qui part et ce qui reste ».",
    extractedText: `Server Components — ce qui part et ce qui reste
· Le code d'un Server Component ne quitte jamais le serveur. Le client reçoit le résultat du rendu, pas le composant.
· "use client" marque une frontière : le fichier et tout ce qu'il importe partent dans le bundle.
· Un Server Component peut rendre un Client Component. L'inverse ne marche qu'en passant par children.`,
    atoms: [
      {
        concept:
          "Le code d'un Server Component ne part jamais dans le bundle client. Le navigateur reçoit le résultat de son rendu, pas le composant ni ses dépendances.",
        tags: ["react", "rsc"],
        state: "CONSOLIDATED",
        history: [
          [45, "GOOD"],
          [38, "GOOD"],
          [21, "EASY"],
          [7, "GOOD"],
        ],
        variants: [
          {
            format: "SHORT_ANSWER",
            facet: "RECOGNITION",
            question: "Que reçoit le navigateur d'un Server Component ?",
            answerKey:
              "Le résultat de son rendu, sérialisé. Ni son code, ni les librairies qu'il importe ne rejoignent le bundle.",
          },
          {
            format: "EXPLAIN",
            facet: "APPLICATION",
            question:
              "Une dépendance lourde n'est utilisée que dans un Server Component. Quel est son coût pour le client ?",
            answerKey:
              "Aucun coût de bundle : elle reste sur le serveur. Elle pèse sur le temps de rendu serveur, pas sur le téléchargement ni sur l'hydratation.",
          },
          {
            format: "TRUE_FALSE",
            facet: "BOUNDARY",
            question: "Un Server Component peut appeler `useState`.",
            answerKey: "Faux",
            payload: { statement: "useState dans un Server Component", expected: false },
          },
        ],
      },
      {
        concept:
          '`"use client"` déclare une frontière : le fichier et tout ce qu\'il importe rejoignent le bundle client. Un Client Component ne peut recevoir un Server Component que par `children`.',
        tags: ["react", "rsc"],
        state: "REVIEWING",
        history: [
          [44, "HARD"],
          [33, "AGAIN"],
          [26, "GOOD"],
          [13, "GOOD"],
        ],
        variants: [
          {
            format: "SHORT_ANSWER",
            facet: "RECOGNITION",
            question: "Jusqu'où porte un `\"use client\"` placé en haut d'un fichier ?",
            answerKey:
              "Sur le fichier et sur tout ce qu'il importe. Ce n'est pas une marque locale au composant : c'est l'entrée d'un sous-arbre client.",
          },
          {
            format: "CODE",
            facet: "APPLICATION",
            question:
              "Un Client Component doit afficher un Server Component au milieu de sa mise en page. Écris la forme qui marche.",
            answerKey:
              'On passe le Server Component en `children` depuis un parent serveur :\n\n// page.tsx (serveur)\n<Panneau>\n  <BlocServeur />\n</Panneau>\n\n// panneau.tsx ("use client")\nexport function Panneau({ children }) { return <div>{children}</div> }',
            payload: { language: "tsx" },
          },
          {
            format: "MCQ",
            facet: "BOUNDARY",
            question: "Quelle forme ne compile pas ?",
            answerKey: 'Importer et rendre un Server Component depuis un fichier `"use client"`.',
            payload: {
              options: [
                'Importer et rendre un Server Component depuis un fichier `"use client"`.',
                "Passer un Server Component en `children` d'un Client Component.",
                "Rendre un Client Component depuis un Server Component.",
                "Passer une chaîne en prop d'un Client Component.",
              ],
            },
          },
        ],
      },
    ],
  },
];
