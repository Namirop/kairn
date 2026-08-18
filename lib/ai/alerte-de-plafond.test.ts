import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CleDAlerte } from "@/lib/db/alerte-quota";
import type { AlerteDePlafondPayload } from "@/lib/email/templates/alerte-de-plafond";
import { surveillerLePlafond, type EtatDuCompteur, type OutilsDAlerte } from "./alerte-de-plafond";

/**
 * Les deux comportements de cette surveillance qui peuvent mal tourner **en
 * silence** : envoyer quinze fois la même alerte, et casser un dépôt en essayant
 * de le protéger. Aucun des deux ne se voit à l'exécution — le premier arrive
 * dans une boîte mail qu'on ne regarde pas, le second ressemble à une panne
 * d'extraction. C'est pour eux que ce fichier existe.
 *
 * Ce sont les seuls tests du projet hors de `lib/domain/`, et l'écart est
 * assumé : ils ne touchent ni base ni réseau. Les collaborateurs sont reçus en
 * paramètre, et les doublures ci-dessous se comportent comme leurs originaux —
 * en particulier le verrou, qui imite ce que fait une clé primaire.
 */

const MAINTENANT = new Date("2026-08-18T09:30:00.000Z");

/**
 * Le verrou, tel que Postgres le tient : une clé s'insère une fois. Le reste du
 * fichier repose sur cette doublure, donc elle doit être fidèle et rien de plus.
 */
function verrouDeMemoire() {
  const prises = new Set<string>();

  return {
    prises,
    reserver: async (cle: CleDAlerte) => {
      const empreinte = `${cle.compteur}|${cle.cible}|${cle.seuil}`;

      if (prises.has(empreinte)) return false;

      prises.add(empreinte);
      return true;
    },
  };
}

function outils(surcharges: Partial<OutilsDAlerte> = {}) {
  const envois: AlerteDePlafondPayload[] = [];
  const verrou = verrouDeMemoire();

  const complets: OutilsDAlerte = {
    reserver: verrou.reserver,
    depenseDuJourUsd: async () => "1.23456789",
    envoyer: async (payload) => {
      envois.push(payload);
    },
    ...surcharges,
  };

  return { outils: complets, envois };
}

const COMPTEUR_GLOBAL: EtatDuCompteur = {
  compteur: "GLOBAL",
  cible: null,
  utilisees: 35,
  plafond: 50,
};

describe("surveillerLePlafond", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("ne dit rien tant qu'aucun seuil n'est atteint", async () => {
    const { outils: o, envois } = outils();

    await surveillerLePlafond({ ...COMPTEUR_GLOBAL, utilisees: 34 }, MAINTENANT, o);

    expect(envois).toHaveLength(0);
  });

  it("n'envoie qu'un email quand un même seuil est franchi plusieurs fois", async () => {
    const { outils: o, envois } = outils();

    // Trente-cinq, trente-six, trente-sept sur cinquante : les trois sont
    // au-dessus de soixante-dix pour cent. Sans le verrou, c'est trois emails —
    // et à ce rythme, quinze avant la fin de l'heure.
    await surveillerLePlafond({ ...COMPTEUR_GLOBAL, utilisees: 35 }, MAINTENANT, o);
    await surveillerLePlafond({ ...COMPTEUR_GLOBAL, utilisees: 36 }, MAINTENANT, o);
    await surveillerLePlafond({ ...COMPTEUR_GLOBAL, utilisees: 37 }, MAINTENANT, o);

    expect(envois).toHaveLength(1);
    expect(envois[0]?.seuil).toBe(70);
    expect(envois[0]?.utilisees).toBe(35);
  });

  it("laisse passer le seuil suivant, qui est une autre information", async () => {
    const { outils: o, envois } = outils();

    await surveillerLePlafond({ ...COMPTEUR_GLOBAL, utilisees: 35 }, MAINTENANT, o);
    await surveillerLePlafond({ ...COMPTEUR_GLOBAL, utilisees: 45 }, MAINTENANT, o);
    await surveillerLePlafond({ ...COMPTEUR_GLOBAL, utilisees: 50 }, MAINTENANT, o);

    expect(envois.map((envoi) => envoi.seuil)).toEqual([70, 90, 100]);
  });

  it("compte les alertes par compte, et pas seulement par compteur", async () => {
    const { outils: o, envois } = outils();
    const part = { compteur: "COMPTE", utilisees: 7, plafond: 10 } as const;

    // Sans la cible dans la clé, le premier compte à franchir son seuil
    // consommerait l'alerte de tous les autres pour la journée — et c'est
    // précisément le compteur dont l'alerte nomme quelqu'un.
    await surveillerLePlafond({ ...part, cible: "compte-a" }, MAINTENANT, o);
    await surveillerLePlafond({ ...part, cible: "compte-b" }, MAINTENANT, o);
    await surveillerLePlafond({ ...part, cible: "compte-a" }, MAINTENANT, o);

    expect(envois.map((envoi) => envoi.cible)).toEqual(["compte-a", "compte-b"]);
  });

  it("ne lève pas quand l'envoi échoue, et le journalise", async () => {
    const journal = vi.spyOn(console, "error").mockImplementation(() => {});
    const { outils: o } = outils({
      envoyer: async () => {
        throw new Error("Resend est à terre");
      },
    });

    await expect(surveillerLePlafond(COMPTEUR_GLOBAL, MAINTENANT, o)).resolves.toBeUndefined();
    expect(journal).toHaveBeenCalledTimes(1);
  });

  it("ne lève pas non plus quand la base refuse le verrou", async () => {
    const journal = vi.spyOn(console, "error").mockImplementation(() => {});
    const { outils: o, envois } = outils({
      reserver: async () => {
        throw new Error("connexion perdue");
      },
    });

    await expect(surveillerLePlafond(COMPTEUR_GLOBAL, MAINTENANT, o)).resolves.toBeUndefined();
    expect(envois).toHaveLength(0);
    expect(journal).toHaveBeenCalledTimes(1);
  });

  it("ne lève pas non plus quand la dépense du jour est illisible", async () => {
    const journal = vi.spyOn(console, "error").mockImplementation(() => {});
    const { outils: o, envois } = outils({
      depenseDuJourUsd: async () => {
        throw new Error("agrégat en échec");
      },
    });

    await expect(surveillerLePlafond(COMPTEUR_GLOBAL, MAINTENANT, o)).resolves.toBeUndefined();
    expect(envois).toHaveLength(0);
    expect(journal).toHaveBeenCalledTimes(1);
  });

  it("nomme la variable à changer, celle du compteur concerné", async () => {
    const { outils: o, envois } = outils();

    await surveillerLePlafond(COMPTEUR_GLOBAL, MAINTENANT, o);
    await surveillerLePlafond(
      { compteur: "COMPTE", cible: "compte-a", utilisees: 9, plafond: 10 },
      MAINTENANT,
      o,
    );
    await surveillerLePlafond(
      { compteur: "ANONYME", cible: null, utilisees: 20, plafond: 20 },
      MAINTENANT,
      o,
    );

    expect(envois.map((envoi) => envoi.variable)).toEqual([
      "AI_DAILY_CALL_CAP",
      "AI_DAILY_CALL_CAP_PAR_COMPTE",
      "AI_DAILY_CALL_CAP_ANONYME",
    ]);
  });

  it("porte l'instant et la dépense, pour décider sans ouvrir le tableau de bord", async () => {
    const { outils: o, envois } = outils();

    await surveillerLePlafond(COMPTEUR_GLOBAL, MAINTENANT, o);

    expect(envois[0]?.instant).toBe(MAINTENANT);
    expect(envois[0]?.depenseDuJourUsd).toBe("1.23456789");
    expect(envois[0]?.plafond).toBe(50);
  });
});
