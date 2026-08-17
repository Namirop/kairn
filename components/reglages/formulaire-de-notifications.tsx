"use client";

import { useActionState, useState } from "react";
import { enregistrerLesReglagesAction, type EtatDesReglages } from "@/app/(app)/reglages/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ecrireHeureDeRappel } from "@/lib/domain/heure-de-rappel";

/**
 * Ce qu'un compte peut décider de ses emails.
 *
 * Un interrupteur par décision, et l'explication de ce que la décision change
 * collée à elle : « activé » écrit dans une liste demandait de chercher où on le
 * change, et ne disait pas ce qui allait arriver.
 *
 * Le refus global gouverne les deux autres. Il est en bas et non en haut : on lit
 * d'abord ce qu'on peut recevoir, puis la porte de sortie. Coupé, les deux
 * réglages du dessus s'éteignent — c'est ce que fait aussi le lien de
 * désinscription au bas de chaque email, et les deux chemins doivent laisser le
 * compte dans le même état.
 */

/** Une décision : son nom, ce qu'elle change, son interrupteur, et sa suite. */
function Reglage({
  nom,
  intitule,
  explication,
  actif,
  onChange,
  desactive = false,
  children,
}: {
  nom: string;
  intitule: string;
  explication: string;
  actif: boolean;
  onChange: (actif: boolean) => void;
  desactive?: boolean;
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

        <Switch
          id={nom}
          name={nom}
          checked={actif}
          onCheckedChange={onChange}
          disabled={desactive}
          className="mt-pas-1 shrink-0"
        />
      </div>

      {children}
    </div>
  );
}

export function FormulaireDeNotifications({
  rappelActif,
  heureDuRappel,
  alerteActive,
  emailsActifs,
}: {
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
    <form action={envoyer} className="gap-pas-2 flex flex-col">
      <Reglage
        nom="rappel"
        intitule="Rappel quotidien"
        explication="Un email à l'heure que tu choisis, les jours où quelque chose est dû. Rien à revoir, rien n'est envoyé."
        actif={rappel && emails}
        onChange={setRappel}
        desactive={!emails}
      >
        {rappel && emails ? (
          <div className="gap-pas-3 mt-pas-3 flex flex-wrap items-center">
            <Label htmlFor="heure" className="text-petit">
              À
            </Label>
            <Input
              id="heure"
              name="heure"
              // La saisie refusée revient telle quelle : on corrige ce qu'on a
              // écrit, on ne le retape pas.
              defaultValue={etat.heure ?? ecrireHeureDeRappel(heureDuRappel)}
              key={etat.heure ?? "heure"}
              inputMode="numeric"
              autoComplete="off"
              className="max-w-24"
              aria-invalid={etat.erreur ? true : undefined}
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
        actif={alerte && emails}
        onChange={setAlerte}
        desactive={!emails}
      />

      <Reglage
        nom="emails"
        intitule="Emails"
        explication="Coupé, plus rien ne part sauf le lien de connexion — sans lui, personne ne pourrait plus entrer dans son compte."
        actif={emails}
        onChange={setEmails}
      />

      <div className="gap-pas-4 mt-pas-4 flex flex-wrap items-center">
        <Button type="submit" disabled={enCours}>
          {enCours ? "Un instant" : "Enregistrer"}
        </Button>

        {/* L'espace du message est réservé : il ne fait pas sauter la page. */}
        <p className="text-petit min-h-5" role="status" aria-live="polite">
          {etat.erreur ? <span className="text-alerte">{etat.erreur}</span> : null}
          {etat.message ? <span className="text-stone-500">{etat.message}</span> : null}
        </p>
      </div>
    </form>
  );
}
