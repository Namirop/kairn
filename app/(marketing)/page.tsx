import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Panneau } from "@/components/coquille/panneau";
import { Strates } from "@/components/coquille/strates";
import { Essai } from "@/components/site/essai";
import { Hero } from "@/components/site/hero";
import { LienDeLangue } from "@/components/site/lien-de-langue";
import { PasCeci } from "@/components/site/pas-ceci";
import { Sentier } from "@/components/site/sentier";
import { ROUTES } from "@/lib/auth/routes";
import { getCurrentUser } from "@/lib/auth/session";
import { lireLEssaiEnCours } from "@/lib/depots/essai-en-cours";
import { inviteDeDepot } from "@/lib/domain/invites-de-depot";
import { adressePublique } from "@/lib/i18n/adresses";
import { langueDeLaRequete } from "@/lib/i18n/langue-de-la-requete";

/**
 * La page publique : une pile de panneaux séparés par des coupes de roche.
 * Chaque coupe a sa propre graine, pour qu'aucune ne ressemble à un séparateur
 * de gabarit.
 */
/** Rendue à la demande : l'invite du champ change à chaque chargement. */
export const dynamic = "force-dynamic";

export default async function PageAccueil() {
  const langue = await langueDeLaRequete();
  // Lu ici et non dans le composant : quelqu'un qui revient doit retrouver ses
  // concepts au premier rendu, pas après un aller-retour.
  const essaiPrecedent = await lireLEssaiEnCours();
  const connecte = (await getCurrentUser()) !== null;
  const t = await getTranslations("site.accueil.pied");

  return (
    <>
      {/* Le hero porte le même titre et le même cairn pour tout le monde ; son
          geste mène à l'essai ou à la journée selon l'état. */}
      <Hero connecte={connecte} />

      {/* L'essai n'existe que pour un visiteur, et sa jointure avec lui. Sans
          essai, la coupe d'ombre vers ombre qui suit reste quand même : sans
          elle, le sentier aurait l'air de continuer l'ouverture. */}
      {connecte ? null : (
        <>
          <Strates de="ombre" vers="papier" graine="accueil-essai" />
          <Essai invite={inviteDeDepot(Math.random(), langue)} essaiPrecedent={essaiPrecedent} />
        </>
      )}

      <Strates de={connecte ? "ombre" : "papier"} vers="ombre" graine="accueil-sentier" />
      <Sentier />
      <Strates de="ombre" vers="roche" graine="accueil-pas-ceci" />
      <PasCeci connecte={connecte} />
      <Strates de="roche" vers="papier" graine="accueil-pied" />

      <Panneau surface="papier">
        <div className="gap-pas-4 flex flex-wrap items-baseline justify-between">
          <p className="text-mono text-stone-500">{t("devise")}</p>

          {/* Atteignables sans compte : la confidentialité et les tarifs se
              lisent avant de s'engager. */}
          <nav className="gap-pas-4 text-mono flex flex-wrap">
            <Link
              href={adressePublique(ROUTES.tarifs, langue)}
              className="rounded-galet text-stone-500 underline-offset-4 hover:text-stone-900 hover:underline focus-visible:underline"
            >
              {t("tarifs")}
            </Link>
            <Link
              href={adressePublique(ROUTES.mentionsLegales, langue)}
              className="rounded-galet text-stone-500 underline-offset-4 hover:text-stone-900 hover:underline focus-visible:underline"
            >
              {t("mentionsLegales")}
            </Link>
            <Link
              href={adressePublique(ROUTES.confidentialite, langue)}
              className="rounded-galet text-stone-500 underline-offset-4 hover:text-stone-900 hover:underline focus-visible:underline"
            >
              {t("confidentialite")}
            </Link>
            <LienDeLangue />
          </nav>
        </div>
      </Panneau>
    </>
  );
}
