import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/db/generated/client";

/**
 * Seule instanciation de Prisma. Prisma 7 exige un driver adapter : `pg` tient
 * la connexion, pas un moteur natif.
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
  // Le rechargement à chaud recrée les modules : sans cette référence globale,
  // chaque édition ouvrirait un pool de plus.
  var cairnPrisma: PrismaClient | undefined;
}

export const prisma: PrismaClient = globalThis.cairnPrisma ?? creerLeClientPrisma();

if (process.env.NODE_ENV !== "production") {
  globalThis.cairnPrisma = prisma;
}
