import { createHash } from "node:crypto";
import { prisma } from "@/lib/db/client";
import { prefixeDeLAdresse } from "@/lib/domain/prefixe-de-l-adresse";

/**
 * Qui peut déposer sans compte ; le reste d'une visite se compte dans
 * `essais-de-la-visite.ts`. Aucune IP conservée, seulement une empreinte salée :
 * une base volée ne se retourne pas en liste d'adresses.
 */

/**
 * **Visites** par empreinte, pas dépôts : au pire 2 × (2 essais + 2 pannes) =
 * 8 extractions par 24 h. Un cookie gardé ne repasse pas ici : ce verrou freine
 * le passant qui recommence, le plafond journalier d'appels borne la dépense.
 * Deux : un bureau ou un CGNAT sort par une seule IPv4, et un VPN contourne tout.
 */
export const VISITES_PAR_ADRESSE = 2;

export const FENETRE_ADRESSE_HEURES = 24;

/** L'IPv4 entière, le /64 d'une IPv6 : l'abonné, pas la machine. */
export function empreinteDeLAdresse(adresse: string): string {
  const sel = process.env.BETTER_AUTH_SECRET ?? "";

  return createHash("sha256")
    .update(`${sel}:${prefixeDeLAdresse(adresse)}`)
    .digest("hex")
    .slice(0, 32);
}

export type OuvertureDeSession =
  { ouverte: true; sessionId: string } | { ouverte: false; motif: "adresse" };

/**
 * Lire puis écrire est une course (deux visiteurs simultanés passent à trois).
 * Assumé : la fermer demanderait une table de compteurs pour des lignes
 * éphémères. `sansCompte` est décidé par `lib/depots/essai-sans-limite.ts` :
 * l'accès aux données ne lit pas d'interrupteur.
 */
export async function ouvrirUneSession(
  adresse: string,
  sansCompte = false,
): Promise<OuvertureDeSession> {
  const ipHash = empreinteDeLAdresse(adresse);

  if (!sansCompte) {
    const depuis = new Date(Date.now() - FENETRE_ADRESSE_HEURES * 60 * 60 * 1000);
    const recentes = await prisma.anonymousSession.count({
      where: { ipHash, createdAt: { gte: depuis } },
    });

    if (recentes >= VISITES_PAR_ADRESSE) return { ouverte: false, motif: "adresse" };
  }

  const session = await prisma.anonymousSession.create({
    data: { ipHash },
    select: { id: true },
  });

  return { ouverte: true, sessionId: session.id };
}
