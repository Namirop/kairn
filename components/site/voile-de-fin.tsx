"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * L'encre qui s'efface au bas d'une zone dont le texte continue : ce qui
 * remplace l'ascenseur masqué par `sans-ascenseur`, sans quoi plus rien ne dit
 * qu'il reste du contenu.
 *
 * Il ne paraît que s'il y a vraiment quelque chose sous le pli : posé sans
 * condition, il délaverait la dernière ligne d'un texte entier.
 *
 * Le fondu part de la couleur du creux (`surface-ombre`) : il ne se voit que
 * sur ce qu'il recouvre.
 */
export function VoileDeFin({
  zone,
  /** Ce qui, en changeant, peut faire apparaître ou disparaître le débordement. */
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
      // Un pixel de tolérance : les hauteurs de défilement sont fractionnaires,
      // et l'égalité stricte laisserait le voile allumé en fin de zone.
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
