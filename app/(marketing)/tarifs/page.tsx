import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Panneau } from "@/components/coquille/panneau";
import { PileDePanneaux } from "@/components/coquille/pile-de-panneaux";
import { Strates } from "@/components/coquille/strates";
import { Offres } from "@/components/site/offres";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/auth/routes";
import { getCurrentUser } from "@/lib/auth/session";
import { PLAFOND_GRATUIT } from "@/lib/domain/plafond-du-plan";
import { langueDeLaRequete } from "@/lib/i18n/langue-de-la-requete";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("site.tarifs.meta");

  return { title: t("titre"), description: t("description") };
}

/**
 * Le prix, sur une page publique : elle se partage par lien et se relit sans
 * être connecté. Elle informe, elle n'encaisse pas : l'achat vit dans les
 * réglages, et la carte se saisit chez Stripe.
 */
export default async function PageTarifs() {
  const connecte = (await getCurrentUser()) !== null;
  const t = await getTranslations("site.tarifs");
  // Premium n'est pas vendu en anglais : ni geste vers l'achat, ni précisions
  // sur un abonnement qu'on ne peut pas prendre.
  const vendable = (await langueDeLaRequete()) === "FR";

  return (
    <PileDePanneaux sol="papier">
      <Panneau surface="papier" aere mesure="colonne">
        <h1 className="font-display text-h1-site leading-[1] font-bold tracking-[-0.02em]">
          {t("titre")}
        </h1>
        <p className="mt-pas-6 text-corps max-w-prose text-stone-500">
          {t("chapeau", { plafond: PLAFOND_GRATUIT })}
        </p>
      </Panneau>

      <Strates de="papier" vers="ombre" graine="tarifs-offres" />

      <Panneau surface="ombre" aere mesure="colonne">
        <Offres />
      </Panneau>

      <Strates de="ombre" vers="papier" graine="tarifs-precisions" />

      <Panneau surface="papier" aere mesure="colonne" remplit>
        <h2 className="font-display text-h2-site leading-[1] font-bold tracking-[-0.02em]">
          {t("precisions.titre")}
        </h2>

        {/* Ce qui suit doit rester vrai du code : chaque phrase se vérifie dans
            le produit. */}
        <div className="mt-pas-8 gap-pas-6 grid">
          <Precision titre={t("precisions.identique.titre")}>
            {t("precisions.identique.texte")}
          </Precision>

          <Precision titre={t("precisions.mois.titre")}>{t("precisions.mois.texte")}</Precision>

          {vendable ? (
            <>
              <Precision titre={t("precisions.arreter.titre")}>
                {t("precisions.arreter.texte", { plafond: PLAFOND_GRATUIT })}
              </Precision>

              <Precision titre={t("precisions.quand.titre")}>
                {t("precisions.quand.texte")}
              </Precision>
            </>
          ) : null}
        </div>

        <div className="mt-pas-12 gap-pas-4 flex flex-wrap items-center">
          {/* Sans compte, on commence par essayer ; connecté, on va là où l'on
              paie. */}
          <Button asChild size="lg">
            <Link href={destination(connecte, vendable)}>
              {connecte
                ? vendable
                  ? t("geste.choisir")
                  : t("geste.aujourdhui")
                : t("geste.commencer")}
            </Link>
          </Button>
          {connecte ? null : <p className="text-petit text-stone-500">{t("geste.sansCarte")}</p>}
        </div>
      </Panneau>
    </PileDePanneaux>
  );
}

/**
 * Où mène le geste du bas. Qui est connecté et ne peut pas acheter dans sa
 * langue retourne à sa journée : les réglages ne lui vendraient rien.
 */
function destination(connecte: boolean, vendable: boolean): string {
  if (!connecte) return ROUTES.inscription;

  return vendable ? ROUTES.reglages : ROUTES.aujourdhui;
}

function Precision({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-corps font-semibold text-stone-900">{titre}</h3>
      <p className="mt-pas-1 text-petit max-w-prose text-stone-500">{children}</p>
    </div>
  );
}
