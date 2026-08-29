import { Button } from "@/components/ui/button";

/**
 * L'échantillon de questions tant qu'il n'existe pas encore.
 *
 * Deux états, et ils ne disent pas la même chose. Tant qu'on interroge, on
 * montre la forme de ce qui arrive — les emplacements des quatre formats et
 * celui de la carte, aux mesures de ce qui va les remplacer. Une phrase
 * immobile sous une liste de concepts qui vient d'apparaître se lit comme une
 * fin, pas comme une suite.
 *
 * Quand l'interrogation s'arrête, à quatre-vingt-dix secondes, les emplacements
 * doivent s'arrêter avec elle. Ils battaient pour toujours sous des concepts
 * déjà affichés, sans que rien n'indique qu'il fallait un geste pour aller voir
 * la suite : c'est le mensonge qu'on venait de corriger à l'autre bout de la
 * chaîne, et il vivait encore ici.
 *
 * Séparé de l'échantillon lui-même parce que ce sont deux sujets — celui-ci
 * n'affiche aucune question, il occupe leur place.
 */

/**
 * Les largeurs des quatre emplacements de format.
 *
 * Celles des libellés qui viendront — « QCM » est court, « Texte à trou » ne
 * l'est pas — pour que la rangée ne change pas de dessin en se remplissant.
 */
const EMPLACEMENTS = ["w-16", "w-28", "w-32", "w-24"] as const;

export function EnEcriture({
  abandonnee,
  onVerifier,
}: {
  abandonnee: boolean;
  onVerifier: () => void;
}) {
  if (abandonnee) return <EcritureAbandonnee onVerifier={onVerifier} />;

  return (
    <section className="gap-pas-3 flex flex-col" role="status" aria-live="polite">
      <h3 className="text-mono font-mono tracking-[0.14em] text-stone-500 uppercase">
        On écrit les questions
      </h3>

      <div className="gap-pas-1 flex flex-wrap" aria-hidden>
        {EMPLACEMENTS.map((largeur, rang) => (
          <span
            key={largeur}
            className={`rounded-galet block h-8 bg-stone-300/60 motion-safe:animate-pulse ${largeur}`}
            style={{ animationDelay: `${rang * 160}ms` }}
          />
        ))}
      </div>

      {/* Les deux barres ont la hauteur d'une ligne d'énoncé : la carte ne
          changera pas de taille en recevant sa question. */}
      <div className="rounded-carte bg-surface-ombre p-pas-dedans" aria-hidden>
        <span className="block h-6 w-full rounded-xs bg-stone-300/70 motion-safe:animate-pulse" />
        <span
          className="mt-pas-3 block h-6 w-3/5 rounded-xs bg-stone-300/50 motion-safe:animate-pulse"
          style={{ animationDelay: "200ms" }}
        />
      </div>

      {/* La mesure est celle d'une légende et non d'un paragraphe : serrée à
          `xl`, cette phrase-là tombait sur deux lignes pour trois mots. */}
      <p className="text-petit max-w-2xl text-stone-500">
        Quatre formulations sur le même concept, de formats différents. Une vingtaine de secondes.
      </p>
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
      <h3 className="text-mono font-mono tracking-[0.14em] text-stone-500 uppercase">
        Les questions prennent leur temps
      </h3>

      <p className="text-petit max-w-2xl text-stone-500">
        Tes concepts sont déjà là, c’est l’échantillon qui manque. Il s’écrit toujours, et il
        s’affichera ici la prochaine fois que tu passes.
      </p>

      <div className="mt-pas-1">
        <Button type="button" variant="outline" size="sm" onClick={onVerifier}>
          Vérifier maintenant
        </Button>
      </div>
    </section>
  );
}
