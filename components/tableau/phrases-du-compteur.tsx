import Link from "next/link";
import { useTranslations } from "next-intl";
import { ROUTES } from "@/lib/auth/routes";
import { PLAFOND_SESSION } from "@/lib/domain/selection-session";

/**
 * La phrase du compteur, quand il est à zéro.
 *
 * **Quatre zéros, pas un.** Rien n'a jamais été déposé ; les concepts sont là
 * mais leurs questions s'écrivent ; la journée est faite ; ou il n'y a
 * simplement rien à revoir. Les trois premiers se disaient déjà ; le troisième,
 * non — et c'est le seul qui se lisait faux.
 *
 * **« Les prochains concepts reviendront d'eux-mêmes » était un mensonge une
 * fois sur deux.** Cette phrase s'affichait aussi quand vingt-sept concepts
 * attendaient derrière un plafond atteint : ils ne revenaient pas d'eux-mêmes,
 * ils étaient au bout d'une file. Un écran qui annonce le calme au-dessus d'un
 * paragraphe qui annonce l'attente n'est pas seulement fouillis, il est faux.
 *
 * La journée faite se reconnaît à ce qu'on a revu quelque chose : le plafond est
 * journalier, donc un compteur à zéro derrière des passages faits ne veut dire
 * qu'une chose.
 */
export function PhraseDuJour({
  aDesAtoms,
  questionsEnRoute,
  faitsAujourdhui,
}: {
  aDesAtoms: boolean;
  questionsEnRoute: boolean;
  faitsAujourdhui: number;
}) {
  const t = useTranslations("tableau.aujourdhui.compteur");

  if (!aDesAtoms) return <>{t("rienDepose")}</>;

  if (questionsEnRoute) return <>{t("questionsEnRoute")}</>;

  if (faitsAujourdhui > 0) return <>{t("journeeFaite", { nombre: faitsAujourdhui })}</>;

  return <>{t("calme")}</>;
}

/**
 * Pourquoi des concepts dus ne seront pas servis aujourd'hui.
 *
 * L'écran disait « une session s'arrête à vingt », en toutes lettres, et c'était
 * faux deux fois. Faux sur le nombre — le plafond se règle, et quelqu'un qui l'a
 * mis à dix lisait vingt. Faux sur la raison — on peut être arrêté à deux parce
 * qu'on en a déjà revu dix-huit, et « une session s'arrête à vingt » sous un
 * compteur affichant deux ne s'explique pas tout seul.
 *
 * **Il ne parle plus de la journée entamée.** C'est maintenant la phrase du
 * compteur qui le dit, et le redire ici faisait lire deux fois le même fait à
 * trois lignes d'écart — la moitié du fouillis de cet écran tenait là.
 */
export function PourquoiCertainsAttendent({
  enAttente,
  plafond,
}: {
  enAttente: number;
  plafond: number;
}) {
  const t = useTranslations("tableau.aujourdhui.compteur");
  const lien = (morceau: React.ReactNode) => <Lien>{morceau}</Lien>;

  return (
    <>
      {t("enAttente", { nombre: enAttente })}{" "}
      {plafond === PLAFOND_SESSION
        ? t.rich("plafondParDefaut", { plafond, lien })
        : t.rich("plafondRegle", { plafond, lien })}{" "}
      {t("reste")}
    </>
  );
}

function Lien({ children }: { children: React.ReactNode }) {
  return (
    <Link
      href={ROUTES.reglages}
      className="rounded-galet underline-offset-4 hover:text-stone-900 hover:underline focus-visible:underline"
    >
      {children}
    </Link>
  );
}
