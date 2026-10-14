"use client";

import { useCallback, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  principeVuAction,
  sentrainerAction,
  tourSuivantAction,
} from "@/app/(app)/entrainement/actions";
import { Panneau } from "@/components/coquille/panneau";
import { PileDePanneaux } from "@/components/coquille/pile-de-panneaux";
import { PrincipeDeLentrainement } from "@/components/entrainement/principe-de-lentrainement";
import { DerouleQuestions, type PassageDonne } from "@/components/revision/deroule-questions";
import { EnTeteDeScene } from "@/components/revision/en-tete-de-scene";
import { Palier } from "@/components/revision/palier";
import { SceneDeSession } from "@/components/revision/scene-de-session";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/auth/routes";
import type { QuestionServie } from "@/lib/db/question-servie";

/**
 * Un tour d'entraînement, puis le suivant si on en redemande. Aucun compte de
 * fin, aucun score : rien ici ne se cumule.
 */

/**
 * Ce qui encadre les écrans hors tour (le principe, la fin) : un panneau
 * ordinaire. La fin, un palier, se centre ; le principe se lit de haut en bas.
 */
function Cadre({ centre = false, children }: { centre?: boolean; children: ReactNode }) {
  return (
    <PileDePanneaux>
      <Panneau surface="papier" mesure="texte" remplit centre={centre} className="md:py-pas-16">
        <div className="flex w-full flex-col">{children}</div>
      </Panneau>
    </PileDePanneaux>
  );
}
export function TourDentrainement({
  premierTour,
  principeVu,
}: {
  premierTour: QuestionServie[];
  principeVu: boolean;
}) {
  const t = useTranslations("revision.entrainement");
  const [explique, setExplique] = useState(principeVu);
  const [questions, setQuestions] = useState(premierTour);
  const [tourFini, setTourFini] = useState(false);
  const [charge, setCharge] = useState(false);

  const repondre = useCallback(
    (passage: PassageDonne) =>
      sentrainerAction({
        atomId: passage.question.atomId,
        variantId: passage.question.variantId,
        note: passage.note,
        tempsMs: passage.tempsMs,
      }),
    [],
  );

  const encore = useCallback(async () => {
    setCharge(true);

    const suivant = await tourSuivantAction();

    setQuestions(suivant);
    setTourFini(false);
    setCharge(false);
  }, []);

  if (!explique) {
    return (
      <Cadre>
        <PrincipeDeLentrainement
          onCommencer={() => {
            setExplique(true);
            void principeVuAction();
          }}
        />
      </Cadre>
    );
  }

  if (tourFini || questions.length === 0) {
    const vide = questions.length === 0;

    return (
      <Cadre centre>
        <Palier
          intitule={t("intitule")}
          titre={vide ? t("fin.videTitre") : t("fin.titre")}
          explication={vide ? t("fin.vide") : t("fin.texte")}
          bouton={
            vide ? undefined : (
              <Button type="button" disabled={charge} onClick={() => void encore()}>
                {charge ? t("fin.unInstant") : t("fin.encore")}
              </Button>
            )
          }
          action={
            vide ? { libelle: t("fin.deposer"), href: `${ROUTES.depots}/nouveau` } : undefined
          }
          secondaire={{ libelle: t("fin.retourAujourdhui"), href: ROUTES.aujourdhui }}
        />
      </Cadre>
    );
  }

  return (
    // Pas de rail ni de pile : un tour s'arrête quand on veut, une pile à
    // monter promettrait une fin. Le cairn appartient à la session du jour.
    <SceneDeSession
      enTete={
        <EnTeteDeScene
          intitule={t("intitule")}
          precision={t("precision")}
          intituleEnMarge
          sortie={{
            titre: t("arreterTitre"),
            consequence: t("consequence"),
          }}
        />
      }
      mention={t("intitule")}
    >
      <DerouleQuestions
        key={questions.map((question) => question.variantId).join()}
        questions={questions}
        chiffree={false}
        onRepondre={repondre}
        onFini={() => setTourFini(true)}
      />
    </SceneDeSession>
  );
}
