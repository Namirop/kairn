import type { CSSProperties } from "react";
import { ArêtesDePierre } from "@/components/cairn/aretes-de-pierre";
import type { Pierre } from "@/lib/domain/cairn-stack";
import type { PierrePosee } from "@/lib/domain/jeu-du-cairn";

/**
 * Un style qui porte des variables CSS.
 *
 * `CSSProperties` ne connaît que les propriétés nommées : sans cette
 * intersection, poser `--degringolade` demanderait une assertion de type, et le
 * projet n'en veut pas — ici c'est la déclaration qui doit être juste, pas le
 * compilateur qu'il faut faire taire.
 */
type StyleAvecVariables = CSSProperties & Record<`--${string}`, string>;

/**
 * Une pierre du jeu d'attente : son emplacement en pointillé tant qu'elle n'est
 * pas posée, son tracé plein ensuite, à l'abscisse où elle a vraiment atterri.
 *
 * Une pierre posée de travers garde son inclinaison d'origine augmentée de son
 * écart ; celle qui est tombée dans la tolérance se cale sur le pointillé,
 * rotation comprise. C'est le seul retour du jeu tant que la pile tient, et il
 * suffit — elle penche ou elle ne penche pas.
 *
 * Séparée du jeu parce que le jeu la dessine dans trois états et qu'il porte
 * déjà sa boucle d'animation, son état et son clavier.
 */
export function PierreDuJeu({
  pierre,
  posee,
  rang,
  total,
  effondre,
}: {
  pierre: Pierre;
  posee: PierrePosee | undefined;
  rang: number;
  total: number;
  /** La pile s'écroule : cette pierre part avec, dans sa direction à elle. */
  effondre: boolean;
}) {
  if (!posee) return <Marque pierre={pierre} />;

  const ecart = posee.x - pierre.x;
  const penchee = posee.pose === "DAPLOMB" ? pierre.rotation : pierre.rotation + ecart * 0.35;

  return (
    <>
      {/* Pendant l'écroulement, la marque réapparaît sous la pierre qui s'en
          va : c'est ce qui fait lire la chute comme des pierres qui quittent
          leurs places, et non comme un cairn qu'on efface. Sans elle, les
          rangs déjà montés laissaient un trou au bas du dessin. */}
      {effondre ? <Marque pierre={pierre} /> : null}

      <g transform={`translate(${posee.x.toFixed(2)} ${pierre.y}) rotate(${penchee.toFixed(2)})`}>
        {/* La chute vit sur un groupe intérieur : posée sur celui qui porte la
          position, l'animation en écraserait le `transform` et la pierre
          repartirait au coin du dessin. */}
        <g
          className={
            effondre ? "motion-safe:pierre-qui-degringole" : "motion-safe:pierre-qui-tombe"
          }
          style={effondre ? degringolade(ecart, rang, total) : undefined}
        >
          <ArêtesDePierre pierre={pierre} derniere={false} />
        </g>
      </g>
    </>
  );
}

/** L'emplacement en pointillé : la place que la pierre attend, ou retrouve. */
function Marque({ pierre }: { pierre: Pierre }) {
  return (
    <g transform={`translate(${pierre.x} ${pierre.y}) rotate(${pierre.rotation})`}>
      <ArêtesDePierre pierre={pierre} derniere={false} aVenir />
    </g>
  );
}

/**
 * La course d'une pierre pendant l'écroulement, et son retard.
 *
 * Elle part **du côté où elle penchait déjà**, d'où l'écart en facteur : une
 * pile qui verse à gauche s'écroule à gauche. Le signe seul ne suffirait pas —
 * une pierre d'aplomb au milieu d'une pile qui tombe doit partir quelque part,
 * et son rang décide alors pour elle, en alternance, pour que rien ne descende
 * en bloc.
 *
 * Les valeurs sont en unités de la vue, comme tout le reste du dessin.
 */
function degringolade(ecart: number, rang: number, total: number): StyleAvecVariables {
  const sens = ecart === 0 ? (rang % 2 === 0 ? -1 : 1) : Math.sign(ecart);
  const derive = sens * (8 + Math.abs(ecart) * 1.4);
  const tour = derive * 2.2;

  return {
    "--degringolade": `translate(${derive.toFixed(1)}px, 34px) rotate(${tour.toFixed(1)}deg)`,
    "--retard-de-chute": `${Math.max(0, total - 1 - rang) * 45}ms`,
  };
}
