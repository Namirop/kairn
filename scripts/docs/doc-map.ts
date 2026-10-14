/**
 * Which document describes which part of the code.
 *
 * A path ending in `/` covers everything below it; any other path covers that
 * file alone. When a change touches a covered path and leaves the document
 * untouched, `docs:check` names the document so someone rereads it.
 *
 * The map says "this document might be stale", never "it is": a fix inside a
 * function rarely changes what a document says. It costs a reread, not a rewrite.
 */
export type DocMap = Readonly<Record<string, readonly string[]>>;

export const DOC_MAP: DocMap = {
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
    "app/shadcn-tokens.css",
    "app/fonts.ts",
    "components/ui/",
    "components/cairn/",
    "components/typographie/",
    "lib/design/",
  ],
  "PRODUCT.md": ["app/(marketing)/", "lib/paiement/catalogue.ts"],
  "docs/DEPLOIEMENT.md": [
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
