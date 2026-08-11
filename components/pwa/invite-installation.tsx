"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Invite d'installation. Elle n'apparaît que si le navigateur propose vraiment
 * l'installation, et elle ne revient pas une fois écartée.
 *
 * `beforeinstallprompt` n'est pas typé par la plateforme : on ne garde du
 * gestionnaire que ce dont on se sert, sans forcer de type.
 */
type PromptInstallation = Event & { prompt: () => Promise<void> };

const CLE_ECARTEE = "cairn:invite-installation-ecartee";

function estPromptInstallation(evenement: Event): evenement is PromptInstallation {
  return "prompt" in evenement && typeof Reflect.get(evenement, "prompt") === "function";
}

export function InviteInstallation() {
  const [invite, setInvite] = useState<PromptInstallation | null>(null);

  useEffect(() => {
    if (window.localStorage.getItem(CLE_ECARTEE) === "1") return;

    const surInvite = (evenement: Event) => {
      evenement.preventDefault();
      if (estPromptInstallation(evenement)) setInvite(evenement);
    };

    window.addEventListener("beforeinstallprompt", surInvite);
    return () => window.removeEventListener("beforeinstallprompt", surInvite);
  }, []);

  if (!invite) return null;

  const ecarter = () => {
    window.localStorage.setItem(CLE_ECARTEE, "1");
    setInvite(null);
  };

  return (
    <div className="inset-x-pas-4 gap-pas-3 p-pas-6 md:right-pas-8 md:bottom-pas-8 rounded-carte bg-surface-ombre fixed bottom-24 z-40 flex items-start md:left-auto md:w-80">
      <div className="flex-1">
        <p className="font-medium">Installer Kairn</p>
        <p className="mt-pas-1 text-petit text-stone-500">
          L&apos;application s&apos;ouvre depuis ton écran d&apos;accueil et fonctionne hors ligne
          pour la lecture. Une application mobile native suivra.
        </p>
        <Button
          size="sm"
          className="mt-pas-3"
          onClick={() => {
            void invite.prompt();
            setInvite(null);
          }}
        >
          Installer
        </Button>
      </div>
      <button
        type="button"
        onClick={ecarter}
        aria-label="Ne plus proposer"
        className="p-pas-1 rounded-galet hover:bg-surface-papier text-stone-500 transition-colors hover:text-stone-900"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
