import { useTranslations } from "next-intl";
import type { SujetDeRetour } from "@/lib/db/types";

/**
 * De quoi le retour parle : quatre choix, de quoi trier sans faire hésiter.
 *
 * Des boutons radio natifs masqués et dessinés : les flèches du clavier
 * circulent, et le focus reste visible par `has-[:focus-visible]`.
 */

/** L'ordre de lecture, du plus concret au plus vague. */
const ORDRE: SujetDeRetour[] = ["BUG", "COMPORTEMENT", "TEXTE", "AUTRE"];

export function ChoixDuSujet({
  choisi,
  onChoisir,
  fige,
}: {
  choisi: SujetDeRetour;
  onChoisir: (sujet: SujetDeRetour) => void;
  fige: boolean;
}) {
  const t = useTranslations("compte.retour");

  return (
    <fieldset className="border-0 p-0">
      <legend className="text-petit mb-pas-2 text-stone-500">{t("sujet")}</legend>

      <div className="gap-pas-2 flex flex-wrap">
        {ORDRE.map((sujet) => (
          <label
            key={sujet}
            className={`rounded-champ px-pas-3 py-pas-2 text-petit has-[:focus-visible]:border-accent cursor-pointer border transition-colors ${
              choisi === sujet
                ? "border-accent bg-accent/10 text-stone-900"
                : "border-stone-300 text-stone-500 hover:border-stone-500 hover:text-stone-900"
            }`}
          >
            <input
              type="radio"
              name="sujet"
              value={sujet}
              checked={choisi === sujet}
              onChange={() => onChoisir(sujet)}
              disabled={fige}
              className="sr-only"
            />
            {t(`sujets.${sujet}`)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
