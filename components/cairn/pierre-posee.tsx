"use client";

import { ArêtesDePierre } from "@/components/cairn/aretes-de-pierre";
import { PoseDePierre } from "@/components/cairn/pose-de-pierre";
import type { Pierre } from "@/lib/domain/cairn-empilement";

/** La place, en unités de viewBox, sur le groupe ; la pose anime son contenu. */
export function PierrePosee({
  pierre,
  rang,
  total,
  derniere,
  anime,
  clair = false,
}: {
  pierre: Pierre;
  rang: number;
  total: number;
  derniere: boolean;
  anime: boolean;
  clair?: boolean;
}) {
  return (
    <g transform={`translate(${pierre.x} ${pierre.y}) rotate(${pierre.rotation})`}>
      <PoseDePierre rang={rang} total={total} derniere={derniere} anime={anime}>
        <ArêtesDePierre pierre={pierre} derniere={derniere} clair={clair} />
      </PoseDePierre>
    </g>
  );
}
