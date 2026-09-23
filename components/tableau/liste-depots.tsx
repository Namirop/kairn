import Link from "next/link";
import { Image as Capture } from "lucide-react";
import { EtatVide } from "@/components/etats/etat-vide";
import { Badge } from "@/components/ui/badge";
import { ROUTES } from "@/lib/auth/routes";
import type { DepotListe } from "@/lib/db/depots";
import { compte } from "@/lib/domain/accord";
import { anciennete } from "@/lib/domain/echeance";
import { cn } from "@/lib/utils";
import { TexteTechnique } from "@/components/typographie/texte-technique";
import { conceptsLisibles, libelleEtat } from "@/lib/domain/etat-depot";

/**
 * Ce que l'utilisateur a déposé. L'étape n'apparaît que tant qu'elle a quelque
 * chose à annoncer : un dépôt prêt affiche ce qu'il a produit, pas son état.
 *
 * Le compte de concepts s'affiche dès qu'il existe, sans attendre les
 * questions — c'est le retour qui dit que le geste a servi à quelque chose.
 *
 * La couleur d'alerte est réservée à la panne. Un dépôt dont le contenu ne
 * portait rien à retenir le dit avec ses mots, en gris : rien ne s'est cassé,
 * et l'annoncer en rouge faisait passer une limite du texte pour une avarie du
 * produit.
 *
 * **D'où vient un dépôt se dit dans une gouttière, et non dans son texte.** Un
 * dépôt d'image commençait par « Capture — », collé devant le premier mot de ce
 * qu'on avait lu à l'écran : un mot du système planté dans la phrase de
 * l'utilisateur, qu'on relit deux fois avant de comprendre qu'il n'en fait pas
 * partie. C'est une propriété du dépôt, pas le début de son contenu.
 *
 * La gouttière est **réservée sur toutes les lignes**, et vide sur la plupart.
 * C'est ce qui garde un seul bord gauche au texte de la liste : ouverte
 * seulement sous les captures, elle décalerait une ligne sur dix et ferait
 * flotter les autres. Une colonne vide ne coûte qu'à la mesure ; un bord qui
 * bouge coûte à la lecture.
 *
 * Un trait plutôt qu'un émoji : la palette du produit n'a qu'un accent, et un
 * pictogramme en couleur dans une liste de papier serait le seul objet de
 * l'écran à ne pas en venir. L'icône est un cadre d'image en `stone-500`, le
 * gris des mentions — elle se voit quand on la cherche et s'efface quand on lit.
 */
function Avancement({ depot }: { depot: DepotListe }) {
  const concepts = compte(depot.nombreAtoms, "concept", "concepts");

  if (depot.etat === "echec") return <Badge variant="alerte">{libelleEtat(depot.etat)}</Badge>;

  if (depot.etat === "pret") {
    return <span className="font-mono tabular-nums">{concepts}</span>;
  }

  return (
    <>
      {conceptsLisibles(depot.etat) ? (
        <span className="font-mono tabular-nums">{concepts}</span>
      ) : null}
      <Badge variant="pose">{libelleEtat(depot.etat)}</Badge>
    </>
  );
}

export function ListeDepots({
  depots,
  maintenant,
  fuseau,
  titre = "Ce que tu as déposé",
  avecLien = true,
  surface = "papier",
}: {
  depots: DepotListe[];
  maintenant: Date;
  fuseau: string;
  /** Nul sur la page dédiée, où le titre de page dit déjà de quoi il s'agit. */
  titre?: string | null;
  avecLien?: boolean;
  /** La surface du panneau qui porte la liste : les cartes prennent l'autre. */
  surface?: "papier" | "ombre";
}) {
  return (
    <section>
      <div className="gap-pas-4 flex items-baseline justify-between">
        {titre ? (
          <h2 className="text-mono font-mono tracking-[0.14em] text-stone-500 uppercase">
            {titre}
          </h2>
        ) : (
          <span />
        )}
        {avecLien && depots.length > 0 ? (
          <Link
            href={ROUTES.depots}
            className="text-petit rounded-galet text-stone-500 underline decoration-stone-300 underline-offset-4 transition-colors hover:text-stone-900"
          >
            Tout voir
          </Link>
        ) : null}
      </div>

      {depots.length === 0 ? (
        <div className="mt-pas-4">
          <EtatVide
            constat="Tu n'as encore rien déposé."
            contexte="Une phrase, un pavé collé, une capture d'écran — tout fait un point de départ."
          />
        </div>
      ) : (
        <ul className="mt-pas-4 gap-pas-2 flex max-w-3xl flex-col">
          {depots.map((depot) => (
            <li key={depot.id}>
              <Link
                href={`${ROUTES.depots}/${depot.id}`}
                // Une carte cliquable se soulève : le survol change de surface
                // et décolle d'un cheveu, il ne baisse pas l'opacité.
                className={cn(
                  "p-pas-4 rounded-carte block transition-[transform,background-color] duration-150",
                  "hover:-translate-y-0.5 motion-reduce:hover:translate-y-0",
                  surface === "ombre"
                    ? "bg-surface-papier hover:bg-surface-papier"
                    : "bg-surface-ombre hover:bg-surface-ombre/70",
                )}
              >
                <div className="gap-pas-3 flex">
                  {/* La gouttière de provenance. Sa largeur est celle de l'icône
                      et elle ne bouge pas : c'est elle qui aligne le texte de
                      toutes les lignes, qu'elles portent une image ou non. */}
                  <span className="mt-pas-1 size-4 shrink-0">
                    {depot.sourceType === "IMAGE" ? (
                      <Capture aria-hidden className="size-4 text-stone-500" />
                    ) : null}
                  </span>

                  <div className="min-w-0 flex-1">
                    {/* Au corps de lecture : c'est le texte que la personne a
                        déposé, donc la seule raison d'être de la carte. Il était
                        en dessous de l'interface qui l'entoure — un contenu ne se
                        lit pas plus petit que le cadre qui le montre. */}
                    <p className="text-corps line-clamp-2">
                      {/* L'icône est muette pour un lecteur d'écran : c'est ici
                          que la provenance se dit, en tête du texte, comme elle
                          se lisait avant. */}
                      {depot.sourceType === "IMAGE" ? (
                        <span className="sr-only">Capture. </span>
                      ) : null}
                      {/* Les termes de code sont relevés ici comme partout où ce
                          texte se montre. L'aperçu étant coupé à sa longueur, un
                          accent grave peut se retrouver seul : il reste alors
                          littéral, ce qui est moins bruyant qu'une paire
                          affichée. */}
                      <TexteTechnique>
                        {depot.apercu || "Capture en cours de lecture"}
                      </TexteTechnique>
                    </p>
                    <p className="mt-pas-2 gap-pas-3 text-mono flex flex-wrap items-center text-stone-500">
                      <Avancement depot={depot} />
                      <span aria-hidden>·</span>
                      <span>{anciennete(depot.createdAt, maintenant, fuseau)}</span>
                    </p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
