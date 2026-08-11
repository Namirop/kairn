import { cn } from "@/lib/utils";

/**
 * La marque : trois pierres posées, puis le mot.
 *
 * **Tout ce qui affiche la marque passe par ici.** Le symbole est en cours de
 * refonte — quand il arrivera, c'est ce fichier qu'on remplacera, et lui seul.
 * Aucun écran ne redessine les pierres ni ne réécrit le mot à côté.
 *
 * « Kairn » se compose en nom propre : une capitale, le reste en bas de casse.
 * Les capitales espacées d'avant en faisaient une étiquette de section, du même
 * registre que « AUJOURD'HUI » ou « SESSION » — un nom de produit ne se range
 * pas parmi ses propres intertitres.
 */
export function Marque({ ton = "encre" }: { ton?: "encre" | "papier" }) {
  const clair = ton === "papier";

  return (
    <span className="gap-pas-2 inline-flex items-baseline">
      <svg viewBox="0 0 16 20" className="h-5 w-4 self-center" aria-hidden>
        <path
          d="M2.4 17.6 h11.2 a1 1 0 0 1 0 2 H2.4 a1 1 0 0 1 0-2 Z"
          className={clair ? "fill-stone-50" : "fill-stone-900"}
        />
        <path
          d="M3.6 11.2 h8.6 a1 1 0 0 1 .2 2 l-8.6.4 a1 1 0 0 1-.2-2.4 Z"
          className={clair ? "fill-stone-50" : "fill-stone-900"}
        />
        <path
          d="M5.4 5.4 h5.4 a1 1 0 0 1 .1 2 l-5.4.3 a1 1 0 0 1-.1-2.3 Z"
          className={clair ? "fill-stone-50" : "fill-stone-900"}
        />
      </svg>
      <span
        className={cn(
          "font-display text-h2-app leading-none font-semibold tracking-[-0.02em]",
          clair ? "text-stone-50" : "text-stone-900",
        )}
      >
        Kairn
      </span>
    </span>
  );
}
