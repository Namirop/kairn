import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Panneau } from "@/components/coquille/panneau";
import { PileDePanneaux } from "@/components/coquille/pile-de-panneaux";
import { Strates } from "@/components/coquille/strates";
import { InviteInstallation } from "@/components/pwa/invite-installation";
import { ColonneCairn } from "@/components/tableau/colonne-cairn";
import { CompteurDu } from "@/components/tableau/compteur-du";
import { ListeDepots } from "@/components/tableau/liste-depots";
import { ProgressionDuCairn } from "@/components/tableau/progression-du-cairn";
import { TitreDuCairn } from "@/components/tableau/titre-du-cairn";
import { SignalDeDette } from "@/components/tableau/signal-de-dette";
import { ROUTES } from "@/lib/auth/routes";
import { lireLUtilisateur } from "@/lib/auth/session";
import { lireTableauDeBord } from "@/lib/db/tableau-de-bord";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("tableau.aujourdhui");

  return { title: t("titre") };
}

/**
 * Le tableau de bord : ce qu'il y a à faire et ce qu'on a déposé en deux
 * colonnes, puis le cairn sur la roche. Le sol est la roche, pour que la pile
 * se prolonge jusqu'en bas de la fenêtre.
 */
export default async function PageAujourdhui() {
  const utilisateur = await lireLUtilisateur();

  if (!utilisateur) redirect(ROUTES.connexion);

  const maintenant = new Date();
  const tableau = await lireTableauDeBord(utilisateur.id, maintenant);
  const t = await getTranslations("tableau.aujourdhui.cairn");

  return (
    <PileDePanneaux sol="roche">
      {/* `md:z-20` sert l'invite d'installation, qui flotte à partir de `md`
          mais vit dans ce panneau. Le panneau est un contexte d'empilement :
          le `z-30` de l'invite n'y vaut qu'à l'intérieur, et le panneau de
          roche suivant se peindrait par-dessus. C'est le panneau qu'il faut
          lever, pas l'invite. */}
      <Panneau
        surface="papier"
        className="md:py-pas-16 gap-pas-12 md:gap-pas-16 grid md:z-20 md:grid-cols-[0.8fr_1.2fr]"
      >
        <div>
          <CompteurDu
            charge={tableau.charge}
            aDesAtoms={tableau.totalAtoms > 0}
            conceptsSansQuestions={tableau.conceptsSansQuestions}
            plafond={tableau.plafond}
            faitsAujourdhui={tableau.faitsAujourdhui}
            detteSignalee={tableau.arriere.signaler}
          />

          {tableau.arriere.signaler ? (
            <div className="mt-pas-8">
              <SignalDeDette
                enAttente={tableau.charge.enAttente}
                jours={tableau.arriere.jours}
                plafond={tableau.plafond}
              />
            </div>
          ) : null}

          {/* Sous le compteur, qui reste la première chose lue, mais encore
              dans le premier écran d'un téléphone. Ici seulement : c'est
              l'écran d'entrée, où proposer d'installer ne coupe rien. */}
          <InviteInstallation />
        </div>

        <ListeDepots depots={tableau.depots} maintenant={maintenant} fuseau={tableau.fuseau} />
      </Panneau>

      <Strates de="papier" vers="roche" graine="aujourdhui-cairn" />

      {/* Marges plus amples que le rythme ordinaire : la coupe de roche est un
          changement de registre, et un titre collé dessous semble déborder de
          la jointure. L'écart avant le filet de la bande doit dépasser celui
          d'après, sinon le filet flotte au lieu de séparer. */}
      <Panneau
        surface="roche"
        remplit
        className="py-pas-12 md:py-pas-24 gap-pas-12 md:gap-pas-24 flex flex-col justify-center"
      >
        <div className="gap-pas-8 md:gap-pas-12 grid items-center md:grid-cols-[1fr_auto]">
          <div className="max-w-lg">
            <TitreDuCairn retenus={tableau.stats?.atomsConsolidated ?? 0} />
            <p className="mt-pas-4 md:mt-pas-6 text-corps md:text-h2-app leading-relaxed">
              {t("promesse")}
            </p>
            <p className="mt-pas-4 text-petit text-stone-300">{t("forme")}</p>
          </div>

          {/* `atomsConsolidated` compte aussi les archivés, qui posent une
              pierre : le nom de colonne est resté pour éviter une migration. */}
          <ColonneCairn
            retenus={tableau.stats?.atomsConsolidated ?? 0}
            graines={tableau.grainesDuCairn}
          />
        </div>

        <ProgressionDuCairn
          streak={tableau.stats?.currentStreak ?? 0}
          xp={tableau.stats?.xp ?? 0}
        />
      </Panneau>
    </PileDePanneaux>
  );
}
