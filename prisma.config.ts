import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Migrations et seed passent par la connexion directe : le pooler Neon
    // travaille en mode transaction et casse les verrous consultatifs de Migrate.
    url: env("DIRECT_URL"),
  },
});
