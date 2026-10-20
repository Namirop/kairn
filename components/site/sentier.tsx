import { useTranslations } from "next-intl";
import { Panneau } from "@/components/coquille/panneau";
import { Apparition, Temps } from "@/components/site/apparition";
import { TraceDuSentier } from "@/components/site/trace-du-sentier";

const ETAPES = ["deposer", "decouper", "revenir"] as const;

/**
 * Une séquence réelle, donc une liste verticale reliée par un trait, pas trois
 * cartes. Les étapes ont la même encre : une seule d'une autre valeur se lirait
 * comme une erreur. La colonne de droite vaut la mesure de lecture : en
 * fraction, plus large que le texte, elle ferait pencher la section.
 */
export function Sentier() {
  const t = useTranslations("site.accueil.sentier");

  return (
    <Panneau surface="ombre" aere className="gap-pas-12 grid md:grid-cols-[1fr_minmax(0,36rem)]">
      <Apparition ecart={0.26}>
        <h2 className="font-display text-h2-site leading-[1] font-bold tracking-[-0.02em]">
          <Temps balise="span" pierre className="block">
            {t("titreHaut")}
          </Temps>
          <Temps balise="span" pierre className="block">
            {t("titreBas")}
          </Temps>
        </h2>
      </Apparition>

      <TraceDuSentier
        etapes={ETAPES.map((etape) => ({
          titre: t(`${etape}.titre`),
          texte: t(`${etape}.texte`),
        }))}
      />
    </Panneau>
  );
}
