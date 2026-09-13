"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { deposerAction, type EtatDepot } from "@/app/(app)/depots/actions";
import { BoutonDeConsigne, ChampDeConsigne } from "@/components/depots/consigne-du-depot";
import { ExemplesDeDepot } from "@/components/depots/exemples-de-depot";
import { reprendreLePartage } from "@/components/depots/partage-recu";
import { PieceJointe } from "@/components/depots/piece-jointe";
import { Button } from "@/components/ui/button";
import {
  CARACTERES_MAXIMUM,
  CONSIGNE_MAXIMUM,
  IMAGE_TROP_LOURDE,
  TAILLE_MAXIMALE_OCTETS,
  tropLongPourUnDepot,
  tropLonguePourUneConsigne,
} from "@/lib/depots/bornes-du-depot";
import { LIEN_SANS_MATIERE } from "@/lib/domain/texte-partage";
import { reduireLaCapture } from "@/lib/images/reduire-la-capture";

/**
 * Le geste de dépôt : un champ, une pièce jointe facultative, un bouton.
 *
 * Pas de choix de type, pas d'onglet, pas de bouton « générer » : on colle ce
 * qu'on a et ça part. Tout le reste du produit repose sur la vitesse de ce
 * geste-là.
 *
 * La clé d'envoi vient du serveur, tirée à l'affichage de la page : deux clics
 * sur le même formulaire portent la même, et n'écrivent qu'un dépôt. Elle ne
 * peut pas être tirée ici — `useId()` rend la même valeur à chaque chargement,
 * puisqu'elle décrit une position dans l'arbre, pas un geste.
 *
 * **Il se remplit aussi tout seul.** Un partage venu du système est rangé sur
 * l'appareil par le service worker, et repris ici au montage. C'est le même
 * formulaire dans les deux cas, à dessein : on relit, on coupe ce qui déborde,
 * puis on dépose. Un partage qui déposerait directement enlèverait le seul
 * moment où l'on peut tailler dans ce qui a été sélectionné.
 *
 * **Toute capture passe par la réduction avant d'entrer dans l'état.** C'est le
 * seul endroit où une image arrive — sélecteur ou partage —, donc le seul où la
 * poser. Tout ce qui suit — l'affichage du nom, le refus de poids, l'envoi — ne
 * voit alors que l'image réduite, et c'est exactement ce qu'on veut : c'est elle
 * qui part.
 */

/** Au-delà, on montre le compteur : avant, il n'apprend rien à personne. */
const SEUIL_COMPTEUR = Math.floor(CARACTERES_MAXIMUM * 0.75);

/**
 * Ce qui empêche ce dépôt de partir, ou rien.
 *
 * Un seul refus à la fois, dans l'ordre où on peut y remédier : ce que le
 * serveur a répondu passe avant ce que l'écran voit venir.
 */
function refusDuFormulaire(
  erreur: string | undefined,
  capture: File | null,
  texte: string,
  consigne: string,
) {
  if (erreur) return erreur;
  if (capture && capture.size > TAILLE_MAXIMALE_OCTETS) return IMAGE_TROP_LOURDE;
  if (texte.length > CARACTERES_MAXIMUM) return tropLongPourUnDepot(texte.length);
  if (consigne.length > CONSIGNE_MAXIMUM) return tropLonguePourUneConsigne(consigne.length);

  return null;
}

export function FormulaireDepot({
  restants,
  cleEnvoi,
  invite,
  premierDepot = false,
  partageManque = false,
}: {
  restants: number;
  cleEnvoi: string;
  /** Tirée côté serveur : un tirage ici ferait diverger le rendu de l'hydratation. */
  invite: string;
  /** Le compte n'a encore rien déposé : les exemples remplacent l'explication. */
  premierDepot?: boolean;
  /** Un partage est arrivé sans que le service worker puisse le retenir. */
  partageManque?: boolean;
}) {
  const [etat, action, enCours] = useActionState<EtatDepot, FormData>(deposerAction, {});
  const [texte, setTexte] = useState("");
  const [capture, setCapture] = useState<File | null>(null);
  const [consigne, setConsigne] = useState("");
  const [consigneOuverte, setConsigneOuverte] = useState(false);
  const [preparation, setPreparation] = useState(false);
  const [lienSeul, setLienSeul] = useState(false);

  /*
    Le rang du choix en cours, pour que seul le dernier compte.

    Réduire une image de plusieurs mégaoctets prend le temps d'un décodage et
    d'un réencodage. Qui change d'avis pendant ce temps-là verrait la première
    capture s'installer après la seconde, et déposerait celle qu'il venait de
    remplacer. Le compteur tranche : un rendu qui n'est plus le dernier demandé
    est jeté.
  */
  const rang = useRef(0);

  const choisirLaCapture = useCallback(async (fichier: File | null) => {
    const moi = (rang.current += 1);

    if (!fichier) {
      setCapture(null);
      setPreparation(false);
      return;
    }

    setPreparation(true);

    const reduite = await reduireLaCapture(fichier);

    if (rang.current !== moi) return;

    setCapture(reduite);
    setPreparation(false);
  }, []);

  // Le partage attend sur l'appareil ; il est lu une fois, puis effacé.
  useEffect(() => {
    let monte = true;

    void reprendreLePartage().then((partage) => {
      if (!monte || !partage) return;

      setTexte(partage.texte);
      setLienSeul(partage.lienSeul);
      void choisirLaCapture(partage.capture);
    });

    return () => {
      monte = false;
    };
  }, [choisirLaCapture]);

  const refus = refusDuFormulaire(etat.erreur, capture, texte, consigne);

  return (
    <form action={action} noValidate className="gap-pas-4 flex max-w-3xl flex-col">
      <input type="hidden" name="cleEnvoi" value={cleEnvoi} />

      {premierDepot ? <ExemplesDeDepot onChoisir={setTexte} /> : null}

      <div>
        <label htmlFor="texte" className="sr-only">
          Ce que tu veux retenir
        </label>
        <textarea
          id="texte"
          name="texte"
          rows={12}
          autoFocus
          value={texte}
          onChange={(evenement) => {
            setTexte(evenement.target.value);
            setLienSeul(false);
          }}
          placeholder={invite}
          className="p-pas-4 text-corps field-sizing-content min-h-56 w-full resize-y rounded-xs border border-stone-300 bg-stone-50 leading-relaxed text-stone-900 placeholder:text-stone-500"
        />
      </div>

      {/* Fermer la consigne l'efface : une consigne qu'on ne voit plus mais qui
          partirait quand même serait le pire des deux états. */}
      {consigneOuverte ? (
        <ChampDeConsigne
          valeur={consigne}
          onChange={setConsigne}
          onFermer={() => {
            setConsigne("");
            setConsigneOuverte(false);
          }}
        />
      ) : null}

      <div className="gap-pas-4 flex flex-wrap items-center justify-between">
        <div className="gap-pas-3 flex flex-wrap items-center">
          <PieceJointe fichier={capture} onChoisir={choisirLaCapture} />
          {consigneOuverte ? null : <BoutonDeConsigne onOuvrir={() => setConsigneOuverte(true)} />}
        </div>

        <div className="gap-pas-4 flex items-center">
          {texte.length > SEUIL_COMPTEUR ? (
            <span
              className={`text-mono font-mono tabular-nums ${
                texte.length > CARACTERES_MAXIMUM ? "text-alerte" : "text-stone-500"
              }`}
            >
              {texte.length.toLocaleString("fr-FR")} / {CARACTERES_MAXIMUM.toLocaleString("fr-FR")}
            </span>
          ) : null}
          <Button type="submit" disabled={enCours || preparation || refus !== null}>
            {enCours ? "Dépôt en cours…" : preparation ? "Lecture de la capture…" : "Déposer"}
          </Button>
        </div>
      </div>

      {/* L'espace du message est réservé : l'apparition d'une erreur ne doit pas
          décaler ce qui est au-dessus. */}
      <p className="text-petit min-h-5 text-stone-500" role="status" aria-live="polite">
        {refus ? (
          <span className="text-alerte">{refus}</span>
        ) : (
          <Conseil {...{ lienSeul, partageManque, restants }} />
        )}
      </p>
    </form>
  );
}

/**
 * Ce qu'on dit quand rien ne bloque : d'abord ce qui vient d'arriver, sinon ce
 * qui reste à retenir ce mois-ci.
 */
function Conseil({
  lienSeul,
  partageManque,
  restants,
}: {
  lienSeul: boolean;
  partageManque: boolean;
  restants: number;
}) {
  if (partageManque)
    return "Le partage n'est pas arrivé jusqu'ici. Colle le texte, ou repartage-le.";
  if (lienSeul) return LIEN_SANS_MATIERE;

  // Ce qui reste se compte en concepts : une phrase en consomme un, un article
  // en consomme huit. C'est la matière qui est plafonnée, pas le nombre de fois
  // qu'on colle quelque chose.
  //
  // « Ce mois-ci » et non « aujourd'hui » : `restants` vient du plafond
  // mensuel. L'écran annonçait donc le plafond du mois pour la journée, et
  // quelqu'un qui les déposait trouvait zéro le lendemain sans comprendre. La
  // valeur était juste, le mot à côté était faux.
  return `Il te reste ${restants} ${restants === 1 ? "concept" : "concepts"} à retenir ce mois-ci.`;
}
