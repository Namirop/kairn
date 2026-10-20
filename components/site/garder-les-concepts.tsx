"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { PorteDeSortie } from "@/components/site/porte-de-sortie";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/auth/routes";

/**
 * L'appel à garder, dans le pied fixe de la fenêtre de l'essai. Empilé sur
 * téléphone : sur une ligne de 390 px, la mention tomberait à un mot par ligne.
 */
export function GarderLesConcepts({
  peutRedeposer,
  chaineFinie,
  surRedepot,
}: {
  /** La base n'accorde que deux essais par tranche de vingt-quatre heures. */
  peutRedeposer: boolean;
  /** L'extraction est allée au bout : avant, il n'y a rien à dire de la suite. */
  chaineFinie: boolean;
  surRedepot: () => void;
}) {
  const t = useTranslations("site.essai.garder");

  return (
    <div className="gap-pas-2 md:gap-pas-4 flex flex-col md:flex-row md:items-center">
      <Button asChild size="lg" variant="clair" className="w-full md:w-auto">
        <Link href={ROUTES.connexion}>{t("garder")}</Link>
      </Button>

      <span className="text-petit text-stone-300">{t("mention")}</span>

      <span className="shrink-0 self-start md:ml-auto md:self-auto">
        <PorteDeSortie
          peutRedeposer={peutRedeposer}
          chaineFinie={chaineFinie}
          surRedepot={surRedepot}
          clair
        />
      </span>
    </div>
  );
}
