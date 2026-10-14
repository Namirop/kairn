"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { inviteEnSommeil } from "@/lib/domain/report-de-linvite";
import { applicationDejaPosee, gesteManuel, type GesteManuel } from "./environnement-dinstallation";
import { confirmerInstallation, enregistrerRefus, lireRefus } from "./memoire-dinstallation";

/**
 * Ce que l'appareil permet de faire de l'installation.
 *
 * Chrome et ses dérivés annoncent `beforeinstallprompt`, qu'on retient pour le
 * déclencher au moment choisi. Safari n'émet rien : sur iPhone comme sur Mac,
 * l'installation est un geste manuel, différent sur chacun. D'où des modes
 * plutôt qu'un booléen : celui qui déclenche, et ceux qui expliquent.
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
      // Retient la barre du navigateur, pour proposer l'installation au
      // moment choisi.
      evenement.preventDefault();

      if (!estPromptInstallation(evenement)) return;

      invite.current = evenement;
      setMode("automatique");
    };

    // L'écoute démarre avant la vérification : l'événement part tôt dans le
    // chargement, et un `await` posé devant l'écouteur le laisserait passer.
    window.addEventListener("beforeinstallprompt", surInvite);

    void applicationDejaPosee().then((posee) => {
      if (!vivant) return;

      // Déjà installée : on retire l'écoute plutôt que d'ignorer l'événement,
      // faute de quoi un `beforeinstallprompt` tardif rallumerait l'invite.
      if (posee) {
        invite.current = null;
        window.removeEventListener("beforeinstallprompt", surInvite);
        setMode("aucune");
        return;
      }

      const geste = gesteManuel();

      // Un appareil à geste manuel n'émettra jamais l'événement. Pour les
      // autres, on attend l'événement plutôt que d'inventer une consigne pour
      // un navigateur qu'on ne reconnaît pas.
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

  /**
   * L'utilisateur déclare avoir installé, là où l'appareil ne sait pas le dire
   * — voir `confirmerInstallation`.
   */
  const confirmer = useCallback(() => {
    confirmerInstallation(new Date());
    setMode("aucune");
  }, []);

  return { mode, installer, ecarter, confirmer };
}
