"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * Le fondu au bas d'une zone dont le texte continue : il remplace l'ascenseur
 * masqué. Seulement s'il reste du contenu, sans quoi il délaverait la dernière
 * ligne d'un texte entier.
 */
export function VoileDeFin({
  zone,
  /** Ce qui, en changeant, peut faire naître ou disparaître le débordement. */
  contenu,
}: {
  zone: RefObject<HTMLTextAreaElement | null>;
  contenu: string;
}) {
  const [reste, setReste] = useState(false);

  useEffect(() => {
    const champ = zone.current;
    if (!champ) return;

    const mesurer = () => {
      // Un pixel de tolérance : les hauteurs de défilement sont fractionnaires.
      setReste(champ.scrollTop + champ.clientHeight < champ.scrollHeight - 1);
    };

    mesurer();
    champ.addEventListener("scroll", mesurer);
    window.addEventListener("resize", mesurer);

    return () => {
      champ.removeEventListener("scroll", mesurer);
      window.removeEventListener("resize", mesurer);
    };
  }, [zone, contenu]);

  if (!reste) return null;

  return (
    <div
      aria-hidden
      className="h-pas-16 from-surface-ombre pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t to-transparent"
    />
  );
}
