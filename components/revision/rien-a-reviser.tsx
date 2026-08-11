import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/auth/routes";
import { delaiAvantLeJour } from "@/lib/domain/echeance";

/**
 * Les trois raisons de n'avoir rien à réviser.
 *
 * Aucune n'est un vide à combler. Être à jour est l'état normal du produit :
 * une session ne se remplit jamais de concepts non échus pour faire nombre.
 */

type Props = {
  totalConcepts: number;
  conceptsEnAttenteDeQuestions: number;
  prochainJourServi: string | null;
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
  fuseau,
  maintenant,
}: Props) {
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
