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
 * Le texte à trou. La phrase est l'énoncé, porté par la carte ; ici, la
 * consigne, le champ et la vérification.
 *
 * La vérification est locale : les formes acceptées sont écrites avec la
 * question. Juste, l'écran le dit et attend un clic, pour qu'on sache que la
 * réponse a été lue — le passage est déjà écrit, la confirmation ne retient
 * rien. Raté, on montre le terme attendu et on laisse dire « je l'avais » : un
 * synonyme absent de la liste n'est pas une erreur.
 *
 * Le coup de pouce donne des pistes sans la réponse : c'est encore un rappel,
 * plus facile, et compté comme tel. Le prix est dit avant qu'on le paie.
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

        {/* Deux issues nommées comme la graduation des formats ouverts : chaque
            bouton dit ce qu'il enregistre. */}
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
      {/* La consigne au poids du corps, comme sur les autres formats : c'est ce
          qu'on demande, pas une légende du champ. */}
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
          /* Pas de `flex-1` sous `sm` : la rangée y passe en colonne, où
             `flex-1` gouverne la hauteur et écrase le champ. 48 px sur
             téléphone, comme le bouton qui le suit. */
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
 * Le coup de pouce : la porte, puis les pistes.
 *
 * Absent si la question n'a pas de leurres (formulations anciennes) : une aide
 * proposée qui n'arrive pas serait pire. Une fois ouvert, il dit son prix avec
 * ce qu'il donne, et vient en vue car il se pose sous le pli d'un téléphone.
 *
 * Les termes ne sont pas cliquables, délibérément : produire la réponse fixe le
 * souvenir, une liste à cliquer en ferait un QCM de plus.
 */
function CoupDePouce({ trou }: { trou: TexteATrou }) {
  const pistes = useVenirEnVue<HTMLDivElement>(trou.aide);
  const t = useTranslations("revision.question.cloze");

  if (trou.pistes.length === 0) return null;

  if (!trou.aide) {
    return (
      /* Même registre et même bord que l'autre sortie de secours : elle ne
         doit pas se présenter plus fort que celle qui renonce. */
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
    /* Le jeton, pas la pilule : dans l'échelle des formes la pilule est un
       geste, et ces termes ne se cliquent pas. */
    <div
      ref={pistes}
      className="rounded-carte bg-surface-papier px-pas-4 py-pas-3 mt-pas-4 max-w-xl"
      role="status"
    >
      <p className="text-mono font-mono tracking-[0.12em] text-stone-500 uppercase">
        {t("pistes")}
      </p>

      {/* Le jeton est en `em` : la taille se pose sur la liste, jamais sur le
          jeton (deux `font-size` sur un élément, le gagnant ne se lit pas). */}
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
