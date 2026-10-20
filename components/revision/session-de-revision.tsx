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
 * La session du jour. Chaque passage s'écrit dès qu'il est donné : fermer
 * l'onglet en route ne perd rien. Propres à ce mode : la replanification, la
 * sortie du cycle et la carte de maîtrise réclamée à la fin.
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
   * Rien à poser. Rendu par la page, pour que l'écran de fin survive à un
   * rafraîchissement du serveur (voir `/reviser/page.tsx`).
   */
  vide: ReactNode;
  /** Déjà écrit dans le fuseau de l'utilisateur. */
  jour: string;
  serie: number;
  /** Nul si le rappel quotidien est coupé. */
  rappel: ProchainRappel | null;
  expliquerLEspacement?: boolean;
}) {
  // Gelée au premier rendu : le serveur ne renvoie plus les concepts répondus,
  // et une relecture de la route raccourcirait la liste sous le rang tenu ici.
  // C'est ce qui permet de revalider le tableau de bord à chaque réponse.
  const [liste] = useState(questions);
  const t = useTranslations("revision.session");
  const [termine, setTermine] = useState(false);
  const [faites, setFaites] = useState(0);
  const [revus, setRevus] = useState(0);
  const [carte, setCarte] = useState<{ atomId: string; concept: string } | null>(null);
  const [sorti, setSorti] = useState<{ atomId: string; concept: string } | null>(null);
  // Une réponse lue mais pas notée : la sortie le dit, et écrit le passage.
  const [enSuspens, setEnSuspens] = useState(false);

  // Ref : la fin de session la lit juste après le dernier envoi, avant tout rendu.
  const eligibles = useRef<string[]>([]);
  // La fonction en ref : en état, chaque nouvelle fermeture relancerait un rendu
  // à chaque frappe.
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

  // Avant la liste vide : sinon un rafraîchissement remplacerait l'écran de fin
  // par « tu es à jour ».
  if (termine) {
    return (
      <PileDePanneaux>
        <Panneau surface="papier" mesure="texte" remplit centre className="md:py-pas-16">
          <FinDeSession
            revus={revus}
            carte={carte}
            // L'heure seule : la fin de session parle toujours de demain.
            heureDuRappel={rappel?.heure ?? null}
            expliquerLEspacement={expliquerLEspacement}
          />
        </Panneau>
      </PileDePanneaux>
    );
  }

  if (liste.length === 0) return vide;

  return (
    // Le mode, constant, va en marge ; la date, qui change, reste dans l'en-tête.
    <SceneDeSession
      enTete={
        <EnTeteDeScene
          intitule={t("intitule")}
          precision={jour}
          intituleEnMarge
          sortie={{
            titre: t("arreterTitre"),
            // Partir sans se noter après avoir lu la réponse compte comme un
            // échec, sinon on gagnerait du temps sans rien savoir.
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
