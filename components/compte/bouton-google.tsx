"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { signIn } from "@/lib/auth/client";

/** Aucun fuseau sur ce chemin : la coquille le réconcilie au premier affichage. */
export function BoutonGoogle({ suite }: { suite: string }) {
  const t = useTranslations("compte.connexion");

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={() => {
        void signIn.social({ provider: "google", callbackURL: suite }).catch((erreur: unknown) => {
          console.error("La connexion Google a échoué.", erreur);
        });
      }}
    >
      {t("google")}
    </Button>
  );
}
