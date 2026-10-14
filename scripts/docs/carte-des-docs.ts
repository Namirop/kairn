/**
 * Quelle doc décrit quelle partie du code.
 *
 * Un chemin qui finit par `/` couvre tout ce qui est dessous ; tout autre chemin
 * ne couvre que ce fichier. Quand un changement touche un chemin couvert sans
 * toucher la doc, `docs:check` la nomme pour que quelqu'un la relise.
 *
 * La carte dit « cette doc est peut-être périmée », jamais « elle l'est » : un
 * correctif dans une fonction change rarement ce que dit une doc. Cela coûte
 * une relecture, pas une réécriture.
 */
export type CarteDesDocs = Readonly<Record<string, readonly string[]>>;

export const CARTE_DES_DOCS: CarteDesDocs = {
  "README.md": [
    "package.json",
    ".env.example",
    ".github/",
    "prisma/schema/",
    "lib/ai/client.ts",
    "lib/ai/config.ts",
    "lib/jobs/",
    "lib/cron/",
    "lib/depots/",
    "app/api/",
  ],
  "DESIGN.md": [
    "app/globals.css",
    "app/styles/",
    "app/shadcn-tokens.css",
    "app/polices.ts",
    "components/ui/",
    "components/cairn/",
    "components/typographie/",
    "lib/design/",
  ],
  "PRODUCT.md": ["app/(marketing)/", "lib/paiement/catalogue.ts"],
  "docs/deploiement.md": [
    ".env.example",
    "vercel.json",
    "next.config.ts",
    "app/api/cron/",
    "lib/cron/",
    "lib/email/",
  ],
  "docs/environnements.md": [".env.example", "lib/ai/config.ts"],
  "docs/outillage.md": [
    "package.json",
    "scripts/",
    ".husky/",
    ".github/",
    "eslint.config.mjs",
    "vitest.config.mts",
    "commitlint.config.mjs",
    "lint-staged.config.mjs",
  ],
  "docs/paiement.md": ["lib/paiement/", "app/api/paiement/"],
  "docs/glossaire-anglais.md": ["lib/i18n/messages/en/"],
  "docs/campagne-modeles.md": ["scripts/evaluation/"],
  "scripts/assets/README.md": ["scripts/assets/", "app/(apercu)/"],
  "app/fonts/README.md": ["app/fonts/"],
};
