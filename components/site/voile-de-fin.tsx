"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * L'encre qui s'efface au bas d'une zone dont le texte continue.
 *
 * C'est ce qui remplace l'ascenseur du champ de dépôt, et l'utilitaire
 * `sans-ascenseur` pose la condition : on ne retire pas la barre sans mettre
 * autre chose à sa place, sinon plus rien ne dit qu'il reste du contenu. Ici
 * c'est un fondu, et il ne ment pas — il ne paraît que lorsqu'il y a vraiment
 * quelque chose sous le pli, et il s'en va dès qu'on est descendu au bout.
 *
 * **Il lui fallait donc un état, et un fondu permanent n'aurait pas suffi.** Posé
 * sans condition, il délave la dernière ligne d'un texte court qui tombe pile au
 * bas de la zone : on lit un texte coupé là où il est entier, ce qui est
 * exactement le mensonge inverse de celui qu'on corrige.
 *
 * Le fondu part de la couleur du creux, donc il se confond avec lui et ne se
 * voit que sur ce qu'il recouvre. Il est haut de deux lignes : au-dessous, il ne
 * mord que sur le rembourrage et ne se voit pas du tout.
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
      // et l'égalité stricte laisserait un voile allumé au bas d'une zone dont on
      // a atteint la fin.
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
