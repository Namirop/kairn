import { LARGEUR_VUE } from "@/lib/domain/cairn-stack";

/**
 * Le sol : un trait, pas une ombre portée.
 *
 * Il traverse tout le sentier, et pas chaque cairn : un chemin est continu, et
 * deux traits séparés diraient deux endroits. Les marges qu'il garde de part et
 * d'autre restent celles d'un cairn seul.
 */
export function SolDuCairn({
  clair = false,
  largeur = LARGEUR_VUE,
}: {
  clair?: boolean;
  /** Largeur de la vue, en unités de vue. Plus d'un cairn, et elle grandit. */
  largeur?: number;
}) {
  return (
    <line
      x1={LARGEUR_VUE * 0.12}
      y1={0}
      x2={largeur - LARGEUR_VUE * 0.12}
      y2={0}
      stroke={
        clair
          ? "var(--sol-du-cairn-clair, var(--stone-700))"
          : "var(--sol-du-cairn, var(--stone-300))"
      }
      strokeWidth={1}
    />
  );
}
