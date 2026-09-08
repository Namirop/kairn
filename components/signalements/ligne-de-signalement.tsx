import { BlocDetache } from "@/components/coquille/bloc-detache";
import { TexteTechnique } from "@/components/typographie/texte-technique";
import type { SignalementLu } from "@/lib/db/signalement";
import type { MotifDeSignalement } from "@/lib/db/types";

/**
 * Un signalement, tel qu'on le relit.
 *
 * Écran interne : la question porte le poids, tout le reste est en retrait. Le
 * contexte technique se lit en prose sur une ligne plutôt qu'en table de specs —
 * ce sont six valeurs courtes qu'on parcourt, pas six lignes qu'on compare.
 *
 * Le concept apparaît sous la question parce que c'est lui qui dit si la
 * question était juste. Quand il a été supprimé depuis, on le dit : c'est
 * souvent le geste qui suit un signalement, et c'est un signal en soi.
 */

const MOTIFS: Record<MotifDeSignalement, string> = {
  INCOMPREHENSIBLE: "Incompréhensible",
  FAUSSE: "Réponse fausse",
  HORS_SUJET: "Hors sujet",
  TROP_FACILE: "Trop facile",
};

const JOUR = new Intl.DateTimeFormat("fr-BE", { dateStyle: "medium", timeStyle: "short" });

export function LigneDeSignalement({ signalement }: { signalement: SignalementLu }) {
  return (
    <li className="py-pas-6">
      <div className="gap-pas-4 flex flex-wrap items-baseline justify-between">
        <p className="text-mono font-mono tracking-[0.12em] text-stone-900 uppercase">
          {MOTIFS[signalement.motif]}
        </p>
        <p className="text-mono font-mono text-stone-500 tabular-nums">
          {JOUR.format(signalement.createdAt)}
        </p>
      </div>

      <p className="mt-pas-3 text-corps max-w-prose leading-relaxed font-medium text-stone-900">
        <TexteTechnique>{signalement.question}</TexteTechnique>
      </p>

      <p className="mt-pas-2 text-petit max-w-prose text-stone-500">
        Réponse attendue : <TexteTechnique>{signalement.reponse}</TexteTechnique>
      </p>

      {signalement.commentaire ? (
        <BlocDetache className="mt-pas-3">
          <p className="text-petit max-w-prose text-stone-800">{signalement.commentaire}</p>
        </BlocDetache>
      ) : null}

      <p className="mt-pas-3 text-petit max-w-prose text-stone-500">
        <span className="text-stone-800">Concept</span> —{" "}
        <TexteTechnique>{signalement.concept}</TexteTechnique>
        {signalement.conceptExisteEncore ? "" : " (supprimé depuis)"}
      </p>

      {/* Six valeurs courtes qu'on parcourt : une ligne en prose se lit plus
          vite qu'une table de six lignes, et n'invente pas de colonnes. */}
      <p className="mt-pas-2 text-mono font-mono text-stone-500">
        {signalement.format} · {signalement.facet} · {signalement.model} · prompt{" "}
        {signalement.promptVersion ?? "inconnu"} · dépôt {signalement.inputId ?? "détaché"}
      </p>
    </li>
  );
}
