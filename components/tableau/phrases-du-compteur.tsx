import Link from "next/link";
import { useTranslations } from "next-intl";
import { ROUTES } from "@/lib/auth/routes";
import { PLAFOND_SESSION } from "@/lib/domain/selection-session";

/**
 * La phrase du compteur, quand il est à zéro. Quatre zéros distincts : rien
 * déposé, questions en cours d'écriture, journée faite, rien à revoir.
 *
 * La journée faite se reconnaît à ce qu'on a revu quelque chose : le plafond
 * est journalier, et la phrase « calme » serait fausse si des concepts
 * attendent derrière lui.
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
 * Pourquoi des concepts dus ne seront pas servis aujourd'hui. Le plafond cité
 * est celui de la personne, qui se règle. La journée entamée n'est pas redite
 * ici : c'est `PhraseDuJour` qui la porte.
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
