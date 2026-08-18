"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Ce que le navigateur permet de faire de l'installation, et rien d'autre.
 *
 * Deux mondes, et un seul était traité. Chrome et ses dérivés annoncent
 * `beforeinstallprompt`, qu'on retient pour le déclencher au moment choisi.
 * **Safari n'émet rien** : sur iPhone, l'installation existe mais elle est un
 * geste manuel — Partager, puis « Sur l'écran d'accueil ». Attendre un événement
 * qui ne viendra jamais revenait à ne rien proposer du tout à la moitié des
 * téléphones, en silence et sans erreur nulle part.
 *
 * D'où deux modes plutôt qu'un booléen : celui qui déclenche, et celui qui
 * explique. Ils n'appellent pas la même interface, et faire passer le second
 * pour le premier donnerait un bouton « Installer » qui ne ferait rien.
 */

type PromptInstallation = Event & { prompt: () => Promise<void> };

export type ModeDInstallation = "aucune" | "automatique" | "manuelle";

const CLE_ECARTEE = "cairn:invite-installation-ecartee";

function estPromptInstallation(evenement: Event): evenement is PromptInstallation {
  return "prompt" in evenement && typeof Reflect.get(evenement, "prompt") === "function";
}

/**
 * L'application tourne-t-elle déjà depuis l'écran d'accueil ?
 *
 * Deux façons de le savoir parce qu'il y a deux implémentations : la requête de
 * média est la norme, `navigator.standalone` est ce que Safari a fait avant
 * qu'elle existe et continue de servir. Proposer d'installer à quelqu'un qui a
 * déjà installé est le genre de détail qui fait douter du reste.
 */
function dejaInstallee(): boolean {
  if (window.matchMedia("(display-mode: standalone)").matches) return true;

  return Reflect.get(window.navigator, "standalone") === true;
}

/**
 * Un appareil d'Apple, y compris l'iPad qui se fait passer pour un Mac.
 *
 * Depuis iPadOS 13, Safari annonce « Macintosh » dans sa chaîne d'agent : sans
 * le second test, tous les iPads tombaient du côté qui attend un événement que
 * leur navigateur n'émet pas. Le nombre de points de contact est ce qui les
 * distingue d'un vrai Mac, dont l'écran ne se touche pas.
 */
function estAppareilApple(): boolean {
  const agent = window.navigator.userAgent;

  if (/iPhone|iPad|iPod/.test(agent)) return true;

  return /Macintosh/.test(agent) && window.navigator.maxTouchPoints > 1;
}

export function useInstallation(): {
  mode: ModeDInstallation;
  installer: () => void;
  ecarter: () => void;
} {
  const [mode, setMode] = useState<ModeDInstallation>("aucune");
  const invite = useRef<PromptInstallation | null>(null);

  useEffect(() => {
    if (window.localStorage.getItem(CLE_ECARTEE) === "1") return;
    if (dejaInstallee()) return;

    // L'installation vient de se faire pendant la visite : l'invite disparaît
    // sans attendre un rechargement.
    const surInstallation = () => setMode("aucune");
    window.addEventListener("appinstalled", surInstallation);

    if (estAppareilApple()) {
      setMode("manuelle");
      return () => window.removeEventListener("appinstalled", surInstallation);
    }

    const surInvite = (evenement: Event) => {
      // Le navigateur poserait sa propre barre. On garde la main pour la
      // proposer dans le registre du produit, et au moment où elle a un sens.
      evenement.preventDefault();

      if (!estPromptInstallation(evenement)) return;

      invite.current = evenement;
      setMode("automatique");
    };

    window.addEventListener("beforeinstallprompt", surInvite);

    return () => {
      window.removeEventListener("beforeinstallprompt", surInvite);
      window.removeEventListener("appinstalled", surInstallation);
    };
  }, []);

  const installer = useCallback(() => {
    void invite.current?.prompt();
    invite.current = null;
    setMode("aucune");
  }, []);

  // Écarter est définitif, sur cet appareil. Une invite qui revient à chaque
  // visite après un refus n'est plus une proposition.
  const ecarter = useCallback(() => {
    window.localStorage.setItem(CLE_ECARTEE, "1");
    setMode("aucune");
  }, []);

  return { mode, installer, ecarter };
}
