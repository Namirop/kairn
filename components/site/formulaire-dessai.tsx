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
 * **Le panneau porte la même charpente que les deux sections qui le suivent** —
 * titre à gauche, contenu à droite, même mesure, même grille — tant qu'il
 * invite. Une fois qu'il a un résultat à montrer, il prend la largeur entière :
 * la consigne a été suivie, elle n'a plus à occuper la moitié de l'écran, et
 * c'est `ResultatDeLEssai` qui compose à partir de là.
 *
 * **Le champ est une dalle creusée**, et il ne l'a pas toujours été : il n'avait
 * ni fond ni contour, et son trait de repos était posé en transparent, si bien
 * qu'on ne voyait pas qu'il y avait quelque chose à écrire. Un creux rend la
 * zone évidente sans rouvrir le défaut qu'on avait fui — c'est toujours le sol,
 * il est juste creusé là où l'on pose. Voir `ChampDeDepot`.
 *
 * **Trois exemples ferment le formulaire**, et ils font deux choses d'un coup :
 * ils lèvent la panne d'inspiration, et ils prouvent que le champ est un champ —
 * on clique, il se remplit. C'est la démonstration la plus courte qu'on puisse
 * en faire. Ce sont les mêmes que ceux du premier dépôt de l'application, et
 * leur contraste — une astuce de cuisine, un mot d'allemand, une ligne de
 * documentation — dit « on peut déposer n'importe quoi » mieux qu'une phrase
 * qui le dirait.
 *
 * **Il ouvre sur le geste, pas sur l'invitation.** « Essaie » était un verbe
 * seul, sans objet : on lisait un encouragement là où il fallait une consigne.
 * « Dépose quelque chose. » nomme l'acte avec le verbe contractuel du produit.
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
   * Le dépôt part vraiment : c'est là que la fenêtre de l'essai s'ouvre.
   *
   * Ici et pas dans un effet monté sur l'envoi en cours, parce que c'est le seul
   * endroit qui connaisse la différence entre « on envoie » et « on a refusé sur
   * place ». Un texte vide n'ouvre donc aucune fenêtre, là où un effet aurait
   * fait clignoter l'attente pour un dépôt qui n'existait pas.
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
    Un dépôt vide se refuse sur place, sans aller-retour.

    Il partait au serveur, revenait avec son motif, et pendant le trajet l'écran
    passait par l'attente : une demi-seconde de « On découpe ton texte. » et
    d'emplacements qui battent, pour un texte qui n'existait pas. Le refus
    arrivait donc précédé d'un traitement qui n'avait rien traité, et ça se
    voyait — c'est un clignotement, sur le seul geste de la page qui convertit.

    La règle est la même des deux côtés parce qu'elle est écrite une fois, dans
    `bornes-du-depot.ts`. L'écran ne devine rien : il applique ce que le serveur
    appliquera, et le serveur reste seul juge de ce qui le concerne — les
    verrous de la visite, l'empreinte d'adresse, le plafond du jour.
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
          {/* Ce paragraphe ne dit plus ce qu'on peut déposer, il dit ce qu'on
              en fait.

              Il commençait par une énumération — « un article, une réponse
              qu'on t'a donnée, une page de manuel » — juste au-dessus d'un champ
              dont l'invite en fait une autre, et à deux plis d'une troisième
              dans « Tu déposes ». La page disait trois fois la même chose, et
              c'est la première qui devait partir : celle du champ arrive au
              moment du geste, là où la question se pose vraiment.

              Reste le mécanisme, et il annonce exactement ce que le panneau
              montrera ensuite — des concepts, des questions, un retour. */}
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
                // Le message tombe dès qu'on répare, et ne revient qu'au
                // prochain envoi : le recalculer à chaque frappe ferait passer
                // « il n'y a rien » à « c'est trop court » au troisième
                // caractère, sur un texte en train de s'écrire.
                if (erreurLocale) setErreurLocale(null);
              }}
              enErreur={erreurLocale !== null}
            />

            <ActionDuDepot
              enCours={enCours}
              trop={trop}
              longueur={texte.length}
              /* Le dépassement se dit **pendant** qu'on colle, sans attendre
                 l'envoi : à six mille signes, la phrase n'est pas prématurée,
                 c'est exactement ce qu'il y a à lire — et elle dit que la borne
                 est celle de l'essai, pas celle du produit. Les bornes basses,
                 elles, gardent leur silence jusqu'au clic : recalculées à
                 chaque frappe, elles feraient passer « il n'y a rien » à « c'est
                 trop court » au troisième caractère. */
              erreur={erreurLocale ?? (trop ? motifDeDefaut("long", tRefus) : erreurServeur)}
              reprise={reprise}
            />
          </form>
        </Temps>

        {/* Sous le geste, et non au-dessus : ce sont des exemples pour qui bloque
            devant un champ vide, pas une consigne à traverser avant d'écrire.
            Celui qui sait déjà quoi déposer ne les lit jamais, et c'est bien.

            Ils remplissent le champ sans l'envoyer : le dépôt reste le geste de
            l'utilisateur, qui peut encore modifier ou renoncer. */}
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
