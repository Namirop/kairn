"use client";

import { useActionState, useState } from "react";
import { enregistrerLesReglagesAction, type EtatDesReglages } from "@/app/(app)/reglages/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ecrireHeureDeRappel } from "@/lib/domain/heure-de-rappel";

/**
 * Ce qu'un compte peut décider : la longueur de sa session, et ce qu'on lui
 * envoie.
 *
 * Deux groupes, parce que ce sont deux sujets — ce qu'on fait dans le produit, et
 * ce que le produit fait sans nous. Un seul bouton pour les deux : ils
 * s'enregistrent ensemble, et rien ne s'écrit tant qu'une saisie est illisible.
 *
 * Chaque décision à deux états est un interrupteur et non une valeur écrite :
 * « activé » demandait de chercher où on le change, et ne disait pas ce qui allait
 * arriver. L'explication de ce que la décision change est collée à elle.
 */

const GROUPE = "text-mono font-mono tracking-[0.14em] text-stone-500 uppercase";

/** Une décision : son nom, ce qu'elle change, son contrôle, et sa suite. */
function Reglage({
  nom,
  intitule,
  explication,
  controle,
  children,
}: {
  nom: string;
  intitule: string;
  explication: string;
  controle: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="px-pas-4 py-pas-3 rounded-champ bg-surface-papier">
      <div className="gap-pas-4 flex items-start justify-between">
        <div>
          <Label htmlFor={nom} className="text-corps text-stone-900">
            {intitule}
          </Label>
          <p className="mt-pas-1 text-petit max-w-md text-stone-500">{explication}</p>
        </div>

        <div className="mt-pas-1 shrink-0">{controle}</div>
      </div>

      {children}
    </div>
  );
}

export function FormulaireDeReglages({
  plafond,
  rappelActif,
  heureDuRappel,
  alerteActive,
  emailsActifs,
}: {
  plafond: number;
  rappelActif: boolean;
  heureDuRappel: number;
  alerteActive: boolean;
  emailsActifs: boolean;
}) {
  const [etat, envoyer, enCours] = useActionState<EtatDesReglages, FormData>(
    enregistrerLesReglagesAction,
    {},
  );

  const [emails, setEmails] = useState(emailsActifs);
  const [rappel, setRappel] = useState(rappelActif);
  const [alerte, setAlerte] = useState(alerteActive);

  return (
    <form action={envoyer} className="gap-pas-8 flex flex-col">
      <fieldset className="gap-pas-2 flex flex-col border-0 p-0">
        <legend className={`${GROUPE} mb-pas-3`}>La session</legend>

        <Reglage
          nom="plafond"
          intitule="Concepts par session"
          explication="Au-delà, une session devient une corvée qu'on abandonne au milieu. Ce qui déborde n'est pas perdu : il reste dû, et revient en tête le lendemain."
          controle={
            <Input
              id="plafond"
              name="plafond"
              // La saisie refusée revient telle quelle : on corrige ce qu'on a
              // écrit, on ne le retape pas.
              defaultValue={etat.plafond ?? String(plafond)}
              key={etat.plafond ?? "plafond"}
              inputMode="numeric"
              autoComplete="off"
              className="w-20 text-center"
              aria-invalid={etat.plafond ? true : undefined}
            />
          }
        />
      </fieldset>

      <fieldset className="gap-pas-2 flex flex-col border-0 p-0">
        <legend className={`${GROUPE} mb-pas-3`}>Ce qu&apos;on t&apos;envoie</legend>

        <Reglage
          nom="rappel"
          intitule="Rappel quotidien"
          explication="Un email à l'heure que tu choisis, les jours où quelque chose est dû. Rien à revoir, rien n'est envoyé."
          controle={
            <Switch
              id="rappel"
              name="rappel"
              checked={rappel && emails}
              onCheckedChange={setRappel}
              disabled={!emails}
            />
          }
        >
          {rappel && emails ? (
            <div className="gap-pas-3 mt-pas-3 flex flex-wrap items-center">
              <Label htmlFor="heure" className="text-petit">
                À
              </Label>
              <Input
                id="heure"
                name="heure"
                defaultValue={etat.heure ?? ecrireHeureDeRappel(heureDuRappel)}
                key={etat.heure ?? "heure"}
                inputMode="numeric"
                autoComplete="off"
                className="max-w-24"
                aria-invalid={etat.heure ? true : undefined}
              />
              <p className="text-petit text-stone-500">dans ton fuseau.</p>
            </div>
          ) : (
            <input type="hidden" name="heure" value={ecrireHeureDeRappel(heureDuRappel)} />
          )}
        </Reglage>

        <Reglage
          nom="alerte"
          intitule="Alerte de série"
          explication="Le soir, seulement si ta série est en cours, que rien n'a été revu et qu'il reste quelque chose à faire. La plupart des jours, elle ne part pas."
          controle={
            <Switch
              id="alerte"
              name="alerte"
              checked={alerte && emails}
              onCheckedChange={setAlerte}
              disabled={!emails}
            />
          }
        />

        <Reglage
          nom="emails"
          intitule="Emails"
          explication="Coupé, plus rien ne part sauf le code de connexion — sans lui, personne ne pourrait plus entrer dans son compte."
          controle={
            <Switch id="emails" name="emails" checked={emails} onCheckedChange={setEmails} />
          }
        />
      </fieldset>

      <div className="gap-pas-4 flex flex-wrap items-center">
        <Button type="submit" disabled={enCours}>
          {enCours ? "Un instant" : "Enregistrer"}
        </Button>

        {/* L'espace du message est réservé : il ne fait pas sauter la page. */}
        <p className="text-petit min-h-5 max-w-md" role="status" aria-live="polite">
          {etat.erreur ? <span className="text-alerte">{etat.erreur}</span> : null}
          {etat.message ? <span className="text-stone-500">{etat.message}</span> : null}
        </p>
      </div>
    </form>
  );
}
