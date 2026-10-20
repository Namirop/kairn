"use client";
// i18n-ignore-fichier — outil de l'administrateur, qui reste en français par décision du 08/10/2026.

import { useActionState } from "react";
import { poserLesReglagesAction, type EtatDesReglages } from "@/app/(app)/admin/actions";
import { Champ, Interrupteur } from "@/components/administration/champs-de-reglage";
import { Section } from "@/components/administration/section";
import { Button } from "@/components/ui/button";
import type { ReglagesPosés } from "@/lib/db/reglages";

/**
 * Changeables *pendant* un incident, sans redéploiement : la configuration est
 * relue à chaque appel. `ADMIN_EMAILS` n'y sera jamais : la liste qui ouvre cet
 * écran ne se modifie pas depuis lui.
 */

const VIDE: EtatDesReglages = {};

export function BlocReglages({
  poses,
  environnement,
}: {
  poses: ReglagesPosés;
  environnement: Record<string, string | undefined>;
}) {
  const [etat, action, enCours] = useActionState(poserLesReglagesAction, VIDE);

  return (
    <Section
      intitule="Réglages"
      contexte="Un champ vide laisse la variable d'environnement décider. Une valeur posée s'applique au prochain appel, sans redéploiement."
    >
      <form action={action} noValidate className="gap-pas-4 flex flex-col">
        <Interrupteur
          nom="enabled"
          intitule="Appels au modèle"
          defaut={poses.enabled}
          environnement={environnement.AI_ENABLED}
          actif="autorisés"
          coupe="coupés"
        />
        <Interrupteur
          nom="mock"
          intitule="Mode mock"
          defaut={poses.mock}
          environnement={environnement.MOCK_AI}
          actif="fixtures"
          coupe="vrais appels"
        />
        <Champ
          nom="dailyCallCap"
          intitule="Plafond global par jour"
          defaut={poses.dailyCallCap}
          environnement={environnement.AI_DAILY_CALL_CAP}
        />
        <Champ
          nom="userDailyCallCap"
          intitule="Plafond par compte et par jour"
          defaut={poses.userDailyCallCap}
          environnement={environnement.AI_DAILY_CALL_CAP_PAR_COMPTE}
        />
        <Champ
          nom="anonymousDailyCallCap"
          intitule="Plafond des essais sans compte, par jour"
          defaut={poses.anonymousDailyCallCap}
          environnement={environnement.AI_DAILY_CALL_CAP_ANONYME}
        />
        <Champ
          nom="maxTokens"
          intitule="Tokens de sortie par appel"
          defaut={poses.maxTokens}
          environnement={environnement.AI_MAX_TOKENS}
        />
        <Champ
          nom="model"
          intitule="Modèle"
          defaut={poses.model}
          environnement={environnement.AI_MODEL}
          texte
        />

        <div className="gap-pas-4 mt-pas-2 flex flex-wrap items-center">
          <Button type="submit" disabled={enCours}>
            {enCours ? "Enregistrement…" : "Poser ces réglages"}
          </Button>
          <p className="text-petit min-h-5" role="status" aria-live="polite">
            {etat.erreur ? <span className="text-alerte">{etat.erreur}</span> : etat.message}
          </p>
        </div>
      </form>
    </Section>
  );
}
