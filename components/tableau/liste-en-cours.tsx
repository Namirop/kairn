import { EtatVide } from "@/components/etats/etat-vide";
import type { AtomEnCours } from "@/lib/db/tableau-de-bord";
import { echeanceCourte, joursAvant } from "@/lib/domain/echeance";
import { cn } from "@/lib/utils";

/**
 * Les concepts en cours. Liste éditoriale : un filet à gauche, l'échéance à
 * droite en mono. Pas de cartes — une ligne de texte n'a pas besoin d'un
 * container pour exister.
 */
export function ListeEnCours({
  atomes,
  maintenant,
  fuseau,
}: {
  atomes: AtomEnCours[];
  maintenant: Date;
  /** Fuseau de l'utilisateur : « auj. » n'a de sens que dans son calendrier. */
  fuseau: string;
}) {
  return (
    <section>
      <h2 className="text-mono font-mono tracking-[0.14em] text-stone-500 uppercase">En cours</h2>

      {atomes.length === 0 ? (
        <div className="mt-pas-4">
          <EtatVide
            constat="Aucun concept en cours."
            contexte="Ce que tu déposes apparaît ici le temps d'être retenu."
          />
        </div>
      ) : (
        <ul className="mt-pas-4 max-w-3xl">
          {atomes.map((atome) => {
            const enRetard = joursAvant(atome.due, maintenant, fuseau) < 0;

            return (
              <li
                key={atome.id}
                className="gap-pas-4 py-pas-3 pl-pas-4 flex items-baseline border-l-2 border-stone-300 not-last:border-b not-last:border-b-stone-100"
              >
                <p className="text-petit line-clamp-2 flex-1">{atome.concept}</p>
                <span
                  className={cn(
                    "text-mono shrink-0 font-mono tabular-nums",
                    enRetard ? "text-lichen-deep" : "text-stone-500",
                  )}
                >
                  {echeanceCourte(atome.due, maintenant, fuseau)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
