"use client";

import { useEffect } from "react";
import { espacementVuAction } from "@/app/(app)/reviser/actions";

/**
 * Pourquoi c'est déjà fini.
 *
 * L'explication arrive ici et nulle part ailleurs : c'est à la fin de la
 * première session qu'on se pose la question, et une explication donnée avant
 * répond à une question que personne ne se pose encore. Un paragraphe, dans le
 * flux, jamais revu ensuite.
 *
 * Il en faisait deux, dont un qui commençait par se défendre — « le reste n'est
 * pas caché ». On ne se défend pas d'un reproche que personne n'a formulé : on
 * dit ce qui se passe, et l'écart qui s'allonge le dit mieux que la promesse
 * qu'on ne cache rien.
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
    // Du papier posé, et non un filet : ce paragraphe n'a pas de libellé pour
    // l'annoncer, et c'est le seul cas où le blanc ne suffit pas à le détacher
    // du palier qui l'entoure.
    <div className="p-pas-4 md:p-pas-6 rounded-carte bg-surface-ombre">
      <p className="text-corps leading-relaxed text-stone-900">
        Une session s&apos;arrête quand elle a servi ce qui était dû. Chaque concept retrouvé
        revient de plus loin — deux jours, puis une semaine, puis un mois. C&apos;est l&apos;écart
        qui fait tenir, pas la répétition.
      </p>
    </div>
  );
}
