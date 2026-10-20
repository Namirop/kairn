"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { inviteEnSommeil } from "@/lib/domain/report-de-linvite";
import { applicationDejaPosee, gesteManuel, type GesteManuel } from "./environnement-dinstallation";
import { confirmerInstallation, enregistrerRefus, lireRefus } from "./memoire-dinstallation";

/**
 * Chrome annonce `beforeinstallprompt`, retenu pour plus tard ; Safari n'émet
 * rien, l'installation y est un geste manuel différent sur iPhone et sur Mac.
 * D'où des modes : celui qui déclenche, ceux qui expliquent.
 */

type PromptInstallation = Event & { prompt: () => Promise<void> };

export type ModeDInstallation = "aucune" | "automatique" | GesteManuel;

function estPromptInstallation(evenement: Event): evenement is PromptInstallation {
  return "prompt" in evenement && typeof Reflect.get(evenement, "prompt") === "function";
}

export function useInstallation(): {
  mode: ModeDInstallation;
  installer: () => void;
  ecarter: () => void;
  confirmer: () => void;
} {
  const [mode, setMode] = useState<ModeDInstallation>("aucune");
  const invite = useRef<PromptInstallation | null>(null);

  useEffect(() => {
    if (inviteEnSommeil(lireRefus(), new Date())) return;

    let vivant = true;

    const surInstallation = () => setMode("aucune");
    window.addEventListener("appinstalled", surInstallation);

    const surInvite = (evenement: Event) => {
      // Retient la barre du navigateur jusqu'au moment choisi.
      evenement.preventDefault();

      if (!estPromptInstallation(evenement)) return;

      invite.current = evenement;
      setMode("automatique");
    };

    // Avant la vérification : l'événement part tôt, un `await` devant le raterait.
    window.addEventListener("beforeinstallprompt", surInvite);

    void applicationDejaPosee().then((posee) => {
      if (!vivant) return;

      // Retirer l'écoute : un `beforeinstallprompt` tardif rallumerait l'invite.
      if (posee) {
        invite.current = null;
        window.removeEventListener("beforeinstallprompt", surInvite);
        setMode("aucune");
        return;
      }

      const geste = gesteManuel();

      // Un geste manuel n'aura jamais l'événement ; les autres l'attendent, sans
      // consigne inventée pour un navigateur inconnu.
      if (geste) setMode(geste);
    });

    return () => {
      vivant = false;
      window.removeEventListener("beforeinstallprompt", surInvite);
      window.removeEventListener("appinstalled", surInstallation);
    };
  }, []);

  const installer = useCallback(() => {
    void invite.current?.prompt();
    invite.current = null;
    setMode("aucune");
  }, []);

  const ecarter = useCallback(() => {
    enregistrerRefus(new Date());
    setMode("aucune");
  }, []);

  /** Là où l'appareil ne sait pas le dire — voir `confirmerInstallation`. */
  const confirmer = useCallback(() => {
    confirmerInstallation(new Date());
    setMode("aucune");
  }, []);

  return { mode, installer, ecarter, confirmer };
}
