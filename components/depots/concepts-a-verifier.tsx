import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";

/**
 * Le rappel, en tête d'un dépôt, qu'il reste des concepts à trancher : sur un
 * long dépôt, les concepts douteux sont loin dans la liste, et ils restent sans
 * questions tant qu'on ne les a pas regardés.
 *
 * Le badge est le même que sur les cartes : il apprend quoi chercher en
 * défilant. Le lien est une ancre vers le premier concept douteux, insécable
 * pour ne pas se couper en deux sur téléphone.
 */

/** L'ancre posée sur le premier concept douteux, et visée par le lien. */
export const ANCRE_A_VERIFIER = "a-verifier";

export function ConceptsAVerifier({ nombre }: { nombre: number }) {
  const t = useTranslations("depots.depot.aVerifier");

  if (nombre <= 0) return null;

  return (
    <p className="mt-pas-3 gap-pas-2 text-petit flex flex-wrap items-baseline justify-center text-stone-500 md:justify-start">
      <Badge variant="alerte">{t("badge")}</Badge>
      <span>
        {t("constat", { nombre })}{" "}
        <a
          href={`#${ANCRE_A_VERIFIER}`}
          className="rounded-galet whitespace-nowrap text-stone-900 underline decoration-stone-300 underline-offset-4 transition-colors hover:decoration-stone-900"
        >
          {t("voir", { nombre })}
        </a>
      </span>
    </p>
  );
}
