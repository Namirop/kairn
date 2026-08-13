import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { avancementDuNiveau } from "@/lib/domain/progression";

/**
 * Ce que la progression vaut, sous le cairn.
 *
 * Trois lignes de la même taille tassées dans un coin disaient que rien de tout
 * ça n'avait d'importance — alors que c'est la seule récompense du produit : on
 * ne félicite jamais quelqu'un pour une bonne réponse, on lui montre ce qu'il a
 * construit. Une récompense qu'on chuchote ne récompense pas.
 *
 * Deux mesures, deux traitements, parce qu'elles ne disent pas la même chose.
 * **La série** est un nombre qu'on regarde : elle passe au grand chiffre, en
 * display, et garde l'ember — c'est la seule occurrence du produit, et elle est
 * ici. **Le niveau** est un chemin : il lui fallait sa part parcourue, parce que
 * « Niveau 2 · 34 XP » ne situe rien. La barre est en gris et jamais en accent :
 * sur ce panneau, le lichen appartient au sommet du cairn.
 *
 * Rien n'est mis en carte. Trois cartes côte à côte auraient donné le même poids
 * à trois choses inégales, et posé des contenants sur le seul panneau du produit
 * qui n'en porte aucun.
 */

function Serie({ streak }: { streak: number }) {
  if (streak === 0) {
    return (
      <div>
        <p className="text-mono font-mono tracking-[0.14em] text-stone-400 uppercase">Série</p>
        <p className="mt-pas-2 text-petit text-stone-300">
          Une session aujourd&apos;hui ouvre ta série.
        </p>
      </div>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger className="rounded-galet block text-left">
        <p className="text-mono font-mono tracking-[0.14em] text-stone-400 uppercase">Série</p>
        <p className="font-display text-h1-app text-ember-clair mt-pas-1 leading-none font-medium tabular-nums">
          {streak}
        </p>
        <p className="text-mono text-ember-clair mt-pas-1 font-mono tracking-[0.14em] uppercase">
          {streak === 1 ? "jour d'affilée" : "jours d'affilée"}
        </p>
      </TooltipTrigger>
      <TooltipContent>
        Nombre de jours consécutifs avec au moins un passage, dans ton fuseau horaire.
      </TooltipContent>
    </Tooltip>
  );
}

function Niveau({ xp }: { xp: number }) {
  const { niveau, part, restant } = avancementDuNiveau(xp);

  return (
    <Tooltip>
      <TooltipTrigger className="rounded-galet block w-full text-left">
        <p className="text-mono font-mono tracking-[0.14em] text-stone-400 uppercase">Niveau</p>
        <p className="font-display text-h1-app mt-pas-1 leading-none font-medium tabular-nums">
          {niveau}
        </p>

        {/* La strate qui se remplit. Pleine largeur et à angles vifs plutôt
            qu'une gouttière arrondie : c'est une couche qui monte, pas une jauge
            de tableau de bord.

            Le fond est en `stone-500` et non dans le gris des séparateurs : un
            rail invisible ne dit pas ce qui reste, et c'est justement ce qu'on
            est venu montrer. Quatre pixels, sans quoi ni le rail ni le remplissage
            ne se lisent au début d'un palier. */}
        <span aria-hidden className="mt-pas-3 block h-1 w-full overflow-hidden bg-stone-500">
          <span
            className="block h-full bg-stone-50"
            style={{ width: `${Math.round(part * 100)}%` }}
          />
        </span>

        <p className="text-mono mt-pas-2 font-mono text-stone-400 tabular-nums">
          {restant} XP avant le niveau {niveau + 1}
        </p>
      </TooltipTrigger>
      <TooltipContent>
        Un point par question passée en session, un de plus quand tu retrouves un concept que tu
        avais raté. La justesse n&apos;entre pas dans le calcul.
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Les deux mesures restent côte à côte dès le mobile : empilées, elles rendaient
 * une colonne d'étiquettes qui n'en finissait plus sous le cairn. C'est la
 * gouttière qui se resserre à la place.
 */
export function ProgressionDuCairn({ streak, xp }: { streak: number; xp: number }) {
  return (
    <div className="mt-pas-8 gap-pas-4 md:gap-pas-8 pt-pas-6 grid w-full grid-cols-2 items-start border-t border-stone-700">
      <Serie streak={streak} />
      <Niveau xp={xp} />
    </div>
  );
}
