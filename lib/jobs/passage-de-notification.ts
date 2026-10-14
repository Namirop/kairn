import { trouverLesDejaNotifies } from "@/lib/db/destinataires-des-rappels";
import type { TypeDeNotification } from "@/lib/email/notifications";

/**
 * Ce que tout passage d'envoi partage : son compte rendu, et l'écart de ceux
 * qu'on a déjà notifiés dans leur journée à eux.
 */

export type Passage = {
  candidats: number;
  retenus: number;
  dejaEnvoyes: number;
  envoyes: number;
  ignores: number;
};

/** Ce qui n'a rien à envoyer se compte quand même : un zéro est une information. */
export function passage(candidats: number, retenus: number, dejaEnvoyes: number): Passage {
  return { candidats, retenus, dejaEnvoyes, envoyes: 0, ignores: 0 };
}

/**
 * Le jour se lit chez la personne, pas sur le serveur : deux comptes notifiés à
 * la même seconde peuvent ne pas être le même jour.
 */
export async function aNotifier<T extends { userId: string }>(
  type: TypeDeNotification,
  retenus: { cible: T; jour: string }[],
): Promise<{ restants: { cible: T; jour: string }[]; deja: number }> {
  const deja = await trouverLesDejaNotifies(
    type,
    retenus.map((entree) => ({ userId: entree.cible.userId, jour: entree.jour })),
  );

  return { restants: retenus.filter((entree) => !deja.has(entree.cible.userId)), deja: deja.size };
}

/** Une ligne de journal par passage. Des identifiants et des comptes, jamais une adresse. */
export function journaliser(nom: string, resultat: Passage): void {
  console.info(
    `${nom} — ${resultat.candidats} candidats, ${resultat.retenus} à l'heure, ` +
      `${resultat.dejaEnvoyes} déjà notifiés, ${resultat.envoyes} envoyés, ${resultat.ignores} sans envoi.`,
  );
}
