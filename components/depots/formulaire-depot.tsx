"use client";

import { useActionState, useRef, useState } from "react";
import { Paperclip, X } from "lucide-react";
import { deposerAction, type EtatDepot } from "@/app/(app)/depots/actions";
import { ExemplesDeDepot } from "@/components/depots/exemples-de-depot";
import { Button } from "@/components/ui/button";

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
 */

const CARACTERES_MAXIMUM = 8000;

/** Au-delà, on montre le compteur : avant, il n'apprend rien à personne. */
const SEUIL_COMPTEUR = 6000;

export function FormulaireDepot({
  restants,
  cleEnvoi,
  invite,
  premierDepot = false,
}: {
  restants: number;
  cleEnvoi: string;
  /** Tirée côté serveur : un tirage ici ferait diverger le rendu de l'hydratation. */
  invite: string;
  /** Le compte n'a encore rien déposé : les exemples remplacent l'explication. */
  premierDepot?: boolean;
}) {
  const [etat, action, enCours] = useActionState<EtatDepot, FormData>(deposerAction, {});
  const [texte, setTexte] = useState("");
  const [capture, setCapture] = useState<string | null>(null);
  const fichier = useRef<HTMLInputElement>(null);
  const trop = texte.length > CARACTERES_MAXIMUM;

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
          onChange={(evenement) => setTexte(evenement.target.value)}
          placeholder={invite}
          className="p-pas-4 text-corps field-sizing-content min-h-56 w-full resize-y rounded-xs border border-stone-300 bg-stone-50 leading-relaxed text-stone-900 placeholder:text-stone-500"
        />
      </div>

      <div className="gap-pas-4 flex flex-wrap items-center justify-between">
        <div className="gap-pas-3 flex items-center">
          {/* C'est le bouton qui porte l'action, au clavier comme à la souris :
              le champ lui-même sort du parcours pour ne pas faire doublon. */}
          <input
            ref={fichier}
            id="image"
            name="image"
            type="file"
            accept="image/*"
            tabIndex={-1}
            aria-hidden
            className="sr-only"
            onChange={(evenement) => setCapture(evenement.target.files?.[0]?.name ?? null)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fichier.current?.click()}
          >
            <Paperclip aria-hidden />
            {capture ? "Changer la capture" : "Joindre une capture"}
          </Button>

          {capture ? (
            <span className="gap-pas-2 text-petit flex items-center text-stone-500">
              <span className="max-w-48 truncate">{capture}</span>
              <button
                type="button"
                aria-label="Retirer la capture"
                className="rounded-xs text-stone-500 transition-colors hover:text-stone-900"
                onClick={() => {
                  setCapture(null);
                  if (fichier.current) fichier.current.value = "";
                }}
              >
                <X aria-hidden className="size-4" />
              </button>
            </span>
          ) : null}
        </div>

        <div className="gap-pas-4 flex items-center">
          {texte.length > SEUIL_COMPTEUR ? (
            <span
              className={`text-mono font-mono tabular-nums ${trop ? "text-alerte" : "text-stone-500"}`}
            >
              {texte.length.toLocaleString("fr-FR")} / {CARACTERES_MAXIMUM.toLocaleString("fr-FR")}
            </span>
          ) : null}
          <Button type="submit" disabled={enCours || trop}>
            {enCours ? "Dépôt en cours…" : "Déposer"}
          </Button>
        </div>
      </div>

      {/* L'espace du message est réservé : l'apparition d'une erreur ne doit pas
          décaler ce qui est au-dessus. */}
      <p className="text-petit min-h-5 text-stone-500" role="status" aria-live="polite">
        {etat.erreur ? (
          <span className="text-alerte">{etat.erreur}</span>
        ) : (
          // Ce qui reste se compte en concepts : une phrase en consomme un, un
          // article en consomme huit. C'est la matière qui est plafonnée, pas
          // le nombre de fois qu'on colle quelque chose.
          `Il te reste ${restants} ${restants === 1 ? "concept" : "concepts"} à retenir aujourd'hui.`
        )}
      </p>
    </form>
  );
}
