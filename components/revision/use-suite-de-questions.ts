"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { useChronometre } from "@/components/revision/use-chronometre";
import type { QuestionServie } from "@/lib/db/question-servie";
import type { ReviewRating } from "@/lib/db/types";
import { noteApresAide, pistesDuTrou } from "@/lib/domain/aide-du-trou";
import { reponseAcceptee } from "@/lib/domain/reponse-cloze";

/**
 * La mécanique d'une suite de questions. Elle ignore le mode (session ou
 * entraînement, c'est `onRepondre`) mais connaît la justesse : elle choisit la note.
 */

export type PassageDonne = {
  question: QuestionServie;
  note: ReviewRating;
  tempsMs: number;
  /** La personne a déclaré maîtriser le concept. Session du jour seulement. */
  maitrise: boolean;
};

/** Écrit le passage et enchaîne. Ce qu'un mode ajoute sous la carte s'en sert. */
export type Valider = (note: ReviewRating, maitrise?: boolean) => Promise<void>;

/** Ce qu'une saisie de texte à trou a donné. Rien encore, juste, ou à côté. */
export type VerdictDuTrou = null | "JUSTE" | "RATE";

/** Partagé par l'énoncé et le champ : le trou de la phrase suit la frappe, puis montre le terme attendu. */
export type TexteATrou = {
  saisie: string;
  saisir: (valeur: string) => void;
  verdict: VerdictDuTrou;
  /** Le terme attendu, tel que la génération l'a écrit en premier. */
  attendu: string;
  /** Ce qui comble le trou : la saisie en cours, puis le terme attendu. */
  comble: string | null;
  /** Vide quand la question ne peut pas réduire honnêtement le champ (`lib/domain/aide-du-trou.ts`). */
  pistes: string[];
  /** Le coup de pouce a été demandé : les pistes sont à l'écran, et il se paie. */
  aide: boolean;
  demanderDeLaide: () => void;
  /** Note le passage, en tenant compte de l'aide. Le seul chemin de ce format. */
  juger: (note: ReviewRating) => void;
};

export function useSuiteDeQuestions({
  questions,
  onRepondre,
  onFini,
  onAvance,
}: {
  questions: QuestionServie[];
  onRepondre: (passage: PassageDonne) => Promise<boolean>;
  onFini: (revus: number) => void;
  onAvance?: (faites: number) => void;
}) {
  const [rang, setRang] = useState(0);
  const [choisi, setChoisi] = useState<number | null>(null);
  const [revelee, setRevelee] = useState(false);
  const [saisie, setSaisie] = useState("");
  const [verdict, setVerdict] = useState<VerdictDuTrou>(null);
  // Une réponse est produite : renoncer n'a plus de sens.
  const [engage, setEngage] = useState(false);
  // Coup de pouce sur la question courante : un cran de note en moins.
  const [aide, setAide] = useState(false);
  const [jetee, setJetee] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [ecrit, setEcrit] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [revus, setRevus] = useState(0);
  const t = useTranslations("revision.question");

  const question = questions[rang];
  const chronometre = useChronometre(rang);
  const attendu = question?.cloze?.accepted[0] ?? "";

  const arreter = useCallback(() => {
    chronometre.arreter();
    setEngage(true);
  }, [chronometre]);

  const enregistrer = useCallback(
    async (note: ReviewRating, maitrise = false): Promise<boolean> => {
      if (!question || enCours) return false;

      arreter();
      setEnCours(true);
      setErreur(null);

      const ok = await onRepondre({ question, note, tempsMs: chronometre.mesure(), maitrise });

      setEnCours(false);

      if (!ok) {
        setErreur(t("erreurPassage"));
        return false;
      }

      setRevus((compte) => compte + 1);
      setEcrit(true);

      return true;
    },
    [arreter, chronometre, enCours, onRepondre, question, t],
  );

  const avancer = useCallback(
    (comptes: number) => {
      onAvance?.(rang + 1);

      if (rang + 1 >= questions.length) {
        onFini(comptes);
        return;
      }

      setChoisi(null);
      setRevelee(false);
      setSaisie("");
      setVerdict(null);
      setEngage(false);
      setAide(false);
      setJetee(false);
      setEcrit(false);
      setRang(rang + 1);
    },
    [onAvance, onFini, questions.length, rang],
  );

  /**
   * Écrit en `AGAIN` le passage engagé mais pas noté, avant de quitter : sinon la
   * réponse vue serait reposée telle quelle, l'espacement réglé sur un rappel qui
   * n'a pas eu lieu. Voir la réponse sans se situer ne démontre rien.
   */
  const abandonner = useCallback(async () => {
    if (!engage || ecrit) return;

    await enregistrer("AGAIN");
  }, [ecrit, engage, enregistrer]);

  const suivre: Valider = async (note, maitrise = false) => {
    // Justesse connue : le passage est parti à la réponse. S'il a échoué, on le
    // retente ici plutôt que de laisser filer une réponse donnée.
    if (ecrit && !maitrise) {
      avancer(revus);
      return;
    }

    if (await enregistrer(note, maitrise)) avancer(revus + 1);
  };

  return {
    question,
    rang,
    total: questions.length,
    dernier: rang + 1 >= questions.length,
    enCours,
    erreur,
    choisi,
    revelee,
    jetee,
    engage,
    trou: {
      saisie,
      saisir: setSaisie,
      verdict,
      attendu,
      // Le terme attendu aussi quand on renonce : c'est la phrase juste qu'on apprend.
      comble: verdict === null && !jetee ? saisie.trim() || null : attendu,
      // Graine = la question : ordre stable d'un affichage à l'autre, sans que le
      // terme attendu tombe toujours au même rang.
      pistes: question?.cloze
        ? pistesDuTrou(attendu, question.cloze.leurres, question.variantId)
        : [],
      aide,
      demanderDeLaide: () => setAide(true),
      juger: (note) => void suivre(noteApresAide(note, aide)),
    } satisfies TexteATrou,
    arreter,
    suivre,
    choisir: (index: number) => {
      if (choisi !== null || !question) return;

      arreter();
      setChoisi(index);
      void enregistrer(index === question.correctIndex ? "GOOD" : "AGAIN");
    },
    reveler: () => {
      arreter();
      setRevelee(true);
    },
    // Juste, le passage part tout de suite : la lecture de la confirmation ne
    // compte pas, et rien ne se perd si l'onglet se ferme.
    verifier: () => {
      if (!question?.cloze || saisie.trim().length === 0) return;

      arreter();

      if (!reponseAcceptee(saisie, question.cloze.accepted)) {
        setVerdict("RATE");
        return;
      }

      setVerdict("JUSTE");
      // Gratuite, l'aide deviendrait le geste par défaut.
      void enregistrer(noteApresAide("GOOD", aide));
    },
    jeter: () => {
      setJetee(true);
      void enregistrer("AGAIN");
    },
    /** Une réponse est sous les yeux et rien n'est encore parti. */
    enSuspens: engage && !ecrit,
    abandonner,
  };
}
