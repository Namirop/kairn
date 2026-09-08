import Link from "next/link";
import { BlocDetache } from "@/components/coquille/bloc-detache";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/auth/routes";
import { compte } from "@/lib/domain/accord";
import type { ChargeDuJour } from "@/lib/domain/selection-session";

/**
 * Ce que le dépôt vient de changer à la journée, dit sur la page du dépôt.
 *
 * **Rien ne le disait, et c'est ce qui a fait croire à une panne.** La chaîne
 * met une quinzaine de secondes entre le dépôt et la première question écrite ;
 * qui va voir « Aujourd'hui » dans la foulée y lit un compteur inchangé, et
 * n'a ensuite aucune raison de revenir. Le pipeline avait fait son travail, la
 * personne ne l'a jamais su.
 *
 * L'écran du dépôt se recharge tout seul quand le découpage aboutit — c'est
 * `SuivreLAvancement`. Il ne manquait que la conséquence, et la porte : d'ici,
 * la seule sortie menait à la liste des dépôts ou à la suppression.
 *
 * **Le chiffre est celui de la journée entière, pas celui de ce dépôt.** C'est
 * la question qu'on se pose en arrivant ici — « et maintenant ? » —, et la
 * réponse est la session, qui ne connaît pas les dépôts. Compter les seuls
 * concepts de celui-ci obligerait à écarter ceux qui sont déjà passés
 * aujourd'hui, et à annoncer une série que la session ne servirait pas telle
 * quelle.
 *
 * **La journée pleine se dit aussi.** Un plafond atteint est la seule raison
 * pour laquelle un concept tout neuf n'entre pas dans la série, et c'est
 * exactement le cas où le silence se lirait comme la panne qu'on vient de
 * corriger.
 */
export function EntreeDansLaSerie({ charge }: { charge: ChargeDuJour }) {
  if (charge.aujourdhui === 0 && charge.enAttente === 0) return null;

  return (
    <BlocDetache className="mt-pas-6 text-left">
      {charge.aujourdhui > 0 ? (
        <>
          <p className="text-corps text-stone-900">
            Ta série du jour en compte {compte(charge.aujourdhui, "concept", "concepts")}.
          </p>
          <Button asChild className="mt-pas-3">
            <Link href={ROUTES.reviser}>Commencer</Link>
          </Button>
        </>
      ) : (
        <p className="text-corps text-stone-900">
          Ta journée est faite : {compte(charge.enAttente, "concept attend", "concepts attendent")}{" "}
          demain, celui-ci compris.
        </p>
      )}
    </BlocDetache>
  );
}
