import { createHash } from "node:crypto";
import { prisma } from "@/lib/db/client";
import { prefixeDeLAdresse } from "@/lib/domain/prefixe-de-l-adresse";

/**
 * L'ouverture d'une visite : qui a le droit de déposer sans compte. Ce qu'il
 * reste à une visite ouverte se compte dans `essais-de-la-visite.ts`.
 *
 * Aucune adresse IP n'est conservée, seulement une empreinte salée par le
 * secret d'application : une base volée ne se retourne pas en liste d'adresses.
 */

/**
 * **Visites** tolérées par empreinte d'adresse sur la fenêtre, pas dépôts.
 * Pire cas par empreinte et par 24 h :
 *
 *     2 visites × (2 essais dus + 2 pannes tolérées) = 8 extractions
 *
 * Un navigateur qui garde son cookie ne repasse pas par ici et puise dans les
 * essais de sa visite, renouvelés chaque jour. Assumé : ce verrou freine le
 * passant qui recommence, c'est le plafond journalier d'appels qui borne la
 * dépense.
 *
 * Deux et pas une : un bureau, une école ou un opérateur mobile derrière son
 * CGNAT sortent par une seule IPv4, et le premier arrivé grillerait l'essai des
 * autres. Serrer ne protégerait de personne, un VPN change d'adresse.
 */
export const VISITES_PAR_ADRESSE = 2;

/** La fenêtre de la limite par adresse. Un jour : on n'est pas à la minute. */
export const FENETRE_ADRESSE_HEURES = 24;

/** L'empreinte de l'abonné : l'IPv4 entière, le /64 d'une IPv6 (voir `prefixeDeLAdresse`). */
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
 * Ouvre une session de visite, ou la refuse.
 *
 * Lire puis écrire est une course : deux visiteurs simultanés depuis la même
 * adresse peuvent passer à trois. Assumé, le coût est une visite de plus ; la
 * fermer demanderait une table de compteurs pour des lignes éphémères.
 *
 * `sansCompte` (l'échappement de vérification en ligne) est décidé par
 * `lib/depots/essai-sans-limite.ts` et passé en paramètre : l'accès aux données
 * ne lit pas d'interrupteur, pour que les scripts de vérification gardent prise.
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
