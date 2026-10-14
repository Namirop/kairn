"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { reclamerMaitriseAction, repondreAction } from "@/app/(app)/reviser/actions";
import { Panneau } from "@/components/coquille/panneau";
import { PileDePanneaux } from "@/components/coquille/pile-de-panneaux";
import { DerouleQuestions, type PassageDonne } from "@/components/revision/deroule-questions";
import { EnTeteDeScene } from "@/components/revision/en-tete-de-scene";
import { EtatDeSession } from "@/components/revision/etat-de-session";
import { FinDeSession } from "@/components/revision/fin-de-session";
import { SceneDeSession } from "@/components/revision/scene-de-session";
import { SortiDuCycle } from "@/components/revision/sortie-du-cycle";
import { SortieDuCycleAction } from "@/components/revision/sortie-du-cycle-action";
import type { QuestionServie } from "@/lib/db/question-servie";
import type { ProchainRappel } from "@/lib/domain/prochain-rappel";

/**
 * La session du jour.
 *
 * Chaque passage est écrit dès qu'il est donné : une session interrompue à la
 * troisième question sur dix garde ses trois révisions. Personne ne perd son
 * travail parce qu'il a fermé un onglet.
 *
 * Ce qui est propre à ce mode et à lui seul : la replanification, la sortie du
 * cycle, et la carte de maîtrise réclamée à la fin.
 */
export function SessionDeRevision({
  questions,
  vide,
  jour,
  serie,
  rappel,
  expliquerLEspacement = false,
}: {
  questions: QuestionServie[];
  /**
   * Ce qu'on montre quand il n'y a rien à poser, rendu par la page. Il arrive
   * tout fait pour que l'écran de fin survive à un rafraîchissement du serveur :
   * voir `/reviser/page.tsx`.
   */
  vide: ReactNode;
  /** Le jour de la session, déjà écrit dans le fuseau de l'utilisateur. */
  jour: string;
  serie: number;
  /** Quand tombe le prochain rappel quotidien. Nul s'il est coupé. */
  rappel: ProchainRappel | null;
  expliquerLEspacement?: boolean;
}) {
  /*
    La liste est gelée au premier rendu. Le serveur ne renvoie plus les concepts
    déjà répondus : toute relecture de la route rendrait une liste plus courte,
    et le rang tenu par le client désignerait la question d'après. Gelée, elle
    permet de revalider le tableau de bord à chaque réponse. Quitter l'écran
    démonte le composant et la liste se refait, comme voulu.
  */
  const [liste] = useState(questions);
  const t = useTranslations("revision.session");
  const [termine, setTermine] = useState(false);
  const [faites, setFaites] = useState(0);
  const [revus, setRevus] = useState(0);
  const [carte, setCarte] = useState<{ atomId: string; concept: string } | null>(null);
  const [sorti, setSorti] = useState<{ atomId: string; concept: string } | null>(null);
  // Une réponse est sous les yeux sans être notée : la porte de sortie le dit,
  // et écrit le passage avant de partir.
  const [enSuspens, setEnSuspens] = useState(false);

  // Une ref plutôt qu'un état : la fin de session la lit dans la foulée du
  // dernier envoi, avant qu'un rendu ait eu lieu.
  const eligibles = useRef<string[]>([]);
  // La fonction en ref, seul le booléen en état : sinon chaque nouvelle
  // fermeture relancerait un rendu à chaque frappe.
  const viderLeSuspens = useRef<(() => Promise<void>) | null>(null);

  const suivreLeSuspens = useCallback((abandonner: (() => Promise<void>) | null) => {
    viderLeSuspens.current = abandonner;
    setEnSuspens(abandonner !== null);
  }, []);

  const repondre = useCallback(async (passage: PassageDonne): Promise<boolean> => {
    const resultat = await repondreAction({
      atomId: passage.question.atomId,
      variantId: passage.question.variantId,
      note: passage.note,
      tempsMs: passage.tempsMs,
      maitrise: passage.maitrise,
    });

    if (!resultat.ok) return false;

    if (resultat.signal) eligibles.current = [...eligibles.current, passage.question.atomId];

    if (passage.maitrise) {
      setSorti({ atomId: passage.question.atomId, concept: passage.question.concept });
    } else {
      setSorti(null);
    }

    return true;
  }, []);

  const terminer = useCallback(async (comptes: number) => {
    const reclamee =
      eligibles.current.length > 0 ? await reclamerMaitriseAction(eligibles.current) : null;

    setCarte(reclamee);
    setRevus(comptes);
    setTermine(true);
  }, []);

  // `termine` passe avant le compte de questions : une session finie a vidé ce
  // qui était dû, et si la liste vide décidait, l'écran de fin s'effacerait
  // devant « tu es à jour » au premier rafraîchissement.
  if (termine) {
    return (
      <PileDePanneaux>
        <Panneau surface="papier" mesure="texte" remplit centre className="md:py-pas-16">
          <FinDeSession
            revus={revus}
            carte={carte}
            // L'heure seule, pas le jour : la fin de session parle toujours de
            // demain — la journée est faite, et le cron n'écrit qu'à qui a
            // quelque chose à revoir.
            heureDuRappel={rappel?.heure ?? null}
            expliquerLEspacement={expliquerLEspacement}
          />
        </Panneau>
      </PileDePanneaux>
    );
  }

  if (liste.length === 0) return vide;

  return (
    // « Session » va en marge (il nomme le mode, constant), la date reste dans
    // l'en-tête : ce qui change se lit là où l'on lit.
    <SceneDeSession
      enTete={
        <EnTeteDeScene
          intitule={t("intitule")}
          precision={jour}
          intituleEnMarge
          sortie={{
            titre: t("arreterTitre"),
            /*
              Partir sans se noter après avoir lu la réponse s'écrit comme un
              échec (sinon on gagnerait du temps sans rien savoir), et la
              phrase le dit avant.
            */
            consequence: enSuspens ? t("consequenceEnSuspens") : t("consequence"),
            avantDeSortir: enSuspens
              ? () => viderLeSuspens.current?.() ?? Promise.resolve()
              : undefined,
            rafraichirLeTableau: true,
          }}
        />
      }
      mention={t("intitule")}
      rail={<EtatDeSession faites={faites} total={liste.length} serie={serie} rappel={rappel} />}
    >
      {sorti ? <SortiDuCycle concept={sorti} onAnnule={() => setSorti(null)} /> : null}

      <DerouleQuestions
        questions={liste}
        onRepondre={repondre}
        onFini={(comptes) => void terminer(comptes)}
        onAvance={setFaites}
        onSuspens={suivreLeSuspens}
        actions={({ enCours, valider }) => (
          <SortieDuCycleAction enCours={enCours} onSortir={() => void valider("EASY", true)} />
        )}
      />
    </SceneDeSession>
  );
}
