import { ENTRAINEMENT_LIBRE } from "@/components/revision/entrainement-libre";
import { Palier } from "@/components/revision/palier";
import { useTranslations } from "next-intl";
import { ROUTES } from "@/lib/auth/routes";
import { delaiAvantLeJour } from "@/lib/domain/echeance";

/**
 * Les quatre raisons de n'avoir rien à réviser. Être à jour est l'état normal :
 * une session ne se remplit jamais de concepts non échus pour faire nombre.
 */

type Props = {
  totalConcepts: number;
  conceptsEnAttenteDeQuestions: number;
  prochainJourServi: string | null;
  /** Dû mais au-delà du plafond du jour. */
  reporteAuLendemain: number;
  fuseau: string;
  maintenant: Date;
};

export function RienAReviser({
  totalConcepts,
  conceptsEnAttenteDeQuestions,
  prochainJourServi,
  reporteAuLendemain,
  fuseau,
  maintenant,
}: Props) {
  const tTemps = useTranslations("temps");
  const t = useTranslations("revision.paliers");

  // Le seul cas où quelque chose reste dû : ni « tu es à jour » ni dépôt, seul
  // l'entraînement, qui ne touche pas à la mémoire.
  if (reporteAuLendemain > 0) {
    return (
      <Palier
        intitule={t("intituleSession")}
        titre={t("rien.journeeFaiteTitre")}
        explication={t("rien.journeeFaite", { nombre: reporteAuLendemain })}
        action={{
          libelle: t("sentrainer"),
          href: ROUTES.entrainement,
          precision: t(ENTRAINEMENT_LIBRE),
        }}
      />
    );
  }

  if (totalConcepts === 0) {
    return (
      <Palier
        titre={t("rien.videTitre")}
        explication={t("rien.vide")}
        action={{ libelle: t("deposer"), href: `${ROUTES.depots}/nouveau` }}
      />
    );
  }

  // On dit l'attente, pas la file de jobs.
  if (!prochainJourServi && conceptsEnAttenteDeQuestions > 0) {
    return (
      <Palier
        titre={t("rien.attenteTitre")}
        explication={t("rien.attente")}
        action={{ libelle: t("rien.voirDepots"), href: ROUTES.depots }}
      />
    );
  }

  // Déposer d'abord, s'entraîner en second.
  return (
    <Palier
      titre={t("rien.aJourTitre")}
      explication={
        prochainJourServi
          ? t("rien.aJourProchain", {
              delai: tTemps("delai", delaiAvantLeJour(prochainJourServi, maintenant, fuseau)),
            })
          : t("rien.aJour")
      }
      action={{ libelle: t("deposerAutreChose"), href: `${ROUTES.depots}/nouveau` }}
      secondaire={{
        libelle: t("sentrainer"),
        href: ROUTES.entrainement,
        precision: t(ENTRAINEMENT_LIBRE),
      }}
    />
  );
}
