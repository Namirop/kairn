import { Badge } from "@/components/ui/badge";
import { accord, compte } from "@/lib/domain/accord";

/**
 * Le rappel, en tête d'un dépôt, qu'il reste des concepts à trancher.
 *
 * **Sans lui, le marqueur ne se voyait que par hasard.** Un concept douteux
 * porte son badge et son explication, mais dans la liste — et sur un dépôt de
 * trente-six concepts, la liste commence après le texte déposé. Quelqu'un qui ne
 * défile pas jusqu'au bout ne sait pas qu'il a quatre concepts en attente, ni
 * qu'ils resteront sans questions tant qu'il ne les aura pas regardés. C'est le
 * seul état du produit qui demande une action et qui pouvait passer inaperçu.
 *
 * **Il dit la conséquence, pas l'injonction.** « Va les vérifier » commande ;
 * « ils restent sans questions » informe, et laisse décider. C'est aussi
 * l'information utile : un concept douteux n'est pas cassé, il est simplement
 * hors du cycle jusqu'à ce qu'on tranche.
 *
 * **Le badge est le même que sur les cartes**, et c'est sa fonction : il apprend
 * quoi chercher en défilant. Reproduire ici une pastille d'une autre forme
 * obligerait à faire le lien soi-même.
 *
 * Le lien est une ancre, pas un bouton. Il ne déclenche rien, il déplace le
 * regard — et sur un dépôt qui en porte plusieurs, c'est au premier qu'on veut
 * aller, les autres se suivant dans l'ordre du texte.
 */

/** L'ancre posée sur le premier concept douteux, et visée par le lien. */
export const ANCRE_A_VERIFIER = "a-verifier";

export function ConceptsAVerifier({ nombre }: { nombre: number }) {
  if (nombre <= 0) return null;

  return (
    <p className="mt-pas-3 gap-pas-2 text-petit flex flex-wrap items-baseline justify-center text-stone-500 md:justify-start">
      <Badge variant="alerte">À vérifier</Badge>
      <span>
        {compte(nombre, "concept paraît douteux", "concepts paraissent douteux")}. Tant que tu ne{" "}
        {accord(nombre, "l'as pas tranché", "les as pas tranchés")},{" "}
        {accord(nombre, "il reste", "ils restent")} sans questions.{" "}
        <a
          href={`#${ANCRE_A_VERIFIER}`}
          className="rounded-galet text-stone-900 underline decoration-stone-300 underline-offset-4 transition-colors hover:decoration-stone-900"
        >
          {accord(nombre, "Le voir", "Voir le premier")}
        </a>
      </span>
    </p>
  );
}
