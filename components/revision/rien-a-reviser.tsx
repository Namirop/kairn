import { ENTRAINEMENT_LIBRE } from "@/components/revision/entrainement-libre";
import { Palier } from "@/components/revision/palier";
import { ROUTES } from "@/lib/auth/routes";
import { compte } from "@/lib/domain/accord";
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
  // Le plafond du jour est atteint, et il reste des concepts dus. C'est le seul
  // écran vide qui annonce du travail : il le dit, puis il ouvre la seule porte
  // qui ne coûte rien à la mémoire.
  if (reporteAuLendemain > 0) {
    return (
      <Palier
        intitule="Session"
        titre="Tu as fait ta journée"
        explication={`${compte(reporteAuLendemain, "concept", "concepts")} ${reporteAuLendemain === 1 ? "attend" : "attendent"} demain. Le plafond de ta session tient à ça : ce qui reste est encore dû, et il passera en tête.`}
        action={{
          libelle: "S'entraîner",
          href: ROUTES.entrainement,
          precision: ENTRAINEMENT_LIBRE,
        }}
      />
    );
  }

  if (totalConcepts === 0) {
    return (
      <Palier
        titre="Rien à revoir pour l'instant"
        explication="Kairn repose ce que tu lui donnes. Dépose une première chose que tu veux garder, et elle reviendra d'elle-même."
        action={{ libelle: "Déposer", href: `${ROUTES.depots}/nouveau` }}
      />
    );
  }

  // Des concepts existent, mais aucun ne porte encore de question : leurs
  // formulations sont en cours d'écriture. On dit l'attente, pas la file de jobs.
  if (!prochainJourServi && conceptsEnAttenteDeQuestions > 0) {
    return (
      <Palier
        titre="Les questions arrivent"
        explication="Tes concepts sont découpés, leurs questions sont en cours d'écriture. Elles seront là à ta prochaine visite."
        action={{ libelle: "Voir ce que tu as déposé", href: ROUTES.depots }}
      />
    );
  }

  // Le moment exact où l'entraînement existe : un compte neuf a fait le tour de
  // sa session en quatre questions et tombe sur « reviens demain ». Déposer
  // d'abord — c'est ce qui fait avancer —, s'entraîner ensuite.
  return (
    <Palier
      titre="Tu es à jour"
      explication={
        prochainJourServi
          ? `Rien à revoir aujourd'hui. Le prochain concept revient ${delaiAvantLeJour(prochainJourServi, maintenant, fuseau)}.`
          : "Rien à revoir aujourd'hui."
      }
      action={{ libelle: "Déposer autre chose", href: `${ROUTES.depots}/nouveau` }}
      secondaire={{
        libelle: "S'entraîner",
        href: ROUTES.entrainement,
        precision: ENTRAINEMENT_LIBRE,
      }}
    />
  );
}
