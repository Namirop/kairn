import { LARGEUR_VUE } from "@/lib/domain/cairn-stack";

/** Le sol : un trait, pas une ombre portée. */
export function SolDuCairn() {
  return (
    <line
      x1={LARGEUR_VUE * 0.12}
      y1={0}
      x2={LARGEUR_VUE * 0.88}
      y2={0}
      className="stroke-stone-300"
      strokeWidth={1}
    />
  );
}
