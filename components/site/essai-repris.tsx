"use client";

import Link from "next/link";
import { Cairn } from "@/components/cairn/cairn";
import { Apparition, Temps } from "@/components/site/apparition";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/auth/routes";

/**
 * Ce que la bande garde quand la fenêtre de l'essai est fermée.
 *
 * Le découpage a donné quelque chose, et il faut que la page le dise : sans
 * rappel, fermer la fenêtre effacerait le résultat, et revenir sur le site dans
 * les sept jours du cookie retomberait sur un champ vide alors que les concepts
 * sont là.
 *
 * **C'est un rappel, pas une seconde copie du résultat.** La tentation était de
 * remettre la liste des concepts et l'échantillon dans la bande, ce qui aurait
 * demandé de rendre tout l'arbre sur deux surfaces — et aurait rendu à la bande
 * le défaut qu'on vient de lui retirer, celui d'être plusieurs mises en page à
 * la fois. Ici il n'y a que ce qui sert à décider : combien, l'appel à garder,
 * et de quoi rouvrir.
 *
 * **Le cairn fait le lien.** C'est le même empilement que dans la fenêtre,
 * dessiné à partir des mêmes identifiants, donc exactement la même figure :
 * rouvrir ne donne pas l'impression d'ouvrir autre chose.
 *
 * Il porte la charpente du formulaire qu'il remplace — titre à gauche, contenu à
 * droite, même mesure, même grille. La bande ne change pas de forme selon son
 * état : c'est tout l'objet de la manœuvre.
 */
export function EssaiRepris({
  concepts,
  peutRedeposer,
  surRevoir,
  surRedepot,
  prendLeFocus,
}: {
  /** Les identifiants des concepts : le cairn s'en sert pour ses formes. */
  concepts: string[];
  peutRedeposer: boolean;
  surRevoir: () => void;
  surRedepot: () => void;
  /**
   * Le rappel vient de remplacer une fenêtre qu'on ferme, et le clavier doit
   * suivre. Sans ça, Radix rend le focus à un bouton d'envoi qui n'existe plus
   * et il retombe sur le corps du document : on repart du haut de la page.
   *
   * Faux au chargement d'une visite qui revient — prendre le focus ferait
   * défiler la page jusqu'ici avant qu'on ait rien demandé.
   */
  prendLeFocus: boolean;
}) {
  const combien = concepts.length;

  return (
    <div className="gap-pas-8 md:gap-pas-12 grid md:grid-cols-[1fr_minmax(0,36rem)]">
      <Apparition>
        <Temps>
          <h2 className="font-display text-h2-site leading-[1] font-bold tracking-[-0.02em] tabular-nums">
            {combien} {combien === 1 ? "concept" : "concepts"}
            <br />
            {combien === 1 ? "t'attend." : "t'attendent."}
          </h2>
        </Temps>

        <Temps className="mt-pas-6">
          <Cairn nombre={combien} graines={concepts} className="h-auto w-20 md:w-28" />
        </Temps>
      </Apparition>

      <Apparition>
        <Temps>
          <p className="text-stone-500">
            On les a sortis de ce que tu viens de déposer. Ton adresse suffit pour qu&apos;on te les
            repose au bon moment, et tu récupères ceux-ci.
          </p>
        </Temps>

        <Temps className="mt-pas-6 md:mt-pas-8">
          <div className="gap-pas-3 md:gap-pas-4 flex flex-wrap items-center">
            <Button asChild size="lg">
              <Link href={ROUTES.connexion}>Les garder</Link>
            </Button>

            <Button type="button" variant="outline" onClick={surRevoir} autoFocus={prendLeFocus}>
              Revoir les concepts
            </Button>
          </div>
        </Temps>

        {peutRedeposer ? (
          <Temps className="mt-pas-4">
            <Button type="button" variant="link" size="sm" className="px-0" onClick={surRedepot}>
              Déposer autre chose
            </Button>
          </Temps>
        ) : null}
      </Apparition>
    </div>
  );
}
