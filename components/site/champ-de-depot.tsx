"use client";

import { useState, type RefObject } from "react";
import { Maximize2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { ChampEnGrand } from "@/components/site/champ-en-grand";
import { VoileDeFin } from "@/components/site/voile-de-fin";

/**
 * Le champ de dépôt : un creux dans le papier, sans contour ni ombre.
 *
 * Le focus passe par le trait du bas, pas par un anneau qui redessinerait une
 * boîte ; ce trait impose des angles du bas vifs, sinon il s'interromprait à la
 * courbe. L'invite reste en `stone-500` : `stone-400` tombe sous AA sur ce creux.
 *
 * Hauteur fixe, le champ défile : un article collé repousserait sinon le bouton
 * hors de l'écran. Le rembourrage est sur le creux pour que la ligne coupée ait
 * de l'air. L'ascenseur masqué, `VoileDeFin` dit la suite.
 */
export function ChampDeDepot({
  champ,
  invite,
  texte,
  surTexte,
  enErreur,
}: {
  champ: RefObject<HTMLTextAreaElement | null>;
  invite: string;
  texte: string;
  surTexte: (valeur: string) => void;
  enErreur: boolean;
}) {
  const t = useTranslations("site.essai.champ");
  const [enGrand, setEnGrand] = useState(false);

  return (
    <div>
      {/* Sur la ligne de l'intitulé : sur le creux, la loupe demanderait sa
          place sur chaque ligne du texte. */}
      <div className="gap-pas-3 flex items-center justify-between">
        <label
          htmlFor="essai"
          className="text-mono font-mono tracking-[0.14em] text-stone-500 uppercase"
        >
          {t("intitule")}
        </label>

        <button
          type="button"
          onClick={() => setEnGrand(true)}
          aria-label={t("enGrand")}
          className="-my-pas-2 px-pas-2 py-pas-2 inline-flex items-center rounded-xs text-stone-500 transition-colors hover:text-stone-900"
        >
          <Maximize2 className="size-4" />
        </button>
      </div>

      <div className="mt-pas-2 rounded-t-champ bg-surface-ombre p-pas-4 md:p-pas-6 focus-within:border-accent-profond relative border-b-2 border-stone-300 transition-colors">
        <textarea
          ref={champ}
          id="essai"
          name="texte"
          rows={4}
          value={texte}
          onChange={(evenement) => surTexte(evenement.target.value)}
          placeholder={invite}
          aria-invalid={enErreur}
          className="text-enonce sans-ascenseur h-[clamp(7rem,22vh,13rem)] w-full resize-none overflow-y-auto border-0 bg-transparent leading-[1.35] text-stone-900 outline-none placeholder:text-stone-500 focus-visible:outline-none"
        />

        <VoileDeFin zone={champ} contenu={texte} />
      </div>

      <ChampEnGrand
        ouvert={enGrand}
        surFermeture={() => setEnGrand(false)}
        invite={invite}
        texte={texte}
        surTexte={surTexte}
      />
    </div>
  );
}
