import Link from "next/link";
import { useTranslations } from "next-intl";
import { BlocDetache } from "@/components/coquille/bloc-detache";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/auth/routes";
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
 *
 * **Il suit l'axe du chapeau qui l'accueille**, au lieu de repartir au fer à
 * gauche sur un téléphone où tout le reste est centré. Le bouton y prend la
 * largeur, comme celui du compteur du jour : c'est la même décision du même
 * écran — commencer —, et un bouton de deux centimètres posé sous un titre
 * centré se lisait comme un reste de mise en page.
 */
export function EntreeDansLaSerie({ charge }: { charge: ChargeDuJour }) {
  const t = useTranslations("depots.depot.serie");

  if (charge.aujourdhui === 0 && charge.enAttente === 0) return null;

  return (
    <BlocDetache filetCentre className="mt-pas-6 text-center md:text-left">
      {charge.aujourdhui > 0 ? (
        <>
          <p className="text-corps text-stone-900">
            {t("aujourdhui", { nombre: charge.aujourdhui })}
          </p>
          <Button asChild className="mt-pas-4 w-full md:w-auto">
            <Link href={ROUTES.reviser}>{t("commencer")}</Link>
          </Button>
        </>
      ) : (
        <p className="text-corps text-stone-900">
          {t("journeeFaite", { nombre: charge.enAttente })}
        </p>
      )}
    </BlocDetache>
  );
}
