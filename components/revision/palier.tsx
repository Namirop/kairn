import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

/**
 * Un palier : l'écran sur lequel on tombe quand il n'y a pas de question à poser.
 *
 * C'est un même moment sous plusieurs noms — la journée est faite, il n'y a rien
 * à revoir, la session vient de se terminer, le tour d'entraînement s'arrête. Ils
 * étaient dessinés chacun de leur côté, avec un titre au corps d'un titre de
 * page, posé en haut à gauche d'un écran vide : à côté d'une session dont le
 * contenu occupe toute la hauteur, ils avaient l'air d'une page qui n'a pas fini
 * de charger.
 *
 * Ils sont donc centrés, dans les deux sens, et leur titre porte le corps d'un
 * titre de campagne. C'est le seul écran de l'application où presque rien n'est
 * affiché : si le titre ne porte pas le vide, rien ne le portera, et la
 * tentation serait d'ajouter une illustration pour compenser.
 *
 * Rien n'y est ajouté pour faire nombre. Un palier dit ce qui s'est passé, ce
 * qu'on peut faire ensuite, et s'arrête là — c'est une halte, pas une
 * récompense : on ne félicite pas quelqu'un d'être venu.
 */

export type Lien = { libelle: string; href: string };

export function Palier({
  intitule,
  titre,
  explication,
  action,
  secondaire,
  bouton,
  note,
  pied,
  children,
}: {
  /** Ce que ce palier clôt, en petites capitales. Facultatif. */
  intitule?: string;
  titre: string;
  /** Ce qui s'est passé et ce qui vient. Une phrase, deux au plus. */
  explication?: ReactNode;
  action?: Lien;
  secondaire?: Lien;
  /** Une action qui ne mène pas ailleurs — reprendre un tour, par exemple. */
  bouton?: ReactNode;
  /** La précision qui suit les actions, quand l'une d'elles en demande une. */
  note?: string;
  /** La porte de sortie discrète, sous tout le reste. */
  pied?: ReactNode;
  /** Ce que ce palier ajoute entre l'explication et les actions. */
  children?: ReactNode;
}) {
  return (
    <section className="flex w-full flex-col items-center text-center">
      {intitule ? (
        <p className="text-mono mb-pas-4 font-mono tracking-[0.14em] text-stone-500 uppercase">
          {intitule}
        </p>
      ) : null}

      <h1 className="font-display text-h2-site leading-[1.05] font-bold tracking-[-0.02em] text-balance text-stone-900">
        {titre}
      </h1>

      {explication ? (
        <p className="mt-pas-6 text-corps max-w-lg leading-relaxed text-pretty text-stone-500">
          {explication}
        </p>
      ) : null}

      {children}

      {action || bouton ? (
        <div className="gap-pas-3 mt-pas-12 flex flex-col sm:flex-row">
          {bouton}

          {action ? (
            <Button asChild>
              <Link href={action.href}>{action.libelle}</Link>
            </Button>
          ) : null}

          {secondaire ? (
            <Button asChild variant="outline">
              <Link href={secondaire.href}>{secondaire.libelle}</Link>
            </Button>
          ) : null}
        </div>
      ) : null}

      {note ? (
        <p className="mt-pas-4 text-petit max-w-md text-pretty text-stone-500">{note}</p>
      ) : null}

      {pied ? <div className="mt-pas-8">{pied}</div> : null}
    </section>
  );
}
