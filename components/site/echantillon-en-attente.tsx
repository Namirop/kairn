"use client";

import { useTranslations } from "next-intl";
import { PhraseQuiTourne, usePhraseQuiTourne } from "@/components/site/phrase-qui-tourne";
import { Button } from "@/components/ui/button";

/**
 * L'échantillon de questions tant qu'il n'existe pas encore : pas de squelette,
 * la carte finale à sa taille finale, qui dit ce qui se passe.
 *
 * Les phrases sont celles de l'écriture (`ECRITURE`), pas du découpage : les
 * concepts sont déjà à l'écran. Voir `lib/domain/phrases-dattente.ts`.
 *
 * Quand l'interrogation s'arrête, à 90 s, la carte s'arrête avec elle et offre
 * un geste pour aller voir.
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

        {/* La seule ligne stable du bloc, et donc la seule que les lecteurs
            d'écran entendent : la phrase qui tourne leur est masquée. */}
        <p className="text-petit max-w-xl text-stone-300">{t("ecritureTexte")}</p>
      </header>

      {/* Même surface et même arrondi que `CarteDeLEchantillon` : à l'arrivée,
          seul le contenu change. */}
      <div className="rounded-carte p-pas-dedans bg-stone-700">
        <PhraseQuiTourne phrase={phrase} className="text-stone-300" />
      </div>
    </section>
  );
}

/**
 * L'écriture dont on a cessé de suivre l'avancement. Le lot continue côté
 * serveur ; le bouton ne fait qu'aller voir tout de suite.
 */
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
