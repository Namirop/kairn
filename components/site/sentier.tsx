const ETAPES = [
  {
    titre: "Tu déposes",
    texte:
      "Une phrase notée à la volée pendant un cours, un article collé en entier, la photo d'une page de livre. Rien à formater, rien à découper toi-même.",
  },
  {
    titre: "Kairn découpe",
    texte:
      "Le dépôt devient des concepts unitaires, chacun avec trois ou quatre façons d'être questionné : un terme à retrouver dans une phrase, un choix à faire, une explication à donner. La formulation tourne pour que tu retiennes l'idée, pas la phrase.",
  },
  {
    titre: "Ça revient",
    texte:
      "Chaque concept revient à l'instant où tu es sur le point de l'oublier. Plus tu le sais, plus il s'espace. Une pierre de plus au cairn quand il est acquis.",
  },
];

/**
 * Le sentier : une séquence réelle, donc une liste verticale reliée par un
 * trait, pas trois cartes côte à côte. Les marqueurs sont des pierres.
 */
export function Sentier() {
  return (
    <section className="py-pas-16 md:py-pas-24 border-t border-stone-100">
      <h2 className="font-display text-h2-site leading-[1] font-bold tracking-[-0.02em]">
        Trois gestes,
        <br />
        et c&apos;est tout.
      </h2>

      <ol className="mt-pas-12 max-w-2xl">
        {ETAPES.map((etape) => (
          <li
            key={etape.titre}
            className="gap-pas-6 pb-pas-8 not-last:before:top-pas-6 relative flex not-last:before:absolute not-last:before:bottom-0 not-last:before:left-2 not-last:before:w-px not-last:before:bg-stone-300"
          >
            <span
              aria-hidden
              className="mt-pas-2 relative z-10 h-2 w-4 shrink-0 rounded-xs bg-stone-900"
            />
            <div>
              <h3 className="text-h2-app leading-tight font-bold">{etape.titre}</h3>
              <p className="mt-pas-2 text-stone-500">{etape.texte}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
