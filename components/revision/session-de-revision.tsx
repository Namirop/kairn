"use client";

import { useCallback, useRef, useState } from "react";
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
  jour,
  serie,
  rappel,
  expliquerLEspacement = false,
}: {
  questions: QuestionServie[];
  /** Le jour de la session, déjà écrit dans le fuseau de l'utilisateur. */
  jour: string;
  serie: number;
  /** Quand tombe le prochain rappel quotidien. Nul s'il est coupé. */
  rappel: ProchainRappel | null;
  expliquerLEspacement?: boolean;
}) {
  const [termine, setTermine] = useState(false);
  const [faites, setFaites] = useState(0);
  const [revus, setRevus] = useState(0);
  const [carte, setCarte] = useState<{ atomId: string; concept: string } | null>(null);
  const [sorti, setSorti] = useState<{ atomId: string; concept: string } | null>(null);

  // Une ref plutôt qu'un état : la fin de session la lit dans la foulée du
  // dernier envoi, avant qu'un rendu ait eu lieu.
  const eligibles = useRef<string[]>([]);

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

  // La session finie, il n'y a plus de chemin à montrer : l'écran redevient une
  // pile de panneaux, comme le reste de l'application.
  if (termine || questions.length === 0) {
    return (
      <PileDePanneaux>
        <Panneau surface="papier" mesure="texte" remplit centre className="md:py-pas-16">
          <FinDeSession revus={revus} carte={carte} expliquerLEspacement={expliquerLEspacement} />
        </Panneau>
      </PileDePanneaux>
    );
  }

  return (
    // « Session » va en marge, la date reste dans l'en-tête. Le mot de marge est
    // un objet graphique — il nomme le mode, et c'est vrai de la première
    // question à la dernière ; la date est ce qui change, et ce qui change se lit
    // là où l'on lit, pas dans une colonne de lettres couchées.
    <SceneDeSession
      enTete={<EnTeteDeScene intitule="Session" precision={jour} intituleEnMarge />}
      mention="Session"
      rail={
        <EtatDeSession faites={faites} total={questions.length} serie={serie} rappel={rappel} />
      }
    >
      {sorti ? <SortiDuCycle concept={sorti} onAnnule={() => setSorti(null)} /> : null}

      <DerouleQuestions
        questions={questions}
        onRepondre={repondre}
        onFini={(comptes) => void terminer(comptes)}
        onAvance={setFaites}
        actions={({ enCours, valider }) => (
          <SortieDuCycleAction enCours={enCours} onSortir={() => void valider("EASY", true)} />
        )}
      />
    </SceneDeSession>
  );
}
