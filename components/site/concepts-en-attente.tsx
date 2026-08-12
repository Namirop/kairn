"use client";

import { useEffect, useState } from "react";

/**
 * Les quelques secondes où le découpage tourne.
 *
 * C'est le moment le plus fragile du produit : la seule page qui convertit, et
 * un écran figé pendant cinq secondes. Un texte immobile fait croire que rien ne
 * se passe, et on ferme l'onglet juste avant le résultat.
 *
 * On montre donc la **forme de ce qui arrive** plutôt qu'un tourniquet : des
 * emplacements de concepts, au filet de lichen, aux mesures exactes de ceux qui
 * vont les remplacer. Rien ne saute quand le vrai contenu arrive, et l'attente
 * dit déjà ce qu'elle prépare.
 *
 * La progression n'est pas racontée par étapes. On ne connaît pas l'avancement
 * réel d'une extraction — il n'y a qu'un appel, et il rend ou il ne rend pas —,
 * donc annoncer « lecture… découpage… » serait inventer une barre de progression
 * qui ne mesure rien. Ce qui est honnête, c'est de dire que ça travaille, et de
 * le reconnaître quand c'est long.
 */

/** Trois emplacements : le découpage moyen en rend trois à cinq. */
const EMPLACEMENTS = [
  ["w-full", "w-4/5"],
  ["w-11/12", "w-2/3"],
  ["w-full", "w-1/2"],
] as const;

/** Au-delà, on le reconnaît. Se taire plus longtemps ferait douter. */
const SECONDES_AVANT_EXCUSE = 9;

export function ConceptsEnAttente() {
  const [long, setLong] = useState(false);

  useEffect(() => {
    const minuteur = setTimeout(() => setLong(true), SECONDES_AVANT_EXCUSE * 1000);

    return () => clearTimeout(minuteur);
  }, []);

  return (
    <div className="gap-pas-4 flex flex-col" role="status" aria-live="polite">
      <p className="text-mono font-mono tracking-[0.14em] text-stone-500 uppercase">
        Découpage en cours
      </p>

      <ul className="gap-pas-3 flex flex-col" aria-hidden>
        {EMPLACEMENTS.map(([longue, courte], rang) => (
          <li key={longue} className="border-lichen/40 pl-pas-4 border-l-2">
            {/* Deux barres aux hauteurs d'une ligne de corps : ce qui arrive
                prend exactement cette place, donc rien ne saute. Le décalage
                d'animation évite le clignotement à l'unisson, qui se lit comme
                un défaut d'affichage plutôt que comme une attente. */}
            <span
              className={`mb-pas-2 block h-4 rounded-xs bg-stone-300/70 motion-safe:animate-pulse ${longue}`}
              style={{ animationDelay: `${rang * 180}ms` }}
            />
            <span
              className={`block h-4 rounded-xs bg-stone-300/50 motion-safe:animate-pulse ${courte}`}
              style={{ animationDelay: `${rang * 180 + 90}ms` }}
            />
          </li>
        ))}
      </ul>

      {/* La place est réservée : la phrase apparaît sans pousser ce qui suit. */}
      <p className="text-petit min-h-5 text-stone-500">
        {long
          ? "C'est plus long que d'habitude. Ça arrive, laisse-lui encore un instant."
          : "Quelques secondes. Tes concepts s'affichent ici même, pas dans un écran d'inscription."}
      </p>
    </div>
  );
}
