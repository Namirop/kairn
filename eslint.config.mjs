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
    files: ["lib/ai/client.ts"],
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
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "lib/db/generated/**",
    ],
  },
];

export default eslintConfig;
