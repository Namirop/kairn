import Link from "next/link";
import { ROUTES } from "@/lib/auth/routes";

/**
 * Quand quelqu'un dépose plus vite qu'il ne révise.
 *
 * Un constat, jamais un reproche : personne n'a mal fait, deux rythmes ne se
 * rejoignent simplement pas. La phrase dit ce qui se passe, et les deux sorties
 * possibles — lever le pied quelques jours, ou faire une seconde session dans
 * la journée. Sans sortie, ce serait de la culpabilisation avec un chiffre.
 *
 * Il n'apparaît qu'au-delà du seuil et disparaît dès que l'arriéré redescend.
 * Une bannière permanente devient un élément de décor, et on cesse de la lire
 * au moment précis où elle aurait quelque chose à dire.
 */
export function SignalDeDette({ enAttente }: { enAttente: number }) {
  return (
    <div className="border-ember/40 pl-pas-4 border-l-2">
      <p className="text-corps max-w-prose leading-relaxed text-stone-900">
        Ça fait quelques jours que l&apos;arriéré ne descend pas : {enAttente} concepts attendent
        derrière la session du jour.
      </p>
      <p className="mt-pas-2 text-petit max-w-prose text-stone-500">
        Deux façons de le résorber : lever le pied sur les dépôts quelques jours, ou faire une
        seconde session maintenant — rien n&apos;empêche d&apos;en enchaîner deux.{" "}
        <Link
          href={ROUTES.reviser}
          className="rounded-galet text-stone-800 underline underline-offset-4"
        >
          Reprendre une session
        </Link>
        .
      </p>
    </div>
  );
}
