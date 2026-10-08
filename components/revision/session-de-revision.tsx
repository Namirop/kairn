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
   * Ce qu'on montre quand il n'y a rien à poser, rendu par la page.
   *
   * Il arrive tout fait plutôt que d'être décidé par la route : c'est ce qui
   * permet à l'écran de fin de survivre à un rafraîchissement du serveur. Voir
   * le commentaire de `/reviser/page.tsx`.
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
    La liste est prise au premier rendu et ne bouge plus.

    Une session est planifiée une fois : ce qui est dû a été décidé à l'ouverture
    de l'écran, et rien de ce qui arrive ensuite ne doit la redécider. Le serveur,
    lui, ne voit plus les concepts déjà répondus — donc toute relecture de la
    route rend une liste **plus courte**, et le rang tenu par le client désigne
    alors la question d'après. On répondait à la deuxième, on se retrouvait sur la
    troisième avec la correction de la deuxième affichée dessous.

    C'est ce qui interdisait toute revalidation depuis cet écran. L'écran de fin
    avait déjà été mis à l'abri en recevant l'écran vide en accessoire ; il
    manquait la liste elle-même, et c'est elle qui portait le défaut. Gelée ici,
    le tableau de bord peut être marqué périmé à chaque réponse sans que la
    session s'en aperçoive.

    Quitter l'écran et y revenir démonte le composant : la liste se refait alors
    depuis le serveur, ce qui est le comportement voulu.
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
  // La fonction reste dans une ref et seul le booléen est un état : c'est ce qui
  // évite qu'un changement d'identité de la fermeture relance un rendu à chaque
  // frappe, pour une valeur que personne n'affiche.
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

  // La session finie, il n'y a plus de chemin à montrer : l'écran redevient une
  // pile de panneaux, comme le reste de l'application.
  //
  // `termine` passe **avant** le compte de questions, et c'est tout l'objet du
  // remaniement : une session qui vient de se terminer a vidé ce qui était dû,
  // donc le serveur, relu, ne renverrait plus rien à poser. Si la liste vide
  // décidait, l'écran de fin s'effacerait devant « tu es à jour » au premier
  // rafraîchissement — et c'est ce qui interdisait de marquer le tableau de bord
  // à relire depuis ici.
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
    // « Session » va en marge, la date reste dans l'en-tête. Le mot de marge est
    // un objet graphique — il nomme le mode, et c'est vrai de la première
    // question à la dernière ; la date est ce qui change, et ce qui change se lit
    // là où l'on lit, pas dans une colonne de lettres couchées.
    <SceneDeSession
      enTete={
        <EnTeteDeScene
          intitule={t("intitule")}
          precision={jour}
          intituleEnMarge
          sortie={{
            titre: t("arreterTitre"),
            /*
              Ce qu'on quitte, et ce qu'il en coûte quand une réponse est déjà
              sous les yeux.

              La phrase change parce que la conséquence change. Partir sans se
              noter, sur une question dont on vient de lire la réponse, ne peut
              pas compter comme un rappel réussi : ce serait le seul geste du
              produit qui permette de gagner du temps sans rien savoir. On
              l'écrit donc comme un échec, et on le dit avant, pas après.
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
