import { prisma } from "@/lib/db/client";

/** Lectures sur le compte lui-même. Le modèle User appartient à better-auth. */

export async function findUserEmail(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  return user?.email ?? null;
}
