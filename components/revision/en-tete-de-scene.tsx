import Link from "next/link";
import { ROUTES } from "@/lib/auth/routes";

/**
 * Ce qui nomme le passage en cours, et la porte pour en sortir.
 *
 * La porte est nommée plutôt que devinée. Chaque passage est écrit dès qu'il est
 * donné : s'arrêter au troisième concept sur dix garde les trois, et il n'y a
 * donc rien à confirmer ni à avertir. Sans lien, il fallait comprendre qu'on
 * quitte une session en cliquant une icône de navigation — ce qui, quand on ne
 * sait pas si le travail est enregistré, ressemble à un abandon.
 */
export function EnTeteDeScene({
  intitule,
  precision,
  intituleEnMarge = false,
}: {
  intitule?: string;
  /** Ce que ce passage-là n'engage pas. L'entraînement s'en sert. */
  precision?: string;
  /** L'intitulé est repris en marge sur grand écran : il s'efface ici. */
  intituleEnMarge?: boolean;
}) {
  return (
    <div className="gap-pas-4 flex items-baseline justify-between">
      <p className="gap-pas-3 flex flex-wrap items-baseline">
        <span
          className={`text-mono font-mono tracking-[0.14em] text-stone-500 uppercase ${
            intituleEnMarge ? "2xl:hidden" : ""
          }`}
        >
          {intitule}
        </span>

        {precision ? <span className="text-petit text-stone-500">{precision}</span> : null}
      </p>

      <Link
        href={ROUTES.aujourdhui}
        className="text-petit rounded-galet shrink-0 text-stone-900 underline-offset-4 hover:underline focus-visible:underline"
      >
        Arrêter là
      </Link>
    </div>
  );
}
