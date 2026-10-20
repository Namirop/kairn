import { trouverLesDejaNotifies } from "@/lib/db/destinataires-des-rappels";
import type { TypeDeNotification } from "@/lib/email/notifications";

export type Passage = {
  candidats: number;
  retenus: number;
  dejaEnvoyes: number;
  envoyes: number;
  ignores: number;
};

/** Un zéro est une information : il se compte aussi. */
export function passage(candidats: number, retenus: number, dejaEnvoyes: number): Passage {
  return { candidats, retenus, dejaEnvoyes, envoyes: 0, ignores: 0 };
}

/** Le jour local : deux comptes notifiés à la même seconde peuvent changer de jour. */
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

/** Des comptes, jamais une adresse. */
export function journaliser(nom: string, resultat: Passage): void {
  console.info(
    `${nom} — ${resultat.candidats} candidats, ${resultat.retenus} à l'heure, ` +
      `${resultat.dejaEnvoyes} déjà notifiés, ${resultat.envoyes} envoyés, ${resultat.ignores} sans envoi.`,
  );
}
