"use client";

import { useVenirEnVue } from "@/components/revision/use-venir-en-vue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { JETON } from "@/components/typographie/texte-technique";
import type { TexteATrou } from "@/components/revision/use-suite-de-questions";
import { LONGUEUR_MAX_SAISIE } from "@/lib/domain/reponse-cloze";

/**
 * Le texte à trou.
 *
 * La phrase est en titre — c'est l'énoncé, la carte s'en charge — et son trou se
 * remplit à la frappe. Ici on ne pose que ce qu'il faut pour le combler : la
 * consigne, un champ, la vérification.
 *
 * Cette vérification est locale et instantanée : les formes acceptées ont été
 * écrites en même temps que la question, il n'y a rien à demander à personne.
 * C'est le seul format qui fait produire une réponse sans faire attendre un
 * jugement.
 *
 * Juste, l'écran le dit et attend un clic. Enchaîner sans rien montrer était le
 * geste le plus rapide et le plus inquiétant du produit : la question suivante
 * s'affichait, et rien ne disait si la réponse avait été lue, comptée, ou même
 * juste. Le passage, lui, est déjà écrit — la confirmation ne retient rien.
 *
 * À côté, on montre le terme attendu dans la phrase et on laisse dire « je
 * l'avais » : on écrit parfois un synonyme que la liste ne porte pas. C'est le
 * seul jugement demandé sur ce format, et seulement dans ce cas.
 *
 * **Et on peut sécher.** C'est le seul format qui demande de produire la réponse
 * plutôt que de la reconnaître, ce qui le rend le plus utile — et parfois
 * infranchissable : on a le concept en tête, le terme exact ne vient pas, et il
 * ne reste qu'à s'avouer vaincu sur quelque chose qu'on savait à moitié. Trois ou
 * quatre pistes réduisent le champ sans donner la réponse : c'est encore un
 * rappel, plus facile, et compté comme tel. Le prix est dit avant qu'on le paie.
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

  if (trou.verdict === "JUSTE") {
    return (
      <div className="mt-pas-scene">
        {/* Un constat, pas un compliment : la récompense est l'espacement qui
            s'allonge, et le terme qui vient de se poser dans la phrase. */}
        <p className="text-corps text-stone-900">C&apos;est le terme attendu.</p>

        {trou.aide ? (
          <p className="mt-pas-2 text-petit text-stone-500">
            Retrouvé avec un coup de pouce : le concept revient un peu plus tôt.
          </p>
        ) : null}

        <div className="mt-pas-6">
          <Button type="button" disabled={enCours} onClick={() => trou.juger("GOOD")}>
            {dernier ? "Terminer" : "Continuer"}
          </Button>
        </div>
      </div>
    );
  }

  if (trou.verdict === "RATE") {
    return (
      <div className="mt-pas-scene">
        <p className="text-corps text-stone-500">
          Tu as écrit <span className="font-mono text-stone-900">{propre}</span>.
        </p>

        {/* Deux issues nommées comme la graduation des formats ouverts : c'est la
            même question posée en deux boutons. « Continuer » ne disait pas ce
            qu'il enregistrait. */}
        <div className="gap-pas-2 mt-pas-6 flex flex-wrap">
          <Button
            type="button"
            variant="outline"
            disabled={enCours}
            onClick={() => trou.juger("HARD")}
          >
            Je l&apos;avais
          </Button>
          <Button type="button" disabled={enCours} onClick={() => trou.juger("AGAIN")}>
            Je ne l&apos;avais pas
          </Button>
        </div>
      </div>
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
      {/* La consigne est ce qu'on demande, pas une légende du champ : elle porte
          le poids du corps, comme « Où en étais-tu ? » sur les autres formats. */}
      <label htmlFor="trou" className="text-corps block text-stone-900">
        Complète avec le terme qui manque
      </label>

      <div className="gap-pas-3 mt-pas-3 flex max-w-xl flex-col sm:flex-row sm:items-center">
        <Input
          id="trou"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          maxLength={LONGUEUR_MAX_SAISIE}
          /* `flex-1` seul écrasait le champ sur téléphone. La rangée passe en
             colonne sous `sm`, et dans une colonne c'est la **hauteur** que
             `flex-1` gouverne : le champ tombait à une vingtaine de pixels,
             deux fois moins qu'un bouton, pour le geste central de ce format.
             Il prend la largeur en colonne, la place restante en rangée.

             Et il monte à quarante-huit pixels sur téléphone, comme le bouton
             qui le suit : c'est le seul champ de l'écran, et la seule chose
             qu'on ait à faire. */
          className="w-full max-sm:h-12 sm:flex-1"
          value={trou.saisie}
          onChange={(evenement) => trou.saisir(evenement.target.value)}
        />

        <Button type="submit" disabled={enCours || propre.length === 0} className="max-sm:h-12">
          Vérifier
        </Button>
      </div>

      <CoupDePouce trou={trou} />
    </form>
  );
}

/**
 * Le coup de pouce : la porte, puis les pistes.
 *
 * Il ne s'affiche que si la question porte de quoi le donner — les formulations
 * écrites avant qu'il existe n'ont pas de leurres, et proposer une aide qui
 * n'arrive pas serait pire que ne rien proposer.
 *
 * Discret tant qu'on n'en a pas besoin : c'est une sortie de secours, pas une
 * option du geste. Une fois ouvert, il dit son prix dans la même phrase que ce
 * qu'il donne — on ne découvre pas après coup que le passage a été dégradé.
 *
 * Les termes ne sont pas cliquables, et c'est délibéré : on continue de les
 * écrire. C'est produire la réponse qui fixe le souvenir, et une liste à cliquer
 * transformerait le seul format qui le demande en un QCM de plus.
 *
 * Il vient à l'écran comme la réponse d'un format ouvert, et pour la même
 * raison : ce qu'on vient de demander se pose sous le pli d'un téléphone, et son
 * prix avec.
 */
function CoupDePouce({ trou }: { trou: TexteATrou }) {
  const pistes = useVenirEnVue<HTMLDivElement>(trou.aide);

  if (trou.pistes.length === 0) return null;

  if (!trou.aide) {
    return (
      <div className="mt-pas-4">
        <Button
          type="button"
          variant="link"
          size="sm"
          className="px-0"
          onClick={trou.demanderDeLaide}
        >
          Je sèche
        </Button>
      </div>
    );
  }

  return (
    /*
      Les pistes sont l'objet du moment, et elles doivent le montrer.

      Alignées en ligne dans un paragraphe gris, elles avaient le poids du texte
      qui les entoure : on venait de demander de l'aide, et l'aide arrivait au
      rang d'une légende. Elles sont donc posées sur leur propre surface, comme
      la carte de la question — c'est un objet qu'on lit, pas une note de bas de
      page —, et chaque terme porte le jeton du produit.

      Le jeton, et pas la pilule : dans l'échelle des formes, la pilule est un
      geste. Or ces termes ne se cliquent pas, et c'est délibéré — on continue de
      les écrire. Leur donner la forme d'un bouton reviendrait à transformer le
      seul format qui fait produire la réponse en un QCM de plus.
    */
    <div
      ref={pistes}
      className="rounded-carte bg-surface-papier px-pas-4 py-pas-3 mt-pas-4 max-w-xl"
      role="status"
    >
      <p className="text-mono font-mono tracking-[0.12em] text-stone-500 uppercase">
        L&apos;un de ces termes
      </p>

      {/* La taille du jeton est en `em` : c'est la liste qui la fixe, pas le
          jeton. Lui poser une classe de corps par-dessus la sienne mettrait
          deux règles de `font-size` sur le même élément, et laquelle gagne ne se
          lit nulle part dans le code. */}
      <ul className="gap-pas-2 mt-pas-3 text-corps flex flex-wrap">
        {trou.pistes.map((piste) => (
          <li key={piste} className={`${JETON} text-stone-900`}>
            {piste}
          </li>
        ))}
      </ul>

      <p className="mt-pas-3 text-petit text-stone-500">
        Compté comme un rappel aidé : le concept revient un peu plus tôt.
      </p>
    </div>
  );
}
