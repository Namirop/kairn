"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { EcranErreur } from "@/components/etats/ecran-erreur";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/auth/routes";

export default function Erreur({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("tableau.commun");

  useEffect(() => {
    // L'empreinte suffit à retrouver la trace côté serveur ; rien du contenu de
    // l'utilisateur ne part dans les journaux.
    console.error(`Erreur d'affichage${error.digest ? ` — ${error.digest}` : ""}`);
  }, [error.digest]);

  return (
    <EcranErreur
      code={
        error.digest
          ? t("erreur.codeAvecEmpreinte", { empreinte: error.digest.slice(0, 8) })
          : t("erreur.code")
      }
      titre={t("erreur.titre")}
      explication={t("erreur.explication")}
      actions={
        <>
          <Button onClick={reset}>{t("erreur.reessayer")}</Button>
          <Button asChild variant="outline">
            <Link href={ROUTES.aujourdhui}>{t("erreur.retourAujourdhui")}</Link>
          </Button>
        </>
      }
    />
  );
}
