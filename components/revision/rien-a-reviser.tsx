import { ENTRAINEMENT_LIBRE } from "@/components/revision/entrainement-libre";
import { Palier } from "@/components/revision/palier";
import { useTranslations } from "next-intl";
import { ROUTES } from "@/lib/auth/routes";
import { delaiAvantLeJour } from "@/lib/domain/echeance";

/**
 * Les quatre raisons de n'avoir rien à réviser.
 *
 * Aucune n'est un vide à combler. Être à jour est l'état normal du produit :
 * une session ne se remplit jamais de concepts non échus pour faire nombre.
 *
 * La quatrième est la seule où quelque chose est encore dû : le plafond du jour
 * est atteint. Elle ne dit donc pas « tu es à jour », qui serait faux, et elle
 * n'ouvre pas sur un dépôt — déposer plus quand on vient d'atteindre son plafond
 * est le contraire du conseil utile.
 *
 * Les quatre passent par le même palier que la fin de session et la fin d'un tour
 * d'entraînement : ce sont les mêmes haltes, elles se ressemblent parce qu'elles
 * sont de même nature.
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

  // Le plafond du jour est atteint, et il reste des concepts dus. C'est le seul
  // écran vide qui annonce du travail : il le dit, puis il ouvre la seule porte
  // qui ne coûte rien à la mémoire.
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

  // Des concepts existent, mais aucun ne porte encore de question : leurs
  // formulations sont en cours d'écriture. On dit l'attente, pas la file de jobs.
  if (!prochainJourServi && conceptsEnAttenteDeQuestions > 0) {
    return (
      <Palier
        titre={t("rien.attenteTitre")}
        explication={t("rien.attente")}
        action={{ libelle: t("rien.voirDepots"), href: ROUTES.depots }}
      />
    );
  }

  // Le moment exact où l'entraînement existe : un compte neuf a fait le tour de
  // sa session en quatre questions et tombe sur « reviens demain ». Déposer
  // d'abord — c'est ce qui fait avancer —, s'entraîner ensuite.
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
