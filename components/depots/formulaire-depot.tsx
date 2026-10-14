"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { deposerAction, type EtatDepot } from "@/app/(app)/depots/actions";
import { BoutonDeConsigne, ChampDeConsigne } from "@/components/depots/consigne-du-depot";
import { ExemplesDeDepot } from "@/components/depots/exemples-de-depot";
import { PieceJointe } from "@/components/depots/piece-jointe";
import { useCaptureDuDepot } from "@/components/depots/use-capture-du-depot";
import { Button } from "@/components/ui/button";
import {
  CARACTERES_MAXIMUM,
  CONSIGNE_MAXIMUM,
  TAILLE_MAXIMALE_OCTETS,
  type TraduireLesRefus,
} from "@/lib/depots/bornes-du-depot";

/**
 * Le geste de dépôt : un champ, une pièce jointe facultative, un bouton.
 *
 * La clé d'envoi vient du serveur, tirée à l'affichage : deux clics sur le même
 * formulaire n'écrivent qu'un dépôt. `useId()` ne convient pas, il rend la même
 * valeur à chaque chargement.
 *
 * La capture, choisie ou apportée par un partage du système, est tenue par
 * `useCaptureDuDepot`.
 */

/** Au-delà, on montre le compteur : avant, il n'apprend rien à personne. */
const SEUIL_COMPTEUR = Math.floor(CARACTERES_MAXIMUM * 0.75);

/**
 * Ce qui empêche ce dépôt de partir, ou `null`. Un seul refus à la fois : la
 * réponse du serveur passe avant ce que l'écran voit venir. Les phrases sont
 * celles du serveur, `depots.refus`.
 */
function refusDuFormulaire(
  t: TraduireLesRefus,
  erreur: string | undefined,
  capture: File | null,
  texte: string,
  consigne: string,
) {
  if (erreur) return erreur;
  if (capture && capture.size > TAILLE_MAXIMALE_OCTETS) return t("imageTropLourde");
  if (texte.length > CARACTERES_MAXIMUM) {
    return t("texteTropLong", { caracteres: texte.length, maximum: CARACTERES_MAXIMUM });
  }
  if (consigne.length > CONSIGNE_MAXIMUM) {
    return t("consigneTropLongue", { caracteres: consigne.length, maximum: CONSIGNE_MAXIMUM });
  }

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
  const t = useTranslations("depots.formulaire");
  const tRefus = useTranslations("depots.refus");
  const [etat, action, enCours] = useActionState<EtatDepot, FormData>(deposerAction, {});
  const [texte, setTexte] = useState("");
  const [consigne, setConsigne] = useState("");
  const [consigneOuverte, setConsigneOuverte] = useState(false);
  const [lienSeul, setLienSeul] = useState(false);
  const { capture, preparation, choisirLaCapture } = useCaptureDuDepot({ setTexte, setLienSeul });

  const refus = refusDuFormulaire(tRefus, etat.erreur, capture, texte, consigne);

  return (
    <form action={action} noValidate className="gap-pas-4 flex max-w-3xl flex-col">
      <input type="hidden" name="cleEnvoi" value={cleEnvoi} />

      {premierDepot ? <ExemplesDeDepot onChoisir={setTexte} /> : null}

      <div>
        <label htmlFor="texte" className="sr-only">
          {t("etiquetteTexte")}
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

      {/* Sur téléphone, le bouton de dépôt passe sous les facultatifs et prend
          la largeur ; les facultatifs tiennent leur ligne en raccourcissant
          leur libellé (`libelle-qui-se-raccourcit.tsx`). */}
      <div className="gap-pas-4 flex flex-col md:flex-row md:flex-wrap md:items-center md:justify-between">
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
              {t("compteur", { longueur: texte.length, maximum: CARACTERES_MAXIMUM })}
            </span>
          ) : null}
          <Button
            type="submit"
            className="flex-1 md:flex-none"
            disabled={enCours || preparation || refus !== null}
          >
            {enCours ? t("depotEnCours") : preparation ? t("lectureDeLaCapture") : t("deposer")}
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
  const t = useTranslations("depots.formulaire");

  if (partageManque) return t("partageManque");
  if (lienSeul) return t("lienSansMatiere");

  // `restants` se compte en concepts, sur le plafond mensuel : le message doit
  // dire « ce mois-ci », pas « aujourd'hui ».
  return t("restants", { restants });
}
