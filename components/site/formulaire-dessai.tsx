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

/**
 * L'invitation à déposer : le titre, ce qu'on en fait, et le champ.
 *
 * Même grille que les sections qui suivent tant qu'il invite ; une fois le
 * résultat là, c'est `ResultatDeLEssai` qui compose, en pleine largeur.
 */

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
   * Le dépôt part vraiment : c'est là que la fenêtre de l'essai s'ouvre. Ici et
   * pas dans un effet sur `enCours`, seul endroit qui distingue « on envoie » de
   * « on a refusé sur place » — sans quoi l'attente clignoterait sur un refus.
   */
  surDepot: () => void;
  /** Un découpage a déjà abouti pendant cette visite, et on en redépose un. */
  reprise: boolean;
}) {
  const t = useTranslations("site.essai.formulaire");
  // Les refus sont ceux du serveur, mot pour mot : même règle, mêmes phrases,
  // dites dans la langue de l'écran.
  const tRefus = useTranslations("depots.refus");
  const champ = useRef<HTMLTextAreaElement>(null);
  const [texte, setTexte] = useState("");
  const [erreurLocale, setErreurLocale] = useState<string | null>(null);
  const trop = texte.length > CARACTERES_MAXIMUM_ANONYME;

  /*
    Un défaut de longueur se refuse sur place : un aller-retour ferait passer
    l'écran par l'attente pour un texte qui n'existe pas. La règle est celle de
    `bornes-du-depot.ts`, partagée avec le serveur, qui reste seul juge du reste
    (verrous de la visite, empreinte d'adresse, plafond du jour).
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
          {/* Le mécanisme, pas une liste de ce qu'on peut déposer : l'invite du
              champ et la section « Tu déposes » le disent déjà. */}
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
                // Le message tombe dès qu'on répare et ne revient qu'au prochain
                // envoi : recalculé à chaque frappe, il passerait de « il n'y a
                // rien » à « c'est trop court » sur un texte en train de s'écrire.
                if (erreurLocale) setErreurLocale(null);
              }}
              enErreur={erreurLocale !== null}
            />

            <ActionDuDepot
              enCours={enCours}
              trop={trop}
              longueur={texte.length}
              /* Le dépassement se dit pendant qu'on colle ; les bornes basses
                 attendent l'envoi (voir `surTexte` plus haut). */
              erreur={erreurLocale ?? (trop ? motifDeDefaut("long", tRefus) : erreurServeur)}
              reprise={reprise}
            />
          </form>
        </Temps>

        {/* Sous le geste : une aide pour qui bloque, pas une consigne à
            traverser. Ils remplissent le champ sans l'envoyer — le dépôt reste
            le geste de l'utilisateur. */}
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
