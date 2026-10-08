"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { SymboleDeMarque } from "@/components/coquille/symbole-de-marque";
import { Button } from "@/components/ui/button";
import { GesteManuel } from "./gestes-manuels";
import { useInstallation } from "./use-installation";

/**
 * L'invite à poser Kairn sur l'écran d'accueil.
 *
 * **Sur téléphone elle est dans la page ; sur grand écran elle flotte en bas à
 * droite.** C'était une barre flottante partout, et le défaut était mobile : elle
 * se posait sur la barre de navigation, elle suivait pendant une session de
 * révision, et une chose qui suit sans qu'on l'ait demandée se ferme sans qu'on
 * l'ait lue. Rien de tout ça sur un écran large — pas de barre système en bas,
 * pas de zone du pouce à protéger, et un angle qui ne dispute sa place à personne.
 * Dans le flux, en revanche, le bloc coupait le tableau de bord en deux juste
 * sous le compteur du jour : une proposition secondaire installée à l'endroit le
 * plus lu de l'écran. Elle occupe donc une place là où la place existe, et un
 * angle là où le flux est précieux.
 *
 * Aucun filet pour la détacher du fond : c'est `surface-ombre` posée sur le
 * papier qui la sépare, exactement ce que la table des surfaces prévoit pour un
 * objet posé sur cette surface-là.
 *
 * **Elle montre ce qu'elle propose.** Une pastille avec le symbole, à la taille
 * et à l'arrondi d'une icône d'écran d'accueil : c'est littéralement ce qui se
 * posera. Une flèche de téléchargement aurait décrit un mécanisme ; celle-ci
 * montre le résultat, et elle est le seul objet de ce bloc qui ne soit pas du
 * texte.
 *
 * Aucun accent. Le lichen de cet écran appartient au compteur du jour — c'est lui
 * qui doit attirer l'œil en premier, et une seconde tache de couleur en ferait
 * deux qui se disputent.
 */
export function InviteInstallation() {
  const { mode, installer, ecarter, confirmer } = useInstallation();
  const t = useTranslations("tableau.commun.installation");

  if (mode === "aucune") return null;

  return (
    // L'écart au-dessus est porté ici et non par la page. Le bloc disparaît
    // pour qui a déjà installé, pour qui a refusé et pour tout navigateur qui ne
    // sait pas installer — c'est-à-dire la plupart du temps — et une marge posée
    // sur un conteneur parent laisserait ces jours-là un trou de deux pas sous le
    // compteur, sans rien dedans et sans rien pour l'expliquer. Au-delà de `md`
    // il n'y a plus d'écart du tout : le bloc quitte le flux.
    <aside className="mt-pas-8 rounded-carte bg-surface-ombre p-pas-6 md:right-pas-6 md:bottom-pas-6 relative text-left md:fixed md:z-30 md:mt-0 md:w-[22rem]">
      <button
        type="button"
        onClick={ecarter}
        aria-label={t("ecarter")}
        className="top-pas-3 right-pas-3 p-pas-1 rounded-galet hover:bg-surface-papier absolute text-stone-500 transition-colors hover:text-stone-900"
      >
        <X className="size-4" />
      </button>

      <div className="gap-pas-4 flex items-start">
        <span
          aria-hidden
          className="bg-surface-papier rounded-champ flex size-12 shrink-0 items-center justify-center"
        >
          <SymboleDeMarque pierres={3} taille={26} />
        </span>

        <div className="pr-pas-6 min-w-0 flex-1">
          <p className="font-medium">{t("titre")}</p>
          <p className="mt-pas-1 text-petit text-stone-500">{t("texte")}</p>
        </div>
      </div>

      {mode === "automatique" ? (
        <Button className="mt-pas-4" onClick={installer}>
          {t("installer")}
        </Button>
      ) : (
        <>
          <GesteManuel geste={mode} />

          {/* Le seul moyen de savoir, là où l'appareil ne le dit pas.
              Un navigateur qui déclenche l'installation lui-même annonce
              `appinstalled` juste après, et l'invite disparaît sans qu'on
              demande rien. Ces deux chemins-ci n'annoncent rien : sur un iPhone,
              l'application posée sur l'écran d'accueil a son propre bac à sable,
              et rien de ce qu'elle écrit n'est visible depuis Safari. On
              continuait donc à proposer l'installation à quelqu'un qui venait de
              la faire — exactement ce que l'invite prétend éviter.

              C'est écrit comme un constat et non comme une action : « C'est
              fait » répond aux deux lignes juste au-dessus. Un bouton
              « Terminer » aurait laissé croire qu'il finit l'installation. */}
          <button
            type="button"
            onClick={confirmer}
            className="mt-pas-4 text-petit rounded-xs text-stone-900 underline decoration-stone-300 underline-offset-4 transition-colors hover:decoration-stone-900"
          >
            {t("cestFait")}
          </button>
        </>
      )}
    </aside>
  );
}
