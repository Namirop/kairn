import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import prettier from "eslint-config-prettier";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

/**
 * Les frontières d'architecture du CLAUDE.md, rendues mécaniques.
 * `app/` → `lib/db/` → `lib/domain/`, jamais l'inverse, et un seul point
 * d'entrée par service externe.
 */
const anthropic = {
  group: ["@anthropic-ai/sdk", "@anthropic-ai/sdk/**"],
  message: "Le SDK Anthropic ne s'importe que dans lib/ai/client.ts.",
};

const prismaClient = {
  group: [
    "@prisma/client",
    "@prisma/adapter-*",
    "pg",
    "@/lib/db/generated",
    "@/lib/db/generated/**",
  ],
  message: "Le client Prisma ne s'importe que dans lib/db/.",
};

const resend = {
  group: ["resend"],
  message: "Resend ne s'importe que dans lib/email/.",
};

const nextRuntime = {
  group: ["next", "next/**", "server-only", "react", "react-dom"],
  message: "lib/domain/ est du TypeScript pur : ni Next, ni React, ni accès données.",
};

const restrict = (...patterns) => ({
  "no-restricted-imports": ["error", { patterns }],
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      ...restrict(anthropic, prismaClient, resend),
      "@typescript-eslint/no-explicit-any": "error",
      // Écarter une clé par déstructuration est une façon lisible de la retirer.
      "@typescript-eslint/no-unused-vars": ["error", { ignoreRestSiblings: true }],
      "@typescript-eslint/consistent-type-assertions": ["error", { assertionStyle: "never" }],
      "no-console": ["error", { allow: ["warn", "error", "info"] }],
    },
  },
  {
    // Le pont Anthropic est le détail d'implémentation qui parle au SDK.
    // `client.ts` reste le point d'entrée métier (celui qui expose `callAI`),
    // les autres appelants ne changent pas.
    files: ["lib/ai/client.ts", "lib/ai/fournisseurs/anthropic.ts"],
    rules: restrict(prismaClient, resend),
  },
  {
    files: ["lib/db/**"],
    rules: restrict(anthropic, resend),
  },
  {
    files: ["lib/email/**"],
    rules: restrict(anthropic, prismaClient),
  },
  {
    files: ["lib/domain/**"],
    rules: restrict(anthropic, prismaClient, resend, nextRuntime),
  },
  {
    files: ["prisma/seed.ts", "scripts/**"],
    rules: { "no-console": "off" },
  },
  prettier,
  {
    // Ancrés sur `**/` et non sur la racine : un artefact de build qui atterrit
    // ailleurs qu'à la racine — dossier dupliqué, build lancé depuis un parent —
    // noyait le rapport sous des milliers d'erreurs venues de code généré.
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/out/**",
      "**/build/**",
      "**/next-env.d.ts",
      "**/lib/db/generated/**",
      // L'outillage des skills installés. Ce n'est pas le code de ce projet, il
      // ne suit pas ses règles et n'a pas à les suivre : cent quatre-vingt-dix
      // erreurs venues de là rendaient le rapport inutilisable, et donc le lint
      // inutile comme garde-fou.
      "**/.claude/**",
    ],
  },
];

export default eslintConfig;
