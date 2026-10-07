import type { SujetDeRetour } from "@/lib/db/types";
import { LIBELLE_DE_SUJET } from "@/lib/retours/libelle-du-sujet";

/**
 * De quoi le retour parle : quatre choix, en un coup d'œil.
 *
 * Ils servent à trier une pile, pas à qualifier finement — au-delà de quatre, on
 * hésite au moment d'écrire, et hésiter c'est renoncer. Les libellés disent la
 * chose du point de vue de qui la rencontre, jamais celui de qui la corrigera :
 * personne ne se dit « je vais signaler un défaut de comportement ».
 *
 * Des boutons radio natifs, dessinés, comme dans la fenêtre de signalement : la
 * sélection se voit, les flèches du clavier circulent, et le focus reste
 * visible. Un arrondi de champ et non de pilule — dans l'échelle des formes, la
 * pilule est un geste, et ceci est une saisie.
 */

/** L'ordre de lecture, du plus concret au plus vague. La table dit les mots. */
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
  return (
    <fieldset className="border-0 p-0">
      <legend className="text-petit mb-pas-2 text-stone-500">De quoi s&apos;agit-il</legend>

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
            {LIBELLE_DE_SUJET[sujet]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
