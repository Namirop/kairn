"use client";

import { PhraseQuiTourne, usePhraseQuiTourne } from "@/components/site/phrase-qui-tourne";
import { Button } from "@/components/ui/button";

/**
 * L'échantillon de questions tant qu'il n'existe pas encore.
 *
 * **C'était le second système de squelettes de l'écran, et il a disparu.** Quatre
 * emplacements de format qui battaient, plus deux barres grises dans une carte,
 * sous une liste de concepts qui venait d'apparaître : on livrait le résultat et
 * on montrait en même temps une page en train de charger. Deux jeux de barres
 * grises sur un même écran, c'est ce qui faisait le désordre — pas la quantité
 * d'information.
 *
 * À leur place, **la carte est déjà là, et elle parle**. C'est la forme finale de
 * l'objet, à sa taille finale, avec dedans la voix de l'attente plutôt qu'une
 * question. Rien ne clignote, rien ne saute au remplacement, et l'écran dit ce
 * qu'il fait au lieu de mimer un chargement.
 *
 * Les phrases sont **celles de l'écriture, pas celles du découpage**. À cette
 * étape les concepts sont à l'écran : « on lit ce que tu as déposé » serait faux
 * au mot près, et le mot est tout ce qu'on a ici. Voir `phrases-dattente.ts`.
 *
 * Quand l'interrogation s'arrête, à quatre-vingt-dix secondes, la carte doit
 * s'arrêter avec elle. Elle battait pour toujours sous des concepts déjà
 * affichés, sans que rien n'indique qu'il fallait un geste pour aller voir la
 * suite : c'est le mensonge qu'on venait de corriger à l'autre bout de la
 * chaîne, et il vivait encore ici.
 *
 * Séparé de l'échantillon lui-même parce que ce sont deux sujets — celui-ci
 * n'affiche aucune question, il occupe leur place.
 */
export function EnEcriture({
  abandonnee,
  onVerifier,
}: {
  abandonnee: boolean;
  onVerifier: () => void;
}) {
  const phrase = usePhraseQuiTourne("ECRITURE");

  if (abandonnee) return <EcritureAbandonnee onVerifier={onVerifier} />;

  return (
    <section className="gap-pas-3 flex flex-col" role="status" aria-live="polite">
      <header className="gap-pas-2 flex flex-col">
        <h3 className="font-display text-h1-app leading-tight font-bold tracking-[-0.02em] text-stone-50">
          On écrit les questions.
        </h3>

        {/* La seule ligne stable du bloc, et donc la seule que les lecteurs
            d'écran entendent : la phrase qui tourne leur est masquée. */}
        <p className="text-petit max-w-xl text-stone-300">
          Quatre formulations sur le même concept, de formats différents. Une vingtaine de secondes.
        </p>
      </header>

      {/* La carte que la question viendra remplir, à sa place et à sa taille.
          C'est la même surface et le même arrondi que `CarteDeLEchantillon` :
          ce qui change à l'arrivée, c'est ce qu'il y a dedans, pas l'objet. */}
      <div className="rounded-carte p-pas-dedans bg-stone-700">
        <PhraseQuiTourne phrase={phrase} className="text-stone-300" />
      </div>
    </section>
  );
}

/**
 * L'écriture dont on a cessé de suivre l'avancement.
 *
 * Les concepts sont là, à l'écran, et c'est bien pour ça qu'il ne faut rien
 * dramatiser : il ne manque qu'un échantillon. Le lot part quand même, et
 * revenir sur la page le montrera — le bouton ne fait qu'aller voir tout de
 * suite.
 */
function EcritureAbandonnee({ onVerifier }: { onVerifier: () => void }) {
  return (
    <section className="gap-pas-3 flex flex-col">
      <h3 className="font-display text-h1-app leading-tight font-bold tracking-[-0.02em] text-stone-50">
        Les questions prennent leur temps.
      </h3>

      <p className="text-petit max-w-xl text-stone-300">
        Tes concepts sont déjà là, c’est l’échantillon qui manque. Il s’écrit toujours, et il
        s’affichera ici la prochaine fois que tu passes.
      </p>

      <div className="mt-pas-1">
        <Button type="button" variant="outlineClair" size="sm" onClick={onVerifier}>
          Vérifier maintenant
        </Button>
      </div>
    </section>
  );
}
