"use client";

import { X } from "lucide-react";
import { SymboleDeMarque } from "@/components/coquille/symbole-de-marque";
import { Button } from "@/components/ui/button";
import { GesteManuel } from "./gestes-manuels";
import { useInstallation } from "./use-installation";

/**
 * L'invite à poser Kairn sur l'écran d'accueil.
 *
 * **Elle est dans la page et non au-dessus.** C'était une barre flottante, en bas
 * de tous les écrans de l'application : sur un téléphone elle se posait sur la
 * barre de navigation, elle suivait pendant une session de révision, et une chose
 * qui suit sans qu'on l'ait demandée se ferme sans qu'on l'ait lue. Elle vit
 * maintenant à un seul endroit — le tableau de bord, l'écran par lequel on entre
 * — où elle occupe une place au lieu d'en voler une.
 *
 * **Elle montre ce qu'elle propose.** Une pastille avec le symbole, à la taille
 * et à l'arrondi d'une icône d'écran d'accueil : c'est littéralement ce qui se
 * posera. Une flèche de téléchargement aurait décrit un mécanisme ; celle-ci
 * montre le résultat, et elle est le seul objet de ce bloc qui ne soit pas du
 * texte.
 *
 * Aucun accent. Le lichen de cet écran appartient au compteur du jour — c'est lui
 * qui doit attirer l'œil en premier, et une seconde tache de couleur en ferait
 * deux qui se disputent.
 */
export function InviteInstallation() {
  const { mode, installer, ecarter } = useInstallation();

  if (mode === "aucune") return null;

  return (
    // L'écart au-dessus est porté ici et non par la page. Le bloc disparaît
    // pour qui a déjà installé, pour qui a refusé et pour tout navigateur qui ne
    // sait pas installer — c'est-à-dire la plupart du temps — et une marge posée
    // sur un conteneur parent laisserait ces jours-là un trou de deux pas sous le
    // compteur, sans rien dedans et sans rien pour l'expliquer.
    <aside className="mt-pas-8 rounded-carte bg-surface-ombre p-pas-6 relative text-left">
      <button
        type="button"
        onClick={ecarter}
        aria-label="Écarter cette proposition"
        className="top-pas-3 right-pas-3 p-pas-1 rounded-galet hover:bg-surface-papier absolute text-stone-500 transition-colors hover:text-stone-900"
      >
        <X className="size-4" />
      </button>

      <div className="gap-pas-4 flex items-start">
        <span
          aria-hidden
          className="bg-surface-papier rounded-champ flex size-12 shrink-0 items-center justify-center"
        >
          <SymboleDeMarque pierres={3} taille={26} />
        </span>

        <div className="pr-pas-6 min-w-0 flex-1">
          <p className="font-medium">Garde Kairn à portée</p>
          <p className="mt-pas-1 text-petit text-stone-500">
            Posée sur ton écran d&apos;accueil, elle s&apos;ouvre d&apos;un geste, sans la barre du
            navigateur.
          </p>
        </div>
      </div>

      {mode === "automatique" ? (
        <Button className="mt-pas-4" onClick={installer}>
          Installer
        </Button>
      ) : (
        <GesteManuel geste={mode} />
      )}
    </aside>
  );
}
