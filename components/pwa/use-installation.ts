"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { applicationDejaPosee, gesteManuel, type GesteManuel } from "./environnement-dinstallation";

/**
 * Ce que l'appareil permet de faire de l'installation, et rien d'autre.
 *
 * Trois mondes, et un seul était traité. Chrome et ses dérivés annoncent
 * `beforeinstallprompt`, qu'on retient pour le déclencher au moment choisi.
 * **Safari n'émet rien** : sur iPhone comme sur Mac, l'installation existe mais
 * elle est un geste manuel, et les deux gestes ne sont pas le même. Attendre un
 * événement qui ne viendra jamais revenait à ne rien proposer du tout à la
 * moitié des téléphones, en silence et sans erreur nulle part.
 *
 * D'où des modes plutôt qu'un booléen : celui qui déclenche, et ceux qui
 * expliquent. Ils n'appellent pas la même interface, et faire passer les seconds
 * pour le premier donnerait un bouton « Installer » qui ne ferait rien.
 */

type PromptInstallation = Event & { prompt: () => Promise<void> };

export type ModeDInstallation = "aucune" | "automatique" | GesteManuel;

const CLE_ECARTEE = "cairn:invite-installation-ecartee";

function estPromptInstallation(evenement: Event): evenement is PromptInstallation {
  return "prompt" in evenement && typeof Reflect.get(evenement, "prompt") === "function";
}

/**
 * Le refus est définitif sur cet appareil, et il survit à un navigateur en
 * navigation privée qui refuse d'écrire. Une invite qui revient à chaque visite
 * après un refus n'est plus une proposition.
 */
function estEcartee(): boolean {
  try {
    return window.localStorage.getItem(CLE_ECARTEE) === "1";
  } catch {
    return false;
  }
}

function ecarterPourDeBon(): void {
  try {
    window.localStorage.setItem(CLE_ECARTEE, "1");
  } catch {
    // Stockage refusé : l'invite repartira à la prochaine visite. C'est le
    // moindre mal, et la seule alternative serait un aller-retour serveur pour
    // un réglage qui ne concerne que cet appareil.
  }
}

export function useInstallation(): {
  mode: ModeDInstallation;
  installer: () => void;
  ecarter: () => void;
} {
  const [mode, setMode] = useState<ModeDInstallation>("aucune");
  const invite = useRef<PromptInstallation | null>(null);

  useEffect(() => {
    if (estEcartee()) return;

    let vivant = true;

    // L'installation vient de se faire pendant la visite : l'invite disparaît
    // sans attendre un rechargement.
    const surInstallation = () => setMode("aucune");
    window.addEventListener("appinstalled", surInstallation);

    const surInvite = (evenement: Event) => {
      // Le navigateur poserait sa propre barre. On garde la main pour la
      // proposer dans le registre du produit, et au moment où elle a un sens.
      evenement.preventDefault();

      if (!estPromptInstallation(evenement)) return;

      invite.current = evenement;
      setMode("automatique");
    };

    // L'écoute démarre avant la vérification, et pas après : l'événement part
    // tôt dans le chargement de la page, et un `await` posé devant l'écouteur le
    // laisserait passer. Ce qui suit ne fait que décider s'il y a lieu d'en
    // tenir compte.
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

      // Un appareil qui a un geste manuel n'émettra jamais l'événement. Les
      // autres, on les laisse parler : tant qu'ils n'ont rien dit, il n'y a rien
      // à proposer, et une consigne inventée pour un navigateur qu'on ne
      // reconnaît pas serait un chemin qui ne mène nulle part.
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
    ecarterPourDeBon();
    setMode("aucune");
  }, []);

  return { mode, installer, ecarter };
}
