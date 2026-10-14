import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/auth/routes";
import { CARACTERES_MAXIMUM, longueurEnClairAvec } from "@/lib/depots/bornes-du-depot";
import type { AvancementDeLEssai } from "@/lib/depots/essai-en-cours";
import type { Messages } from "@/lib/i18n/messages";

/**
 * L'essai n'a rien donné. Quatre situations : panne ou rejet, croisé avec le
 * fait qu'il reste ou non de quoi retenter.
 *
 * - Panne, avec une reprise : ça vient de nous, et surtout pas « change ton
 *   texte ».
 * - Panne, sans reprise : toujours pas sa faute ; le compte est offert pour
 *   reprendre plus tard, pas pour garder des concepts qui n'existent pas.
 * - Rejet, avec un essai : le motif du modèle dit ce qui manquait.
 * - Rejet, sans essai : le motif reste, et le compte est proposé sans
 *   prétendre qu'il y a quelque chose à récupérer.
 *
 * Rendu dans la fenêtre de l'essai, donc aux encres de la roche. Le titre est
 * fixe, jamais `motifDechec` : une phrase de modèle de longueur inconnue ne
 * tient pas dans un display ; elle garde le corps.
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
  // La longueur se dit comme dans les refus du dépôt : une seule tournure.
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
