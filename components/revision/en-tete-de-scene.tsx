import { ArreterLa } from "@/components/revision/arreter-la";

/**
 * Le nom du passage et la porte de sortie. L'écran qui la pose écrit ce qu'elle
 * promet : une session déplace des échéances, un entraînement ne laisse rien.
 */
export function EnTeteDeScene({
  intitule,
  precision,
  intituleEnMarge = false,
  sortie,
}: {
  intitule?: string;
  /** Reste ici même quand l'intitulé part en marge. */
  precision?: string;
  /** Repris par la marge sur colonne large : il s'efface ici au même seuil. */
  intituleEnMarge?: boolean;
  /** Ce que la sortie demande avant de s'ouvrir, et ce qu'elle écrit en partant. */
  sortie: {
    titre: string;
    consequence: string;
    avantDeSortir?: () => Promise<void>;
    rafraichirLeTableau?: boolean;
  };
}) {
  return (
    <div className="gap-pas-4 flex items-baseline justify-between">
      <p className="gap-pas-3 flex flex-wrap items-baseline">
        <span
          className={`text-mono font-mono tracking-[0.14em] text-stone-500 uppercase ${
            intituleEnMarge ? "@min-[92rem]:hidden" : ""
          }`}
        >
          {intitule}
        </span>

        {precision ? <span className="text-petit text-stone-500">{precision}</span> : null}
      </p>

      <ArreterLa {...sortie} />
    </div>
  );
}
