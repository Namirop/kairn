"use client";

import { useState } from "react";
import { CarteDeLEchantillon } from "@/components/site/carte-de-lechantillon";
import { LIBELLE_FORMAT } from "@/components/depots/libelle-format";
import { parOrdreDeFormat } from "@/components/depots/ordre-des-formats";
import { EnEcriture } from "@/components/site/echantillon-en-attente";
import { unParFormat } from "@/lib/domain/formats-distincts";
import type { QuestionDeVitrine } from "@/lib/db/depot-de-visite";
import type { EtatDeLAttente } from "@/lib/depots/rythme-de-lattente";

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
 * **L'attente d'ici s'arrête comme celle du découpage.** L'interrogation cesse à
 * quatre-vingt-dix secondes ; sans le dire, les emplacements des formats
 * continuaient de battre pour toujours sous des concepts déjà affichés, et rien
 * n'indiquait qu'il fallait un geste pour aller voir. Le cas demande un job
 * reporté — les questions n'ont jamais dépassé quarante-trois secondes en
 * production —, mais c'est le même mensonge que celui qu'on venait de corriger
 * à l'autre bout de la chaîne.
 *
 * **L'ordre des formats est fixe**, et ne suit plus celui du lot : voir
 * `parOrdreDeFormat`. Un QCM montre en plus ses propositions — annoncé sans
 * elles, il se lisait comme une question ouverte sous une étiquette qui promet
 * autre chose, et c'est le format le plus reconnaissable du lot qu'on rendait
 * illisible.
 *
 * **Des boutons à deux états, pas des onglets.** Le motif ARIA des onglets
 * impose la navigation aux flèches et un `tabindex` mouvant ; à demi
 * implémenté, il retire au clavier ce que la souris garde. Quatre boutons
 * `aria-pressed` disent la même chose, se tabulent tout seuls, et ne mentent
 * pas sur ce qu'ils sont.
 *
 * **Ce n'est plus une étiquette, c'est une étape.** Le bloc s'annonçait par un
 * libellé mono de douze pixels en capitales grises — le même traitement que
 * « CE QUE TU VEUX RETENIR » au-dessus du champ et que « EN ATTENDANT » à côté
 * du jeu. Trois étiquettes identiques sur un même écran ne hiérarchisent plus
 * rien : elles font un gabarit. Ce qui arrive ici est le second temps de la
 * démonstration, après les concepts, et il porte donc un titre comme eux.
 *
 * Ce qui l'en sépare est du **vide**, pas un filet : deux sujets ne se séparent
 * jamais par une ligne dans ce système. L'écart est celui de deux temps d'un
 * même écran, et il suffit à dire qu'on change de sujet.
 *
 * La phrase qui explique la rotation est passée **au-dessus** des formats.
 * Posée sous la carte, elle expliquait après coup ce que les boutons venaient
 * de faire ; posée avant, elle dit à quoi ils servent — et les deux temps de la
 * fenêtre prennent la même forme, titre puis sous-titre puis contenu.
 */

export function EchantillonDeQuestions({
  questions,
  enCours,
  attente,
  onVerifier,
}: {
  questions: QuestionDeVitrine[];
  /** L'écriture tourne encore : les questions arrivent après les concepts. */
  enCours: boolean;
  /** Où en est l'interrogation, pour ne pas battre après qu'elle s'est arrêtée. */
  attente: EtatDeLAttente;
  onVerifier: () => void;
}) {
  const [rang, setRang] = useState(0);

  const montrables = parOrdreDeFormat(unParFormat(questions));

  if (montrables.length === 0) {
    return enCours ? (
      <EnEcriture abandonnee={attente === "ABANDONNEE"} onVerifier={onVerifier} />
    ) : null;
  }

  const montree = montrables[Math.min(rang, montrables.length - 1)];

  return (
    <section className="gap-pas-3 flex flex-col">
      <header className="gap-pas-2 flex flex-col">
        <h3 className="font-display text-h1-app leading-tight font-bold tracking-[-0.02em] text-stone-50 tabular-nums">
          {montrables.length > 1
            ? `${montrables.length} questions sur l'un d'eux.`
            : "Une question sur l'un d'eux."}
        </h3>

        <p className="text-petit max-w-xl text-stone-300">
          Elles tournent d&apos;un passage à l&apos;autre. C&apos;est le concept qui doit tenir, pas
          une phrase apprise par cœur.
        </p>
      </header>

      {montree ? (
        <>
          {/* Le bouton actif partage la surface de la carte qu'il commande :
              c'est ce qui les relie sans qu'aucune bordure ait à le dire. */}
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
                      ? "bg-stone-700 text-stone-50"
                      : "text-stone-300 hover:bg-stone-700/60 hover:text-stone-50"
                  }`}
                >
                  {LIBELLE_FORMAT[question.format]}
                </button>
              ))}
            </div>
          ) : null}

          <CarteDeLEchantillon question={montree.question} options={montree.options} />
        </>
      ) : null}
    </section>
  );
}
