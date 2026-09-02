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
 *
 * L'emblème ne contredit pas cette règle, il la sert. Un palier peut poser
 * au-dessus de son titre l'objet qui **est** ce qui vient de se passer — la pile
 * qu'on a montée, pas une illustration de la montée. C'est de l'information
 * dessinée : elle dit en un regard ce que le titre dit en un compte, et elle
 * n'ajoute pas un mot. Un palier qui n'a rien de tel à montrer n'en met pas.
 */

export type Lien = {
  libelle: string;
  href: string;
  /**
   * Ce que cette action-là fait, en une phrase, posée sous elle.
   *
   * **Elle appartient à l'action et non au palier**, et c'est la correction :
   * posée sous les deux boutons, « D'autres questions sur les mêmes concepts »
   * était à égale distance de « Déposer autre chose » et de « S'entraîner », et
   * on ne savait pas lequel des deux elle décrivait. La proximité est ce qui dit
   * l'appartenance ; il n'y avait pas de proximité à lire.
   */
  precision?: string;
};

/**
 * Une action du palier : son bouton, et ce qu'elle fait juste dessous.
 *
 * La précision est serrée contre son bouton — deux pas, quand les deux actions
 * en sont séparées de six. C'est ce rapport de un à trois qui dit à quoi elle se
 * rapporte, et il ne se lit que par contraste : à un contre deux, l'œil hésitait
 * encore.
 */
function ActionDePalier({ lien, contour = false }: { lien: Lien; contour?: boolean }) {
  return (
    <Button asChild variant={contour ? "outline" : "default"}>
      <Link href={lien.href}>{lien.libelle}</Link>
    </Button>
  );
}

export function Palier({
  embleme,
  intitule,
  titre,
  explication,
  action,
  secondaire,
  bouton,
  pied,
  children,
}: {
  /**
   * L'objet qui montre ce qui vient de se passer, posé au-dessus du titre.
   *
   * Réservé à ce qui informe : une pile qu'on a montée, pas un pictogramme de
   * félicitation. Sans quoi c'est une illustration pour combler le vide, et le
   * titre est là pour ça.
   */
  embleme?: ReactNode;
  /** Ce que ce palier clôt, en petites capitales. Facultatif. */
  intitule?: string;
  titre: string;
  /** Ce qui s'est passé et ce qui vient. Une phrase, deux au plus. */
  explication?: ReactNode;
  action?: Lien;
  secondaire?: Lien;
  /** Une action qui ne mène pas ailleurs — reprendre un tour, par exemple. */
  bouton?: ReactNode;
  /** La porte de sortie discrète, sous tout le reste. */
  pied?: ReactNode;
  /** Ce que ce palier ajoute entre l'explication et les actions. */
  children?: ReactNode;
}) {
  const precisions = [action, secondaire]
    .map((lien) => lien?.precision)
    .filter((precision): precision is string => Boolean(precision));

  return (
    <section className="flex w-full flex-col items-center text-center">
      {embleme ? <div className="mb-pas-6 md:mb-pas-8">{embleme}</div> : null}

      {intitule ? (
        <p className="text-mono mb-pas-4 font-mono tracking-[0.14em] text-stone-500 uppercase">
          {intitule}
        </p>
      ) : null}

      <h1 className="font-display text-h2-site leading-[1.05] font-bold tracking-[-0.02em] text-balance text-stone-900">
        {titre}
      </h1>

      {explication ? (
        <p className="mt-pas-4 md:mt-pas-6 text-corps max-w-lg leading-relaxed text-pretty text-stone-500">
          {explication}
        </p>
      ) : null}

      {children}

      {action || bouton ? (
        /* Les actions forment une paire : mêmes dimensions, même ligne de base.
           Chacune portait sa propre précision en dessous, et comme une seule en
           a une, une colonne faisait trois lignes quand l'autre en faisait une —
           la précision étant plus large que les deux boutons réunis, le centre
           optique de la rangée glissait vers elle, et le lien de pied restait
           centré sur une page dont plus rien ne l'était. */
        <div className="gap-pas-3 sm:gap-pas-4 mt-pas-8 md:mt-pas-12 flex flex-col items-center sm:flex-row">
          {bouton}

          {action ? <ActionDePalier lien={action} /> : null}

          {secondaire ? <ActionDePalier lien={secondaire} contour /> : null}
        </div>
      ) : null}

      {/* Les précisions vivent sous la paire, jamais sous un bouton. Elles y
          restent lisibles parce qu'elles nomment l'action dont elles parlent :
          « S'entraîner pose d'autres questions… » se rattache tout seul, là où
          « D'autres questions… » avait besoin d'être posé juste dessous pour
          qu'on sache de quoi il s'agissait. */}
      {precisions.length > 0 ? (
        <div className="gap-pas-1 mt-pas-4 flex max-w-md flex-col">
          {precisions.map((precision) => (
            <p key={precision} className="text-petit text-pretty text-stone-500">
              {precision}
            </p>
          ))}
        </div>
      ) : null}

      {pied ? <div className="mt-pas-6 md:mt-pas-8">{pied}</div> : null}
    </section>
  );
}
