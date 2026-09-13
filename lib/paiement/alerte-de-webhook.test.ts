import { describe, expect, it, vi } from "vitest";
import type { CleDAlerte } from "@/lib/db/alerte-quota";
import type { AlerteDePaiementPayload } from "@/lib/email/templates/alerte-de-paiement";
import { RapportIllisibleError } from "./erreurs";
import {
  signalerLEchecDuWebhook,
  type EchecDeWebhook,
  type OutilsDAlerteDePaiement,
} from "./alerte-de-webhook";

/**
 * Les deux comportements de cette alerte qui peuvent mal tourner **en
 * silence** : envoyer soixante-douze emails pour une seule panne — Stripe
 * relance pendant trois jours —, et casser le webhook en essayant de le
 * surveiller, ce qui transformerait une panne rattrapable en panne définitive.
 *
 * Ils se testent sans base ni réseau : les collaborateurs sont reçus en
 * paramètre, comme dans `lib/ai/alerte-de-plafond.test.ts`, et le verrou
 * ci-dessous imite ce que fait une clé primaire.
 */

const MAINTENANT = new Date("2026-09-13T18:30:00.000Z");

const ECHEC: EchecDeWebhook = {
  type: "customer.subscription.updated",
  erreur: new RapportIllisibleError("statut « chose » inconnu."),
};

function verrouDeMemoire() {
  const prises = new Set<string>();

  return async (cle: CleDAlerte) => {
    const empreinte = `${cle.compteur}|${cle.cible}|${cle.seuil}`;

    if (prises.has(empreinte)) return false;

    prises.add(empreinte);
    return true;
  };
}

function outils(surcharges: Partial<OutilsDAlerteDePaiement> = {}) {
  const envois: AlerteDePaiementPayload[] = [];

  const complets: OutilsDAlerteDePaiement = {
    reserver: verrouDeMemoire(),
    envoyer: async (payload) => {
      envois.push(payload);
    },
    ...surcharges,
  };

  return { outils: complets, envois };
}

describe("signalerLEchecDuWebhook", () => {
  it("envoie une alerte qui nomme l'événement et le code de l'échec", async () => {
    const { outils: o, envois } = outils();

    await signalerLEchecDuWebhook(ECHEC, MAINTENANT, o);

    expect(envois).toHaveLength(1);
    expect(envois[0]).toMatchObject({
      type: "customer.subscription.updated",
      code: "PAIEMENT_RAPPORT_ILLISIBLE",
      instant: MAINTENANT,
    });
    expect(envois[0]?.motif).toContain("statut");
  });

  it("ne parle qu'une fois, quelle que soit la relance de Stripe", async () => {
    const { outils: o, envois } = outils();

    for (let tour = 0; tour < 20; tour += 1) {
      await signalerLEchecDuWebhook(ECHEC, MAINTENANT, o);
    }

    expect(envois).toHaveLength(1);
  });

  it("dit « inconnu » quand le corps n'annonçait aucun type", async () => {
    const { outils: o, envois } = outils();

    await signalerLEchecDuWebhook({ type: null, erreur: new Error("boum") }, MAINTENANT, o);

    expect(envois[0]?.type).toBe("inconnu");
    expect(envois[0]?.code).toBe("INCONNU");
  });

  it("lit un motif même sur ce qui n'est pas une erreur", async () => {
    const { outils: o, envois } = outils();

    await signalerLEchecDuWebhook({ type: null, erreur: "une chaîne nue" }, MAINTENANT, o);

    expect(envois[0]?.motif).toBe("une chaîne nue");
  });

  it("ne casse rien quand le verrou tombe", async () => {
    const journal = vi.spyOn(console, "error").mockImplementation(() => {});
    const { outils: o } = outils({
      reserver: async () => {
        throw new Error("base injoignable");
      },
    });

    await expect(signalerLEchecDuWebhook(ECHEC, MAINTENANT, o)).resolves.toBeUndefined();
    expect(journal).toHaveBeenCalled();

    journal.mockRestore();
  });

  it("ne casse rien quand l'envoi tombe", async () => {
    const journal = vi.spyOn(console, "error").mockImplementation(() => {});
    const { outils: o } = outils({
      envoyer: async () => {
        throw new Error("Resend a hoqueté");
      },
    });

    await expect(signalerLEchecDuWebhook(ECHEC, MAINTENANT, o)).resolves.toBeUndefined();
    expect(journal).toHaveBeenCalled();

    journal.mockRestore();
  });
});
