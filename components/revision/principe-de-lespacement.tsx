"use client";

import { useEffect } from "react";
import { espacementVuAction } from "@/app/(app)/reviser/actions";

/**
 * Pourquoi c'est déjà fini.
 *
 * L'explication arrive ici et nulle part ailleurs : c'est à la fin de la
 * première session qu'on se pose la question, et une explication donnée avant
 * répond à une question que personne ne se pose encore. Deux phrases, dans le
 * flux, jamais revues ensuite.
 *
 * Elle se marque comme vue à l'affichage, pas sur un clic d'accusé de réception.
 * Rien ne prouve qu'un bouton « j'ai compris » ait été lu, et une explication
 * qui revient tant qu'on ne l'accuse pas est une fenêtre modale déguisée.
 */
export function PrincipeDeLEspacement() {
  useEffect(() => {
    void espacementVuAction();
  }, []);

  return (
    <div className="border-lichen pl-pas-4 border-l-2">
      <p className="text-corps leading-relaxed text-stone-900">
        Une session s&apos;arrête quand elle a servi ce qui était dû. Le reste n&apos;est pas caché
        : il revient plus tard, à l&apos;instant où tu es sur le point de l&apos;oublier.
      </p>
      <p className="mt-pas-2 text-petit text-stone-500">
        Chaque concept retrouvé s&apos;éloigne un peu : deux jours, puis une semaine, puis un mois.
        C&apos;est l&apos;écart qui fait tenir, pas la répétition.
      </p>
    </div>
  );
}
