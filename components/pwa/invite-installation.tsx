"use client";

import { Share, SquarePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInstallation } from "./use-installation";

/**
 * Invite d'installation. Elle n'apparaît que si l'appareil sait installer, et
 * elle ne revient pas une fois écartée.
 *
 * Elle dit ce que l'installation donne, et rien de plus : une icône, une
 * ouverture en plein écran. Elle promettait aussi la lecture hors ligne — le
 * produit n'a pas de service worker, donc c'était faux, et c'est le genre de
 * phrase qu'on ne vérifie jamais parce qu'elle a l'air d'aller de soi.
 */

/**
 * Le geste d'iOS, en toutes lettres.
 *
 * Safari n'a pas de bouton d'installation à déclencher : il faut ouvrir le menu
 * de partage et y trouver une entrée qui ne s'appelle pas « installer ». C'est
 * précisément le genre de chemin que personne ne trouve seul, et c'est pour ça
 * que cet écran-là mérite deux lignes de plus que l'autre — les nommer avec
 * leurs icônes vaut mieux que les décrire, parce que c'est ce qu'on cherche des
 * yeux dans la barre du navigateur.
 */
function GesteManuel() {
  return (
    <ol className="mt-pas-3 gap-pas-2 text-petit flex flex-col text-stone-500">
      <li className="gap-pas-2 flex items-center">
        <Share className="size-4 shrink-0 text-stone-900" aria-hidden />
        Ouvre le menu de partage, en bas de Safari.
      </li>
      <li className="gap-pas-2 flex items-center">
        <SquarePlus className="size-4 shrink-0 text-stone-900" aria-hidden />
        Choisis « Sur l&apos;écran d&apos;accueil ».
      </li>
    </ol>
  );
}

export function InviteInstallation() {
  const { mode, installer, ecarter } = useInstallation();

  if (mode === "aucune") return null;

  return (
    <div className="inset-x-pas-4 gap-pas-3 p-pas-6 md:right-pas-8 md:bottom-pas-8 rounded-carte bg-surface-ombre fixed bottom-24 z-40 flex items-start md:left-auto md:w-80">
      <div className="flex-1">
        <p className="font-medium">Installer Kairn</p>
        <p className="mt-pas-1 text-petit text-stone-500">
          L&apos;application prend sa place sur ton écran d&apos;accueil et s&apos;ouvre sans la
          barre du navigateur. Une application mobile native suivra.
        </p>

        {mode === "manuelle" ? (
          <GesteManuel />
        ) : (
          <Button size="sm" className="mt-pas-3" onClick={installer}>
            Installer
          </Button>
        )}
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
