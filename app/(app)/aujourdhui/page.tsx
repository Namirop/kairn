import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Panneau } from "@/components/coquille/panneau";
import { PileDePanneaux } from "@/components/coquille/pile-de-panneaux";
import { Strates } from "@/components/coquille/strates";
import { InviteInstallation } from "@/components/pwa/invite-installation";
import { ColonneCairn } from "@/components/tableau/colonne-cairn";
import { CompteurDu } from "@/components/tableau/compteur-du";
import { ListeDepots } from "@/components/tableau/liste-depots";
import { ProgressionDuCairn } from "@/components/tableau/progression-du-cairn";
import { SignalDeDette } from "@/components/tableau/signal-de-dette";
import { ROUTES } from "@/lib/auth/routes";
import { getCurrentUser } from "@/lib/auth/session";
import { lireTableauDeBord } from "@/lib/db/tableau-de-bord";

export const metadata: Metadata = { title: "Aujourd'hui" };

/**
 * Le tableau de bord, en deux panneaux.
 *
 * Ce qu'il y a à faire et ce qu'on a déposé partagent le premier : deux
 * colonnes, parce que le compteur seul laissait les trois quarts d'un écran
 * large vides pendant que la liste attendait plus bas. Le second porte le
 * cairn, sur la roche — l'un des deux panneaux sombres du produit.
 *
 * Le sol est la roche : la pile se prolonge jusqu'en bas de la fenêtre au lieu
 * de s'arrêter sur une bande d'une autre couleur.
 */
export default async function PageAujourdhui() {
  const utilisateur = await getCurrentUser();

  if (!utilisateur) redirect(ROUTES.connexion);

  const maintenant = new Date();
  const tableau = await lireTableauDeBord(utilisateur.id, maintenant);

  return (
    <PileDePanneaux sol="roche">
      {/* `md:z-20` porte l'invite d'installation, et rien d'autre.

          Elle flotte au-dessus de la fenêtre à partir de `md`, mais elle vit
          dans ce panneau — parce que sur téléphone elle est dans le flux, juste
          sous le compteur. Or le contenu d'un panneau est un contexte
          d'empilement à lui seul : le `z-30` de l'invite ne vaut qu'à
          l'intérieur de celui-ci, et le panneau de roche qui suit, à rang égal
          mais plus loin dans le balisage, se peignait par-dessus elle. C'est le
          panneau qu'il faut lever, pas l'invite. */}
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
          />

          {tableau.arriere.signaler ? (
            <div className="mt-pas-8">
              <SignalDeDette enAttente={tableau.charge.enAttente} jours={tableau.arriere.jours} />
            </div>
          ) : null}

          {/* Sous le compteur, pas au-dessus. Ce qu'il y a à revoir aujourd'hui
              reste la première chose lue — c'est la raison d'ouvrir
              l'application, et une invite posée devant elle ferait passer
              l'accessoire avant le sujet. Juste après, en revanche, elle est
              dans le premier écran d'un téléphone et personne ne peut la rater.

              Ici et nulle part ailleurs : c'est le seul écran par lequel on
              entre, et le seul où proposer d'installer ne coupe pas quelque
              chose en cours. */}
          <InviteInstallation />
        </div>

        <ListeDepots depots={tableau.depots} maintenant={maintenant} fuseau={tableau.fuseau} />
      </Panneau>

      <Strates de="papier" vers="roche" graine="aujourdhui-cairn" />

      {/* Deux étages plutôt qu'une seule rangée : la promesse et le cairn en
          haut, la progression en bande dessous. Le tiers bas de ce panneau était
          vide, et c'est le plus grand de l'application — les deux mesures y
          gagnent la largeur qu'elles n'avaient pas dans la colonne, et le cairn
          redescend à hauteur du texte qu'il accompagne. */}
      {/* Deux respirations, plus amples que le rythme ordinaire d'un écran. La
          coupe de roche qui ouvre le panneau est un changement de registre, pas
          un simple séparateur : coller le titre dessous donnait l'impression que
          le contenu débordait de la jointure. Et l'écart qui précède le filet de
          la bande doit être plus grand que celui qui le suit, sans quoi le filet
          flotte entre deux blocs au lieu d'en séparer un du suivant. */}
      <Panneau
        surface="roche"
        remplit
        className="py-pas-12 md:py-pas-24 gap-pas-16 md:gap-pas-24 flex flex-col justify-center"
      >
        <div className="gap-pas-8 md:gap-pas-12 grid items-center md:grid-cols-[1fr_auto]">
          <div className="max-w-lg">
            <h2 className="text-mono font-mono tracking-[0.14em] text-stone-300 uppercase">
              Ton cairn
            </h2>
            {/* Le texte qui porte la promesse du produit monte au registre d'un
                titre de section sur grand écran, et reste au corps sur mobile où
                il tenait déjà la largeur. */}
            <p className="mt-pas-4 md:mt-pas-6 text-corps md:text-h2-app leading-relaxed">
              Une pierre par concept retenu : quand il revient de loin et que tu le retrouves
              trois fois de suite, ou quand tu déclares le maîtriser. Pas quand tu l&apos;as lu.
            </p>
            <p className="mt-pas-4 text-petit text-stone-300">
              La forme de chaque pierre est tirée du concept qu&apos;elle représente. Personne
              n&apos;empile les mêmes.
            </p>
          </div>

          {/* `atomsConsolidated` est le nom de la colonne, pas celui de ce
              qu'elle compte : depuis que l'archivé pose une pierre lui aussi,
              elle porte les deux états. Renommer la colonne demanderait une
              migration pour un mot. */}
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
