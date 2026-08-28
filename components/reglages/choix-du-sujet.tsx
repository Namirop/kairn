import type { SujetDeRetour } from "@/lib/db/types";

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

const SUJETS: { valeur: SujetDeRetour; libelle: string }[] = [
  { valeur: "BUG", libelle: "Ça ne marche pas" },
  { valeur: "COMPORTEMENT", libelle: "Ça me surprend" },
  { valeur: "TEXTE", libelle: "Un mot de travers" },
  { valeur: "AUTRE", libelle: "Autre chose" },
];

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
        {SUJETS.map((sujet) => (
          <label
            key={sujet.valeur}
            className={`rounded-champ px-pas-3 py-pas-2 text-petit has-[:focus-visible]:border-lichen cursor-pointer border transition-colors ${
              choisi === sujet.valeur
                ? "border-lichen bg-lichen/10 text-stone-900"
                : "border-stone-300 text-stone-500 hover:border-stone-500 hover:text-stone-900"
            }`}
          >
            <input
              type="radio"
              name="sujet"
              value={sujet.valeur}
              checked={choisi === sujet.valeur}
              onChange={() => onChoisir(sujet.valeur)}
              disabled={fige}
              className="sr-only"
            />
            {sujet.libelle}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
