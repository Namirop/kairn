import { ArreterLa } from "@/components/revision/arreter-la";

/**
 * Ce qui nomme le passage en cours, et la porte pour en sortir. Ce qu'elle
 * demande et promet est écrit par l'écran qui la pose : une session déplace des
 * échéances, un tour d'entraînement ne laisse rien.
 */
export function EnTeteDeScene({
  intitule,
  precision,
  intituleEnMarge = false,
  sortie,
}: {
  intitule?: string;
  /**
   * Ce qui complète le nom du passage. Reste ici même quand l'intitulé part en
   * marge.
   */
  precision?: string;
  /**
   * L'intitulé est repris en marge dès que la colonne est large : il s'efface
   * alors ici, au même seuil, pour ne pas être dit deux fois.
   */
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
