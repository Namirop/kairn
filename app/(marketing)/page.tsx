import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Panneau } from "@/components/coquille/panneau";
import { Strates } from "@/components/coquille/strates";
import { Essai } from "@/components/site/essai";
import { Ouverture } from "@/components/site/ouverture";
import { LienDeLangue } from "@/components/site/lien-de-langue";
import { PasCeci } from "@/components/site/pas-ceci";
import { Sentier } from "@/components/site/sentier";
import { ROUTES } from "@/lib/auth/routes";
import { lireLUtilisateur } from "@/lib/auth/session";
import { lireLEssaiEnCours } from "@/lib/depots/essai-en-cours";
import { inviteDeDepot } from "@/lib/domain/invites-de-depot";
import { adressePublique } from "@/lib/i18n/adresses";
import { langueDeLaRequete } from "@/lib/i18n/langue-de-la-requete";

/** Chaque coupe a sa graine, pour qu'aucune ne ressemble à un séparateur de gabarit. */
/** L'invite du champ change à chaque chargement. */
export const dynamic = "force-dynamic";

export default async function PageAccueil() {
  const langue = await langueDeLaRequete();
  // Ici : qui revient retrouve ses concepts au premier rendu, sans aller-retour.
  const essaiPrecedent = await lireLEssaiEnCours();
  const connecte = (await lireLUtilisateur()) !== null;
  const t = await getTranslations("site.accueil.pied");
  // Voulu : un Server Component se rend une fois par requête, la règle de pureté
  // vise les composants client.
  // eslint-disable-next-line react-hooks/purity
  const invite = inviteDeDepot(Math.random(), langue);

  return (
    <>
      <Ouverture connecte={connecte} />

      {/* Sans essai, la coupe ombre vers ombre reste : sinon le sentier aurait
          l'air de continuer l'ouverture. */}
      {connecte ? null : (
        <>
          <Strates de="ombre" vers="papier" graine="accueil-essai" />
          <Essai invite={invite} essaiPrecedent={essaiPrecedent} />
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

          {/* Sans compte : tarifs et confidentialité se lisent avant de s'engager. */}
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
