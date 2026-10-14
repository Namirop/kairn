import { ENTRAINEMENT_LIBRE } from "@/components/revision/entrainement-libre";
import { Palier } from "@/components/revision/palier";
import { useTranslations } from "next-intl";
import { ROUTES } from "@/lib/auth/routes";
import { delaiAvantLeJour } from "@/lib/domain/echeance";

/**
 * Les quatre raisons de n'avoir rien à réviser. Être à jour est l'état normal :
 * une session ne se remplit jamais de concepts non échus pour faire nombre.
 *
 * Le plafond du jour atteint est le seul cas où quelque chose reste dû : il ne
 * dit pas « tu es à jour », et n'ouvre pas sur un dépôt.
 *
 * Toutes passent par le même `Palier` que la fin de session et d'entraînement.
 */

type Props = {
  totalConcepts: number;
  conceptsEnAttenteDeQuestions: number;
  prochainJourServi: string | null;
  /** Ce qui est dû et que la journée ne servira plus. Zéro le reste du temps. */
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

  // Plafond atteint, des concepts restent dus : la seule porte ouverte est
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

  // Aucun concept ne porte encore de question : on dit l'attente, pas la file
  // de jobs.
  if (!prochainJourServi && conceptsEnAttenteDeQuestions > 0) {
    return (
      <Palier
        titre={t("rien.attenteTitre")}
        explication={t("rien.attente")}
        action={{ libelle: t("rien.voirDepots"), href: ROUTES.depots }}
      />
    );
  }

  // Déposer d'abord, c'est ce qui fait avancer ; s'entraîner en second.
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
