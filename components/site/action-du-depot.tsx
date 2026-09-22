"use client";

import { Button } from "@/components/ui/button";
import { CARACTERES_MAXIMUM_ANONYME } from "@/lib/depots/bornes-du-depot";

/**
 * Au-delà, on montre le compteur : avant, il n'apprend rien à personne.
 *
 * Trois quarts du maximum, comme dans le formulaire du produit. La borne, elle,
 * est importée et non recopiée : deux nombres qui doivent être égaux et qui
 * vivent à deux endroits finissent par diverger, et c'est l'écran qui ment
 * pendant que le serveur refuse.
 */
const SEUIL_COMPTEUR = Math.floor(CARACTERES_MAXIMUM_ANONYME * 0.75);

/**
 * Le bouton, sa mention, et ce que le dépôt a à dire.
 *
 * Le bouton et sa mention restent sur une ligne : c'était un `flex-wrap`, et la
 * mention passait dessous dès qu'elle ne tenait pas — c'est-à-dire sur tous les
 * téléphones —, où elle prenait la place d'un bloc alors qu'elle n'est qu'une
 * note en marge. Sans le retour à la ligne, c'est la mention qui se plie sur
 * deux lignes étroites : le groupe se déforme au lieu de se casser.
 */
export function ActionDuDepot({
  enCours,
  trop,
  longueur,
  erreur,
  reprise,
}: {
  enCours: boolean;
  trop: boolean;
  longueur: number;
  erreur?: string;
  reprise: boolean;
}) {
  return (
    <div>
      <div className="gap-pas-3 md:gap-pas-4 flex items-center">
        <Button
          type="submit"
          size="lg"
          className="px-pas-4 text-petit md:px-pas-8 md:text-corps"
          disabled={enCours || trop}
        >
          {enCours ? "Découpage en cours…" : "Voir ce que ça donne"}
        </Button>

        {/* Le compteur ne paraît qu'à l'approche de la borne. Avant, il n'apprend
            rien et compte à voix haute pendant qu'on écrit ; après, il est la
            seule chose qui dise pourquoi le bouton refuse. Il remplace le libellé
            rassurant plutôt que de s'ajouter à côté : « sans compte, sans email »
            n'a plus rien à faire là au moment où on annonce un refus. */}
        {longueur > SEUIL_COMPTEUR ? (
          <span
            className={`text-mono min-w-0 font-mono tabular-nums ${trop ? "text-alerte" : "text-stone-500"}`}
          >
            {longueur.toLocaleString("fr-FR")} /{" "}
            {CARACTERES_MAXIMUM_ANONYME.toLocaleString("fr-FR")}
          </span>
        ) : (
          <span className="text-petit min-w-0 text-stone-500">Sans compte, sans email.</span>
        )}
      </div>

      {/* Le message n'occupe plus rien tant qu'il n'a rien à dire. Sa place était
          réservée en permanence pour une phrase qui paraît un jour sur cent, et ce
          vide-là poussait le bas du panneau vers le sol qui le termine. Il est
          **sous** le bouton, donc il ne peut de toute façon pas le décaler : il ne
          décale que ce qui vient après, à l'instant où quelqu'un lit une erreur —
          exactement le moment où un déplacement se comprend tout seul.

          `empty:` fait le travail sans condition dans le rendu : la balise reste
          en place pour que le lecteur d'écran ait quelque chose à annoncer, et
          c'est sa marge qui disparaît avec son contenu. */}
      <p className="text-petit mt-pas-2 empty:mt-0" role="status" aria-live="polite">
        {erreur ? <span className="text-alerte">{erreur}</span> : null}
        {!erreur && reprise ? (
          <span className="text-stone-500">
            Ce que tu viens de voir reste à toi : tu le récupères aussi en créant ton compte.
          </span>
        ) : null}
      </p>
    </div>
  );
}
