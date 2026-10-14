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
  "README.md": [".nvmrc", "package.json", ".github/", ".husky/", "knip.json"],
  "CONTRIBUTING.md": [
    ".husky/",
    ".github/",
    "commitlint.config.mjs",
    "lint-staged.config.mjs",
    "eslint.config.mjs",
    "knip.json",
    "vitest.config.mts",
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
  "docs/architecture.md": [
    "lib/ai/client.ts",
    "lib/ai/config.ts",
    "lib/ai/reservation.ts",
    "lib/ai/schema-de-sortie.ts",
    "lib/ai/fournisseurs/",
    "lib/ai/schemas/",
    "lib/db/ai-quota.ts",
    "lib/db/quota-depots.ts",
    "lib/db/fin-de-depot.ts",
    "lib/db/session-anonyme.ts",
    "lib/db/essais-de-la-visite.ts",
    "lib/domain/plafond-du-plan.ts",
    "lib/domain/nature-du-depot.ts",
    "lib/jobs/",
    "lib/depots/",
    "lib/cron/",
    "app/api/cron/",
    "eslint.config.mjs",
  ],
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
