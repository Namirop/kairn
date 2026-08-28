"use client";

import { useCallback, useState } from "react";
import { useChronometre } from "@/components/revision/use-chronometre";
import type { QuestionServie } from "@/lib/db/question-servie";
import type { ReviewRating } from "@/lib/db/types";
import { noteApresAide, pistesDuTrou } from "@/lib/domain/aide-du-trou";
import { reponseAcceptee } from "@/lib/domain/reponse-cloze";

/**
 * La mécanique d'une suite de questions : ce qui est écrit, ce qui avance, et où
 * en est le geste de réponse de la question courante.
 *
 * Elle vivait dans le composant qui dessine la carte, et les deux ensemble
 * dépassaient la taille où un fichier reste lisible. Ce sont bien deux choses :
 * ici on décide quand un passage part et quand on passe à la suivante ; là on
 * décide de ce que ça donne à voir.
 *
 * Elle ne sait rien de ce qu'on écrit derrière : la session du jour replanifie,
 * l'entraînement libre ne touche à rien, et ça se décide dans `onRepondre`. Elle
 * connaît en revanche la justesse — un choix se compare à son index, une saisie
 * à ses formes acceptées —, parce que c'est elle qui décide quelle note part.
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

/**
 * L'état d'un texte à trou, partagé par l'énoncé et le champ.
 *
 * Le trou de la phrase se remplit à la frappe, et la phrase est en titre, donc
 * au-dessus du champ : l'état ne peut pas vivre dans le champ. C'est aussi ce
 * qui permet, une fois vérifié, de montrer le terme attendu **dans** la phrase
 * plutôt que de la redire en dessous.
 */
export type TexteATrou = {
  saisie: string;
  saisir: (valeur: string) => void;
  verdict: VerdictDuTrou;
  /** Le terme attendu, tel que la génération l'a écrit en premier. */
  attendu: string;
  /** Ce qui comble le trou : la saisie en cours, puis le terme attendu. */
  comble: string | null;
  /**
   * Les termes proposés à qui sèche, ou rien quand la question n'a pas de quoi
   * réduire honnêtement le champ. Voir `lib/domain/aide-du-trou.ts`.
   */
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
  // Une réponse a été produite : le geste de renoncement n'a plus de sens.
  const [engage, setEngage] = useState(false);
  // Le coup de pouce a été demandé sur cette question-là : il fait descendre la
  // note d'un cran, et il se remet à faux en passant à la suivante.
  const [aide, setAide] = useState(false);
  const [jetee, setJetee] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [ecrit, setEcrit] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [revus, setRevus] = useState(0);

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
        setErreur("Ce passage n'a pas pu être enregistré. Réessaie.");
        return false;
      }

      setRevus((compte) => compte + 1);
      setEcrit(true);

      return true;
    },
    [arreter, chronometre, enCours, onRepondre, question],
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
   * Le passage engagé mais pas encore noté, écrit avant de quitter la session.
   *
   * **C'était la faille de la porte de sortie.** On demande à voir la réponse,
   * on la lit, on clique « Arrêter là » — et rien n'est enregistré : ni la
   * question, ni le fait qu'on l'ait vue. En revenant, la même question est
   * reposée, réponse déjà connue, et l'espacement se règle sur un rappel qui n'a
   * pas eu lieu. C'est le seul endroit du produit où l'on peut se mentir à
   * soi-même sans le vouloir.
   *
   * La note est `AGAIN`, et c'est la seule honnête : quelqu'un qui a vu la
   * réponse et qui n'a pas voulu se situer n'a rien démontré. Le concept revient
   * tôt, ce qui est exactement ce qu'il faut quand on ne sait pas.
   *
   * `engage` sans `ecrit` désigne précisément ce cas : la réponse a été révélée,
   * une option cliquée ou une saisie vérifiée — donc le chronomètre est arrêté —
   * mais aucun passage n'est parti. Un QCM, lui, écrit au clic : il n'est jamais
   * en suspens.
   */
  const abandonner = useCallback(async () => {
    if (!engage || ecrit) return;

    await enregistrer("AGAIN");
  }, [ecrit, engage, enregistrer]);

  const suivre: Valider = async (note, maitrise = false) => {
    // Sur un format dont la justesse est connue, le passage est parti au moment
    // de la réponse ; s'il a échoué, on retente avant d'avancer plutôt que de
    // laisser filer une réponse donnée.
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
      comble: verdict === null ? saisie.trim() || null : attendu,
      // La graine est l'identifiant de la question : l'ordre des pistes ne bouge
      // pas d'un affichage à l'autre, et le terme attendu ne tombe pas toujours
      // au même rang d'une question à l'autre.
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
    // Juste, le passage part tout de suite : le temps de lire une confirmation
    // n'a pas à s'ajouter à celui de la réponse, et rien ne se perd si on ferme
    // l'onglet avant de l'avoir lue.
    verifier: () => {
      if (!question?.cloze || saisie.trim().length === 0) return;

      arreter();

      if (!reponseAcceptee(saisie, question.cloze.accepted)) {
        setVerdict("RATE");
        return;
      }

      setVerdict("JUSTE");
      // Juste avec un coup de pouce reste un rappel, mais un cran plus facile :
      // la note le dit, sans quoi l'aide serait gratuite et deviendrait le geste
      // par défaut.
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
