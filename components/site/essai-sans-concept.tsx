import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/auth/routes";
import { CARACTERES_MAXIMUM, longueurEnClairAvec } from "@/lib/depots/bornes-du-depot";
import type { AvancementDeLEssai } from "@/lib/depots/essai-en-cours";
import type { Messages } from "@/lib/i18n/messages";

/**
 * L'essai n'a rien donné. **Quatre** situations, et elles ne se confondent pas.
 *
 * Deux causes qui ne s'imputent pas à la même personne, croisées avec le fait
 * qu'il reste ou non de quoi retenter. La fonction n'en couvrait que trois, et
 * la manquante était la plus contradictoire de toutes : « cet essai ne t'est pas
 * compté » sous un bouton qui referme la visite. On annonçait la gratuité et on
 * fermait la porte dans la même phrase.
 *
 * **Panne, avec une reprise.** Rien à demander à quelqu'un qui n'y est pour
 * rien : on dit que ça vient de nous, et surtout pas de changer son texte — il
 * n'y avait rien à y changer.
 *
 * **Panne, et plus de reprise.** Les pannes tolérées sont épuisées. Ce n'est
 * toujours pas sa faute, et le dire reste la première chose à faire ; ce qui
 * change, c'est qu'on ne peut plus rien lui proposer ici. Le compte devient la
 * seule suite honnête, et il est offert pour ce qu'il permettra vraiment —
 * reprendre plus tard —, pas pour garder des concepts qui n'existent pas.
 *
 * **Rejet, avec un essai qui reste.** Le motif du modèle dit ce qui manquait ;
 * c'est la seule chose de valeur qu'un rejet produise, et c'est elle qui apprend
 * à mieux déposer.
 *
 * **Rejet, et plus d'essai.** On garde le motif à l'écran — il reste la raison,
 * et elle est valable — et on propose le compte sans prétendre qu'il y a quoi
 * que ce soit à récupérer.
 *
 * **Il se rend dans la fenêtre de l'essai**, comme l'attente et les concepts :
 * c'est un verdict, et les trois verdicts possibles se rendent au même endroit.
 * Ses encres sont donc celles de la roche.
 *
 * **Le titre est à nous, le constat est au modèle.** Depuis que le résultat
 * occupe la fenêtre entière, cet écran doit porter un titre comme les autres — et
 * y poser `motifDechec` serait poser une phrase écrite par un modèle, de
 * longueur inconnue, dans un display de soixante pixels. Quatre mots fixes
 * titrent ; la phrase du modèle garde le corps, où sa longueur ne casse rien.
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
