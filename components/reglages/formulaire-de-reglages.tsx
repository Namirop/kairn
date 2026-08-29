"use client";

import { useActionState, useEffect, useState } from "react";
import { enregistrerLesReglagesAction, type EtatDesReglages } from "@/app/(app)/reglages/actions";
import { BarreDEnregistrement } from "@/components/reglages/barre-denregistrement";
import { Reglage } from "@/components/reglages/reglage";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ecrireHeureDeRappel } from "@/lib/domain/heure-de-rappel";
import { PLAFOND_MAX, PLAFOND_MIN } from "@/lib/domain/selection-session";

/**
 * Ce qu'un compte peut décider : la longueur de sa session, et ce qu'on lui
 * envoie.
 *
 * Deux groupes, parce que ce sont deux sujets — ce qu'on fait dans le produit, et
 * ce que le produit fait sans nous. Un seul bouton pour les deux : ils
 * s'enregistrent ensemble, et rien ne s'écrit tant qu'une saisie est illisible.
 *
 * Ce bouton unique a un prix, et c'est le formulaire qui le paie : entre la
 * valeur qu'on change et le geste qui l'écrit, il y a la hauteur de tout le
 * reste. `BarreDEnregistrement` s'en charge — ici on ne tient que la question
 * qu'elle pose : est-ce que quelque chose a bougé depuis la dernière écriture.
 *
 * Chaque décision à deux états est un interrupteur et non une valeur écrite :
 * « activé » demandait de chercher où on le change, et ne disait pas ce qui allait
 * arriver. L'explication de ce que la décision change est collée à elle.
 */

const GROUPE = "text-mono font-mono tracking-[0.14em] text-stone-500 uppercase";

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
  const [modifie, setModifie] = useState(false);

  /*
    Une écriture réussie remet le formulaire au repos, un refus non.

    Un refus laisse une valeur en attente — celle qu'on vient de taper de
    travers — et la barre doit rester là pour le dire, avec le message qui
    explique quoi corriger. La ranger reviendrait à annoncer que c'est écrit
    alors que la saisie a été rejetée.
  */
  useEffect(() => {
    if (etat.message) setModifie(false);
  }, [etat]);

  // Une frappe suffit à ouvrir l'attente : `input` remonte des deux champs de
  // texte. Les interrupteurs, eux, n'émettent rien qui remonte jusqu'ici, et le
  // disent chacun dans son geste.
  return (
    <form action={envoyer} onInput={() => setModifie(true)} className="gap-pas-8 flex flex-col">
      <fieldset className="gap-pas-2 flex flex-col border-0 p-0">
        <legend className={`${GROUPE} mb-pas-3`}>La session</legend>

        <Reglage
          nom="plafond"
          intitule="Concepts par session"
          explication={`De ${PLAFOND_MIN} à ${PLAFOND_MAX}. Au-delà, une session devient une corvée qu'on abandonne au milieu, et ce qui déborde n'est pas perdu : il reste dû, et revient en tête le lendemain.`}
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
              onCheckedChange={(pose) => {
                setRappel(pose);
                setModifie(true);
              }}
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
              onCheckedChange={(pose) => {
                setAlerte(pose);
                setModifie(true);
              }}
              disabled={!emails}
            />
          }
        />

        <Reglage
          nom="emails"
          intitule="Emails"
          explication="Coupé, plus rien ne part sauf le code de connexion — sans lui, personne ne pourrait plus entrer dans son compte."
          controle={
            <Switch
              id="emails"
              name="emails"
              checked={emails}
              onCheckedChange={(pose) => {
                setEmails(pose);
                setModifie(true);
              }}
            />
          }
        />
      </fieldset>

      <BarreDEnregistrement
        modifie={modifie}
        enCours={enCours}
        message={etat.message}
        erreur={etat.erreur}
      />
    </form>
  );
}
