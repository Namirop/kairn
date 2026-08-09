import Link from "next/link";
import { EcranErreur } from "@/components/etats/ecran-erreur";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/auth/routes";

export default function Introuvable() {
  return (
    <EcranErreur
      code="404"
      titre="Ce sentier ne mène nulle part"
      explication="L'adresse demandée n'existe pas, ou n'existe plus. Rien n'a été supprimé de ce que tu as déposé."
      actions={
        <>
          <Button asChild>
            <Link href={ROUTES.aujourdhui}>Aller à Aujourd&apos;hui</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={ROUTES.accueil}>Voir la présentation</Link>
          </Button>
        </>
      }
    />
  );
}
