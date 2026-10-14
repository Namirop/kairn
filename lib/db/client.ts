import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/db/generated/client";

/**
 * Le seul endroit du projet qui instancie Prisma. Tout le reste passe par les
 * fonctions d'accès de `lib/db/`.
 *
 * Prisma 7 compile les requêtes côté client et exige un driver adapter : c'est
 * `pg` qui tient la connexion, pas un moteur natif.
 */
function creerLeClientPrisma(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL est absent de l'environnement.");
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

declare global {
  // Le rechargement à chaud recrée les modules à chaque édition. Sans cette
  // référence globale, chaque rechargement ouvrirait un pool de plus.
  var cairnPrisma: PrismaClient | undefined;
}

export const prisma: PrismaClient = globalThis.cairnPrisma ?? creerLeClientPrisma();

if (process.env.NODE_ENV !== "production") {
  globalThis.cairnPrisma = prisma;
}
