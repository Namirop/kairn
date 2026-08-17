import Link from "next/link";
import { Button } from "@/components/ui/button";
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

type Lien = { libelle: string; href: string };

function Ecran({
  titre,
  explication,
  action,
  secondaire,
  note,
}: {
  titre: string;
  explication: string;
  action?: Lien;
  secondaire?: Lien;
  note?: string;
}) {
  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col">
      <h1 className="text-h1-app leading-tight font-bold text-stone-900">{titre}</h1>
      <p className="mt-pas-3 text-corps max-w-lg leading-relaxed text-stone-500">{explication}</p>

      {action ? (
        <div className="gap-pas-3 mt-pas-8 flex flex-col sm:flex-row">
          <Button asChild>
            <Link href={action.href}>{action.libelle}</Link>
          </Button>
          {secondaire ? (
            <Button asChild variant="outline">
              <Link href={secondaire.href}>{secondaire.libelle}</Link>
            </Button>
          ) : null}
        </div>
      ) : null}

      {note ? <p className="mt-pas-4 text-petit max-w-lg text-stone-500">{note}</p> : null}
    </section>
  );
}

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
      <Ecran
        titre="Tu as fait ta journée"
        explication={`${compte(reporteAuLendemain, "concept", "concepts")} ${reporteAuLendemain === 1 ? "attend" : "attendent"} demain. Le plafond de ta session tient à ça : ce qui reste est encore dû, et il passera en tête.`}
        action={{ libelle: "S'entraîner", href: ROUTES.entrainement }}
        note="L'entraînement repose d'autres questions sur les mêmes concepts, autant que tu veux. Il ne change pas ton planning."
      />
    );
  }

  if (totalConcepts === 0) {
    return (
      <Ecran
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
      <Ecran
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
    <Ecran
      titre="Tu es à jour"
      explication={
        prochainJourServi
          ? `Rien à revoir aujourd'hui. Le prochain concept revient ${delaiAvantLeJour(prochainJourServi, maintenant, fuseau)}.`
          : "Rien à revoir aujourd'hui."
      }
      action={{ libelle: "Déposer autre chose", href: `${ROUTES.depots}/nouveau` }}
      secondaire={{ libelle: "S'entraîner", href: ROUTES.entrainement }}
      note="L'entraînement repose d'autres questions sur les mêmes concepts. Il ne change pas ton planning."
    />
  );
}
