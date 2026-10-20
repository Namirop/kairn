"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { enregistrerLesReglagesAction, type EtatDesReglages } from "@/app/(app)/reglages/actions";
import { BarreDEnregistrement } from "@/components/reglages/barre-denregistrement";
import { Reglage } from "@/components/reglages/reglage";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ecrireHeureDeRappel } from "@/lib/domain/heure-de-rappel";
import { PLAFOND_MAX, PLAFOND_MIN } from "@/lib/domain/selection-session";
import { useLangue } from "@/lib/i18n/use-langue";

/**
 * Un seul bouton pour les deux groupes : rien ne s'écrit tant qu'une saisie est
 * illisible. `BarreDEnregistrement` rattrape la distance au bouton ; ici on ne
 * tient que « quelque chose a bougé ».
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
  const t = useTranslations("compte.reglages.formulaire");
  // « 19 h » en français, « 7 pm » en anglais.
  const heureEcrite = ecrireHeureDeRappel(heureDuRappel, useLangue());

  // Un refus garde la barre, pour dire quoi corriger ; seule une réussite la
  // remet au repos.
  const [etatVu, setEtatVu] = useState(etat);

  if (etat !== etatVu) {
    setEtatVu(etat);
    if (etat.message) setModifie(false);
  }

  // Les interrupteurs n'émettent pas d'`input` : d'où leur `setModifie`.
  return (
    <form action={envoyer} onInput={() => setModifie(true)} className="gap-pas-8 flex flex-col">
      <fieldset className="gap-pas-2 flex flex-col border-0 p-0">
        <legend className={`${GROUPE} mb-pas-3`}>{t("session")}</legend>

        <Reglage
          nom="plafond"
          intitule={t("plafond.intitule")}
          explication={t("plafond.explication", { min: PLAFOND_MIN, max: PLAFOND_MAX })}
          controle={
            <Input
              id="plafond"
              name="plafond"
              // La saisie refusée revient telle quelle, à corriger, pas à retaper.
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
        <legend className={`${GROUPE} mb-pas-3`}>{t("envois")}</legend>

        <Reglage
          nom="rappel"
          intitule={t("rappel.intitule")}
          explication={t("rappel.explication")}
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
                {t("rappel.a")}
              </Label>
              <Input
                id="heure"
                name="heure"
                defaultValue={etat.heure ?? heureEcrite}
                key={etat.heure ?? "heure"}
                inputMode="numeric"
                autoComplete="off"
                className="max-w-24"
                aria-invalid={etat.heure ? true : undefined}
              />
              <p className="text-petit text-stone-500">{t("rappel.fuseau")}</p>
            </div>
          ) : (
            <input type="hidden" name="heure" value={heureEcrite} />
          )}
        </Reglage>

        <Reglage
          nom="alerte"
          intitule={t("alerte.intitule")}
          explication={t("alerte.explication")}
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
          intitule={t("emails.intitule")}
          explication={t("emails.explication")}
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
