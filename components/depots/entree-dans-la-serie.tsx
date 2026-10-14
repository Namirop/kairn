import Link from "next/link";
import { useTranslations } from "next-intl";
import { BlocDetache } from "@/components/coquille/bloc-detache";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/auth/routes";
import type { ChargeDuJour } from "@/lib/domain/selection-session";

/**
 * Ce que le dépôt vient de changer à la journée, dit sur la page du dépôt, qui
 * se recharge quand le découpage aboutit (`SuivreLAvancement`). Sans lui, un
 * compteur « Aujourd'hui » inchangé se lirait comme une panne.
 *
 * Le chiffre est celui de la journée entière, pas de ce dépôt : la session ne
 * connaît pas les dépôts, et c'est elle qui servira. La journée pleine se dit
 * aussi : c'est le seul cas où un concept neuf n'entre pas dans la série.
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
