"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

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

/**
 * L'attente qu'on a cessé de surveiller.
 *
 * Au bout d'une minute, l'écran arrêtait d'interroger sans rien changer à ce
 * qu'il montrait : les emplacements continuaient de battre, pour toujours, sur
 * la seule page qui convertit. Se taire indéfiniment est pire que dire qu'on ne
 * sait pas — le visiteur finit par croire à un produit cassé.
 *
 * Le cas arrive vraiment. Un job reporté parce que le plafond journalier
 * d'appels est atteint reste en file et repartira, mais pas dans la minute :
 * côté serveur c'est un report légitime, et rien ne s'est cassé.
 *
 * Ce qu'on dit est donc vrai au mot près. Le texte est en base, le cookie de
 * visite dure sept jours, et revenir sur la page suffit à retrouver ses
 * concepts — c'est déjà comme ça que l'écran se recharge.
 */
export function AttenteInterrompue({ onVerifier }: { onVerifier: () => void }) {
  return (
    <div className="gap-pas-3 flex flex-col" role="status">
      <p className="text-corps text-stone-900">Le découpage prend plus de temps que prévu.</p>

      <p className="text-petit max-w-md text-stone-500">
        Ton texte n&apos;est pas perdu. Reviens sur cette page dans un moment : tes concepts t&apos;y
        attendront.
      </p>

      <div className="mt-pas-1">
        <Button type="button" variant="outline" onClick={onVerifier}>
          Vérifier maintenant
        </Button>
      </div>
    </div>
  );
}
