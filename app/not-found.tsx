import Link from "next/link";
import { useTranslations } from "next-intl";
import { EcranErreur } from "@/components/etats/ecran-erreur";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/auth/routes";

export default function Introuvable() {
  const t = useTranslations("tableau.commun.introuvable");

  return (
    <EcranErreur
      code="404"
      titre={t("titre")}
      explication={t("explication")}
      actions={
        <>
          <Button asChild>
            <Link href={ROUTES.aujourdhui}>{t("allerAujourdhui")}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={ROUTES.accueil}>{t("presentation")}</Link>
          </Button>
        </>
      }
    />
  );
}
