/**
 * La marque : trois pierres posées, puis le mot. Le même geste que l'élément
 * signature, réduit à sa plus petite expression pour tenir dans un en-tête.
 */
export function Marque({ ton = "encre" }: { ton?: "encre" | "papier" }) {
  const couleur = ton === "papier" ? "fill-stone-50" : "fill-stone-900";

  return (
    <span className="gap-pas-2 inline-flex items-center">
      <svg viewBox="0 0 16 20" className="h-5 w-4" aria-hidden>
        <path d="M2.4 17.6 h11.2 a1 1 0 0 1 0 2 H2.4 a1 1 0 0 1 0-2 Z" className={couleur} />
        <path d="M3.6 11.2 h8.6 a1 1 0 0 1 .2 2 l-8.6.4 a1 1 0 0 1-.2-2.4 Z" className={couleur} />
        <path d="M5.4 5.4 h5.4 a1 1 0 0 1 .1 2 l-5.4.3 a1 1 0 0 1-.1-2.3 Z" className={couleur} />
      </svg>
      <span
        className={`text-mono font-mono tracking-[0.18em] uppercase ${
          ton === "papier" ? "text-stone-50" : "text-stone-900"
        }`}
      >
        Cairn
      </span>
    </span>
  );
}
