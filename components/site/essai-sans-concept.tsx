import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/auth/routes";
import { CARACTERES_MAXIMUM, longueurEnClairAvec } from "@/lib/depots/bornes-du-depot";
import type { AvancementDeLEssai } from "@/lib/depots/essai-en-cours";
import type { Messages } from "@/lib/i18n/messages";

/**
 * L'essai n'a rien donné : panne ou rejet, avec ou sans essai restant. Une
 * panne vient de nous, jamais « change ton texte » ; sans reprise, le compte
 * est offert pour revenir plus tard, sans prétendre garder des concepts qui
 * n'existent pas. Un rejet montre le motif du modèle.
 *
 * Le titre est fixe, jamais `motifDechec` : une phrase de modèle de longueur
 * inconnue ne tient pas dans un display.
 */
type Cle = keyof Messages["site"]["sansConcept"];

/** Le constat est une clé, ou le motif écrit par le modèle quand il y en a un. */
type Situation = { titre: Cle; constat: Cle | { motif: string }; explication: Cle };

const VIENT_DE_NOUS = "vientDeNous";

function situationDeLEchec(
  panne: boolean,
  peutRedeposer: boolean,
  motifDechec: string | null,
): Situation {
  if (panne && peutRedeposer) {
    return {
      titre: VIENT_DE_NOUS,
      constat: "panneConstat",
      explication: "panneExplication",
    };
  }

  if (panne) {
    return {
      titre: VIENT_DE_NOUS,
      constat: "indisponibleConstat",
      explication: "indisponibleExplication",
    };
  }

  const constat: Situation["constat"] = motifDechec ? { motif: motifDechec } : "rienConstat";

  if (peutRedeposer) {
    return {
      titre: "rienTitre",
      constat,
      explication: "rienRetenter",
    };
  }

  return {
    titre: "rienTitre",
    constat,
    explication: "rienCompte",
  };
}

export function EssaiSansConcept({
  avancement,
  surRedepot,
}: {
  avancement: AvancementDeLEssai;
  surRedepot: () => void;
}) {
  const { panne, peutRedeposer, motifDechec } = avancement;
  const t = useTranslations("site.sansConcept");
  const tRefus = useTranslations("depots.refus");
  const situation = situationDeLEchec(panne, peutRedeposer, motifDechec);
  // Même tournure que les refus du dépôt.
  const compte = longueurEnClairAvec(tRefus, CARACTERES_MAXIMUM);
  const constat =
    typeof situation.constat === "string" ? t(`${situation.constat}`) : situation.constat.motif;

  return (
    <div className="gap-pas-4 flex flex-col" role="status">
      <h2 className="font-display text-h2-site leading-[1] font-bold tracking-[-0.02em] text-stone-50">
        {t(`${situation.titre}`)}
      </h2>

      <p className="text-corps max-w-xl text-stone-50">{constat}</p>

      <p className="text-petit max-w-xl text-stone-300">
        {t(`${situation.explication}`, { compte })}
      </p>

      <div className="mt-pas-2">
        {peutRedeposer ? (
          <Button type="button" size="lg" variant="outlineClair" onClick={surRedepot}>
            {t("reessayer")}
          </Button>
        ) : (
          <Button asChild size="lg" variant="clair">
            <Link href={ROUTES.connexion}>{t("creerCompte")}</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
