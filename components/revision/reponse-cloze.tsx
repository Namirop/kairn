"use client";

import { useTranslations } from "next-intl";
import { SuiteDeLaQuestion } from "@/components/revision/suite-de-la-question";
import { useVenirEnVue } from "@/components/revision/use-venir-en-vue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { JETON, jetonInsecable } from "@/components/typographie/texte-technique";
import type { TexteATrou } from "@/components/revision/use-suite-de-questions";
import { LONGUEUR_MAX_SAISIE } from "@/lib/domain/reponse-cloze";

/**
 * Consigne, champ et vérification du texte à trou ; la phrase est portée par la
 * carte. Vérification locale contre les formes acceptées. Juste, on attend un
 * clic pour savoir la réponse lue (le passage est déjà écrit). Raté, on laisse
 * dire « je l'avais » : un synonyme absent de la liste n'est pas une erreur.
 */
export function ReponseCloze({
  trou,
  enCours,
  dernier,
  onVerifier,
}: {
  trou: TexteATrou;
  enCours: boolean;
  dernier: boolean;
  /** Compare la saisie aux formes acceptées et fige le chronomètre. */
  onVerifier: () => void;
}) {
  const propre = trou.saisie.trim();
  const t = useTranslations("revision.question");

  if (trou.verdict === "JUSTE") {
    return (
      <SuiteDeLaQuestion>
        {/* Un constat, pas un compliment. */}
        <p className="text-corps text-stone-900">{t("cloze.termeAttendu")}</p>

        {trou.aide ? <p className="mt-pas-2 text-petit text-stone-500">{t("cloze.aide")}</p> : null}

        <div className="mt-pas-6">
          <Button type="button" disabled={enCours} onClick={() => trou.juger("GOOD")}>
            {dernier ? t("terminer") : t("continuer")}
          </Button>
        </div>
      </SuiteDeLaQuestion>
    );
  }

  if (trou.verdict === "RATE") {
    return (
      <SuiteDeLaQuestion>
        <p className="text-corps text-stone-500">
          {t.rich("cloze.tuAsEcrit", {
            saisie: propre,
            terme: (morceau) => <span className="font-mono text-stone-900">{morceau}</span>,
          })}
        </p>

        {/* Nommées comme la graduation des formats ouverts : chaque bouton dit ce qu'il enregistre. */}
        <div className="gap-pas-2 mt-pas-6 flex flex-wrap">
          <Button
            type="button"
            variant="outline"
            disabled={enCours}
            onClick={() => trou.juger("HARD")}
          >
            {t("cloze.jeLAvais")}
          </Button>
          <Button type="button" disabled={enCours} onClick={() => trou.juger("AGAIN")}>
            {t("cloze.jeNeLAvaisPas")}
          </Button>
        </div>
      </SuiteDeLaQuestion>
    );
  }

  return (
    <form
      className="mt-pas-scene"
      onSubmit={(evenement) => {
        evenement.preventDefault();
        onVerifier();
      }}
    >
      {/* Au poids du corps : c'est ce qu'on demande, pas une légende du champ. */}
      <label htmlFor="trou" className="text-corps block text-stone-900">
        {t("cloze.consigne")}
      </label>

      <div className="gap-pas-3 mt-pas-3 flex max-w-xl flex-col sm:flex-row sm:items-center">
        <Input
          id="trou"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          maxLength={LONGUEUR_MAX_SAISIE}
          /* Pas de `flex-1` sous `sm` : en colonne, il gouverne la hauteur et
             écrase le champ. 48 px sur téléphone, comme le bouton. */
          className="w-full max-sm:h-12 sm:flex-1"
          value={trou.saisie}
          onChange={(evenement) => trou.saisir(evenement.target.value)}
        />

        <Button type="submit" disabled={enCours || propre.length === 0} className="max-sm:h-12">
          {t("cloze.verifier")}
        </Button>
      </div>

      <CoupDePouce trou={trou} />
    </form>
  );
}

/**
 * Des pistes sans la réponse : encore un rappel, plus facile, et payé d'un cran.
 * Absent sans leurres : une aide proposée qui n'arrive pas serait pire. Ouvert,
 * il vient en vue (il tombe sous le pli d'un téléphone). Les termes ne se
 * cliquent pas exprès : produire la réponse fixe le souvenir, pas la choisir.
 */
function CoupDePouce({ trou }: { trou: TexteATrou }) {
  const pistes = useVenirEnVue<HTMLDivElement>(trou.aide);
  const t = useTranslations("revision.question.cloze");

  if (trou.pistes.length === 0) return null;

  if (!trou.aide) {
    return (
      /* Pas plus fort que l'autre sortie de secours, celle qui renonce. */
      <div className="sortie-de-secours mt-pas-6">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-pas-4 max-sm:h-11"
          onClick={trou.demanderDeLaide}
        >
          {t("jeSeche")}
        </Button>
      </div>
    );
  }

  return (
    /* Le jeton, pas la pilule : la pilule est un geste, ces termes ne se cliquent pas. */
    <div
      ref={pistes}
      className="rounded-carte bg-surface-papier px-pas-4 py-pas-3 mt-pas-4 max-w-xl"
      role="status"
    >
      <p className="text-mono font-mono tracking-[0.12em] text-stone-500 uppercase">
        {t("pistes")}
      </p>

      {/* Jeton en `em` : la taille va sur la liste, jamais sur le jeton (deux
          `font-size` sur un élément, le gagnant ne se lit pas). */}
      <ul className="gap-pas-2 mt-pas-3 text-corps flex flex-wrap">
        {trou.pistes.map((piste) => (
          <li
            key={piste}
            className={`${JETON} text-stone-900 ${jetonInsecable(piste) ? "whitespace-nowrap" : ""}`}
          >
            {piste}
          </li>
        ))}
      </ul>

      <p className="mt-pas-3 text-petit text-stone-500">{t("rappelAide")}</p>
    </div>
  );
}
