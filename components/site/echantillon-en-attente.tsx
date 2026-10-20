"use client";

import { useTranslations } from "next-intl";
import { PhraseQuiTourne, usePhraseQuiTourne } from "@/components/site/phrase-qui-tourne";
import { Button } from "@/components/ui/button";

/**
 * L'échantillon pas encore écrit : pas de squelette, la carte finale à sa
 * taille, avec les phrases de l'écriture (les concepts sont déjà là).
 */
export function EnEcriture({
  abandonnee,
  onVerifier,
}: {
  abandonnee: boolean;
  onVerifier: () => void;
}) {
  const t = useTranslations("site.essai.echantillon");
  const phrase = usePhraseQuiTourne("ECRITURE");

  if (abandonnee) return <EcritureAbandonnee onVerifier={onVerifier} />;

  return (
    <section className="gap-pas-3 flex flex-col" role="status" aria-live="polite">
      <header className="gap-pas-2 flex flex-col">
        <h3 className="font-display text-h1-app leading-tight font-bold tracking-[-0.02em] text-stone-50">
          {t("ecritureTitre")}
        </h3>

        {/* Seule ligne stable, donc seule lue : la phrase qui tourne est masquée. */}
        <p className="text-petit max-w-xl text-stone-300">{t("ecritureTexte")}</p>
      </header>

      {/* Surface et arrondi de `CarteDeLEchantillon` : à l'arrivée, seul le contenu change. */}
      <div className="rounded-carte p-pas-dedans bg-stone-700">
        <PhraseQuiTourne phrase={phrase} className="text-stone-300" />
      </div>
    </section>
  );
}

/** L'interrogation a renoncé, le lot continue côté serveur ; le bouton va voir. */
function EcritureAbandonnee({ onVerifier }: { onVerifier: () => void }) {
  const t = useTranslations("site.essai.echantillon");

  return (
    <section className="gap-pas-3 flex flex-col">
      <h3 className="font-display text-h1-app leading-tight font-bold tracking-[-0.02em] text-stone-50">
        {t("ecritureAbandonTitre")}
      </h3>

      <p className="text-petit max-w-xl text-stone-300">{t("ecritureAbandonTexte")}</p>

      <div className="mt-pas-1">
        <Button type="button" variant="outlineClair" size="sm" onClick={onVerifier}>
          {t("verifier")}
        </Button>
      </div>
    </section>
  );
}
