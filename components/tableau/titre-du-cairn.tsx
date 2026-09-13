import { IndiceTactile, Infobulle } from "@/components/ui/infobulle";

/**
 * Le titre de la section, et ce qu'il explique.
 *
 * **La fiche était accrochée au dessin, et elle y était mal.** L'indice tactile
 * flottait sous l'empilement, au milieu d'un panneau, sans rien contre quoi se
 * poser — et la fiche qui s'ouvrait dessous recouvrait le filet de la bande de
 * progression. Un point d'interrogation au milieu du vide ne se rattache à rien,
 * et on ne sait pas de quoi il parle avant de l'avoir touché.
 *
 * Contre le titre de la section, il se lit tout seul : c'est là qu'on cherche
 * « qu'est-ce que c'est, ça ? », et c'est l'endroit conventionnel d'une marque
 * d'explication. Le dessin, lui, redevient un dessin.
 *
 * Le compte reste dit sans toucher à rien pour qui ne touche à rien : `Cairn`
 * porte son `aria-label`, et il énonce le nombre de pierres.
 */

/**
 * « Retenu » et non « consolidé » : le cairn compte deux états, la
 * consolidation que le produit constate et l'archivage que l'utilisateur
 * déclare. Voir `ETATS_QUI_POSENT_UNE_PIERRE`.
 */
function legende(retenus: number): string {
  if (retenus === 0) return "Le premier concept retenu posera la première pierre.";

  return `${retenus} ${retenus === 1 ? "concept retenu" : "concepts retenus"}. Une pierre chacun.`;
}

export function TitreDuCairn({ retenus }: { retenus: number }) {
  return (
    <h2 className="text-mono font-mono tracking-[0.14em] text-stone-300 uppercase">
      <Infobulle
        className="rounded-galet gap-pas-1 inline-flex items-center"
        contenu={legende(retenus)}
      >
        Ton cairn
        <IndiceTactile className="ml-0 text-stone-400" />
      </Infobulle>
    </h2>
  );
}
