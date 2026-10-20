"use client";

import { useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { PucesDExemples } from "@/components/depots/exemples-de-depot";
import { Apparition, Temps } from "@/components/site/apparition";
import { ChampDeDepot } from "@/components/site/champ-de-depot";
import { ActionDuDepot } from "@/components/site/action-du-depot";
import {
  CARACTERES_MAXIMUM_ANONYME,
  defautDeLongueur,
  motifDeDefaut,
} from "@/lib/depots/bornes-du-depot";

/** L'invitation à déposer, sur la grille des sections qui suivent. */

export function FormulaireDEssai({
  invite,
  action,
  enCours,
  erreurServeur,
  surDepot,
  reprise,
}: {
  invite: string;
  action: (donnees: FormData) => void;
  enCours: boolean;
  /** Le refus rendu par l'action, quand il a fallu aller jusqu'au serveur. */
  erreurServeur?: string;
  /**
   * Le dépôt part vraiment : la fenêtre de l'essai s'ouvre. Pas un effet sur
   * `enCours`, qui ne distingue pas l'envoi du refus sur place : l'attente
   * clignoterait sur un refus.
   */
  surDepot: () => void;
  /** Un découpage a déjà abouti pendant cette visite, et on en redépose un. */
  reprise: boolean;
}) {
  const t = useTranslations("site.essai.formulaire");
  // Les phrases de refus du serveur, mot pour mot.
  const tRefus = useTranslations("depots.refus");
  const champ = useRef<HTMLTextAreaElement>(null);
  const [texte, setTexte] = useState("");
  const [erreurLocale, setErreurLocale] = useState<string | null>(null);
  const trop = texte.length > CARACTERES_MAXIMUM_ANONYME;

  /*
    La longueur se refuse sur place, sans passer par l'attente. La règle est
    partagée avec le serveur, seul juge du reste (verrous, plafond du jour).
  */
  const verifierAvantDenvoyer = (evenement: FormEvent<HTMLFormElement>) => {
    const defaut = defautDeLongueur(texte);

    if (!defaut) {
      surDepot();

      return;
    }

    evenement.preventDefault();
    setErreurLocale(motifDeDefaut(defaut, tRefus));
    champ.current?.focus();
  };

  return (
    <div className="gap-pas-8 md:gap-pas-12 grid md:grid-cols-[1fr_minmax(0,36rem)]">
      <Apparition ecart={0.26}>
        <h2 className="font-display text-h2-site leading-[1] font-bold tracking-[-0.02em]">
          <Temps balise="span" pierre className="block">
            {t("titreHaut")}
          </Temps>
          <Temps balise="span" pierre className="block">
            {t("titreBas")}
          </Temps>
        </h2>
      </Apparition>

      <Apparition>
        <Temps>
          <p className="text-stone-500">{t("mecanisme")}</p>
        </Temps>

        <Temps className="mt-pas-6 md:mt-pas-8">
          <form
            action={action}
            onSubmit={verifierAvantDenvoyer}
            noValidate
            className="gap-pas-4 md:gap-pas-6 flex flex-col"
          >
            <ChampDeDepot
              champ={champ}
              invite={invite}
              texte={texte}
              surTexte={(valeur) => {
                setTexte(valeur);
                // Le message ne revient qu'au prochain envoi : recalculé à chaque
                // frappe, il dirait « trop court » d'un texte en train de s'écrire.
                if (erreurLocale) setErreurLocale(null);
              }}
              enErreur={erreurLocale !== null}
            />

            <ActionDuDepot
              enCours={enCours}
              trop={trop}
              longueur={texte.length}
              /* Le dépassement se dit pendant qu'on colle, les bornes basses à l'envoi. */
              erreur={erreurLocale ?? (trop ? motifDeDefaut("long", tRefus) : erreurServeur)}
              reprise={reprise}
            />
          </form>
        </Temps>

        {/* Sous le geste, une aide pour qui bloque. Les exemples remplissent le
            champ sans l'envoyer : le dépôt reste le geste de l'utilisateur. */}
        <Temps className="mt-pas-6 md:mt-pas-8">
          <p className="text-petit text-stone-500">{t("exemples")}</p>

          <PucesDExemples
            onChoisir={(exemple) => {
              setTexte(exemple);
              setErreurLocale(null);
              champ.current?.focus();
            }}
            className="mt-pas-2"
          />
        </Temps>
      </Apparition>
    </div>
  );
}
