import Link from "next/link";
import { useTranslations } from "next-intl";
import { BlocDetache } from "@/components/coquille/bloc-detache";
import { ROUTES } from "@/lib/auth/routes";
import { PLAFOND_MAX } from "@/lib/domain/selection-session";

/**
 * Quand quelqu'un dépose plus vite qu'il ne révise.
 *
 * Un constat, jamais un reproche : personne n'a mal fait, deux rythmes ne se
 * rejoignent simplement pas. La phrase dit ce qui se passe, et la sortie qui va
 * avec. Sans sortie, ce serait de la culpabilisation avec un chiffre.
 *
 * Il n'apparaît qu'au-delà du seuil et disparaît dès que le retard redescend.
 * Une bannière permanente devient un élément de décor, et on cesse de la lire
 * au moment précis où elle aurait quelque chose à dire.
 *
 * Le nombre de jours est donné, pas arrondi en « quelques ». On le connaît, et
 * le flou fait plus peur que le chiffre : « quelques jours » se lit comme un
 * reproche qu'on n'ose pas chiffrer, « six jours » se lit comme un fait.
 *
 * Il se détache en gris de pierre, et pas en ember : cet accent-là appartient à
 * la série et à rien d'autre. Le mettre ici, fût-ce à quarante pour cent, en
 * faisait la couleur de deux choses opposées — ce qu'on tient, et ce qui
 * s'accumule.
 *
 * **« Faire une seconde session maintenant » a été retiré le 13/09/2026, parce
 * que c'était impossible.** La phrase datait d'avant le plafond journalier :
 * depuis, une journée dont le plafond est consommé ne sert plus rien, et le lien
 * « Reprendre une session » menait donc à un écran vide — proposé, qui plus est,
 * sous un compteur affichant zéro. Le vrai levier est celui qui décide du
 * plafond, et il est dans les réglages.
 *
 * **Il connaît son propre bout.** Quelqu'un déjà réglé au maximum ne peut pas
 * monter : lui proposer serait la deuxième fausse sortie de ce bloc en deux
 * versions. Il ne lui reste alors qu'à lever le pied, et c'est dit tel quel.
 */
export function SignalDeDette({
  enAttente,
  jours,
  plafond,
}: {
  enAttente: number;
  jours: number;
  /** Le plafond de session du compte : c'est lui qui dit s'il reste une marche à monter. */
  plafond: number;
}) {
  const t = useTranslations("tableau.aujourdhui.dette");

  return (
    <BlocDetache>
      <p className="text-corps max-w-prose leading-relaxed text-stone-900">
        {t("constat", { jours, enAttente })}
      </p>
      <p className="mt-pas-2 text-petit max-w-prose text-stone-500">
        {plafond >= PLAFOND_MAX
          ? t("auMaximum", { plafond })
          : t.rich("deuxFacons", {
              plafond,
              lien: (morceau) => (
                <Link
                  href={ROUTES.reglages}
                  className="rounded-galet text-stone-800 underline underline-offset-4"
                >
                  {morceau}
                </Link>
              ),
            })}
      </p>
    </BlocDetache>
  );
}
