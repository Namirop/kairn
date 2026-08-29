"use client";

import { useState } from "react";
import { LIBELLE_FORMAT } from "@/components/depots/libelle-format";
import { TexteTechnique } from "@/components/typographie/texte-technique";
import { unParFormat } from "@/lib/domain/formats-distincts";
import type { VariantFormat } from "@/lib/db/types";

/**
 * Les questions écrites sur l'un des concepts de l'essai, et leurs formats.
 *
 * **C'est ici que se prouve la moitié du produit qu'on ne montrait pas.** Le
 * bloc précédent s'intitulait « Ce qu'on te reposera » et posait une question,
 * une seule, en corps de texte, sous les concepts : on lisait un paragraphe de
 * plus. Rien ne disait qu'un concept en porte quatre, ni qu'elles changent de
 * forme d'un passage à l'autre — or c'est très exactement ce qui sépare Kairn
 * d'un paquet de cartes, et c'est écrit dans le positionnement du produit.
 *
 * Les quatre sont déjà écrites et déjà payées : le lot part en un appel, sur le
 * premier concept questionnable. N'en montrer qu'une ne faisait économiser
 * rien du tout.
 *
 * On les donne donc toutes, derrière leurs noms de format. Le visiteur clique,
 * la question change, et il vient de comprendre la rotation sans qu'on ait eu à
 * la lui expliquer. Le geste est le message.
 *
 * **L'attente montre la forme de ce qui arrive**, comme celle du découpage.
 * Elle ne disait qu'une ligne grise — « On les écrit, deux secondes. » — sous
 * une liste de concepts qui, elle, venait d'apparaître : rien ne bougeait, et
 * une phrase immobile sur une page qui vient de se remplir se lit comme une fin,
 * pas comme une suite. On pose donc les emplacements des quatre formats et celui
 * de la carte, aux mesures de ce qui va les remplacer.
 *
 * **Un format n'y paraît qu'une fois.** Deux « TEXTE À TROU » côte à côte —
 * servis en production le 28/08 — cassent la démonstration au moment même où
 * elle se fait : on vient de dire que les formulations changent de forme, et on
 * en montre deux de la même. Voir `unParFormat`, qui dit pourquoi la sélection
 * se fait ici et non à la génération.
 *
 * **Des boutons à deux états, pas des onglets.** Le motif ARIA des onglets
 * impose la navigation aux flèches et un `tabindex` mouvant ; à demi
 * implémenté, il retire au clavier ce que la souris garde. Quatre boutons
 * `aria-pressed` disent la même chose, se tabulent tout seuls, et ne mentent
 * pas sur ce qu'ils sont.
 */

type Question = { question: string; format: VariantFormat };

/**
 * Les largeurs des quatre emplacements de format.
 *
 * Celles des libellés qui viendront — « QCM » est court, « Texte à trou » ne
 * l'est pas — pour que la rangée ne change pas de dessin en se remplissant.
 */
const EMPLACEMENTS = ["w-16", "w-28", "w-32", "w-24"] as const;

function EnEcriture() {
  return (
    <section className="gap-pas-3 flex flex-col" role="status" aria-live="polite">
      <h3 className="text-mono font-mono tracking-[0.14em] text-stone-500 uppercase">
        On écrit les questions
      </h3>

      <div className="gap-pas-1 flex flex-wrap" aria-hidden>
        {EMPLACEMENTS.map((largeur, rang) => (
          <span
            key={largeur}
            className={`rounded-galet block h-8 bg-stone-300/60 motion-safe:animate-pulse ${largeur}`}
            style={{ animationDelay: `${rang * 160}ms` }}
          />
        ))}
      </div>

      {/* Les deux barres ont la hauteur d'une ligne d'énoncé : la carte ne
          changera pas de taille en recevant sa question. */}
      <div className="rounded-carte bg-surface-ombre p-pas-dedans" aria-hidden>
        <span className="block h-6 w-full rounded-xs bg-stone-300/70 motion-safe:animate-pulse" />
        <span
          className="mt-pas-3 block h-6 w-3/5 rounded-xs bg-stone-300/50 motion-safe:animate-pulse"
          style={{ animationDelay: "200ms" }}
        />
      </div>

      {/* La mesure est celle d'une légende et non d'un paragraphe : serrée à
          `xl`, cette phrase-là tombait sur deux lignes pour trois mots. */}
      <p className="text-petit max-w-2xl text-stone-500">
        Quatre formulations sur le même concept, de formats différents. Une vingtaine de secondes.
      </p>
    </section>
  );
}

export function EchantillonDeQuestions({
  questions,
  enCours,
}: {
  questions: Question[];
  /** L'écriture tourne encore : les questions arrivent après les concepts. */
  enCours: boolean;
}) {
  const [rang, setRang] = useState(0);

  const montrables = unParFormat(questions);

  if (montrables.length === 0) return enCours ? <EnEcriture /> : null;

  const montree = montrables[Math.min(rang, montrables.length - 1)];

  return (
    <section className="gap-pas-3 flex flex-col">
      <h3 className="text-mono font-mono tracking-[0.14em] text-stone-500 uppercase">
        {montrables.length > 1
          ? `${montrables.length} questions sur l'un de ces concepts`
          : "Une question sur l'un de ces concepts"}
      </h3>

      {montree ? (
        <>
          {/* Les formats se donnent dans l'ordre où le lot les a écrits, et le
              bouton actif partage la surface de la carte qu'il commande : c'est
              ce qui les relie sans qu'aucune bordure ait à le dire. */}
          {montrables.length > 1 ? (
            <div
              role="group"
              aria-label="Format de la question"
              className="gap-pas-1 flex flex-wrap"
            >
              {montrables.map((question, position) => (
                <button
                  key={`${question.format}-${position}`}
                  type="button"
                  aria-pressed={position === rang}
                  onClick={() => setRang(position)}
                  className={`rounded-galet px-pas-3 text-mono h-8 font-mono tracking-[0.14em] uppercase transition-colors ${
                    position === rang
                      ? "bg-surface-ombre text-stone-900"
                      : "hover:bg-surface-ombre/60 text-stone-500 hover:text-stone-900"
                  }`}
                >
                  {LIBELLE_FORMAT[question.format]}
                </button>
              ))}
            </div>
          ) : null}

          {/* La carte de l'écran de révision, à l'identique : même arrondi, même
              corps d'énoncé, même absence de bordure. Ce qu'on montre ici n'est
              pas une maquette de question, c'est la question telle qu'elle
              apparaîtra — et le reconnaître plus tard fait partie de ce qu'on
              promet. */}
          <div className="rounded-carte bg-surface-ombre p-pas-dedans" aria-live="polite">
            <p className="text-enonce leading-tight font-bold text-pretty break-words text-stone-900">
              <TexteTechnique>{montree.question}</TexteTechnique>
            </p>
          </div>

          <p className="text-petit max-w-xl text-stone-500">
            Elles tournent d&apos;un passage à l&apos;autre. C&apos;est le concept qui doit tenir,
            pas une phrase apprise par cœur.
          </p>
        </>
      ) : null}
    </section>
  );
}
