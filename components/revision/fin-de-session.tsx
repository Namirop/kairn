"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { compterDemainAction, relireLeTableauAction } from "@/app/(app)/reviser/actions";
import { ENTRAINEMENT_LIBRE } from "@/components/revision/entrainement-libre";
import { heureLue } from "@/components/revision/heure-lue";
import { Palier } from "@/components/revision/palier";
import { PileDeSession } from "@/components/revision/pile-de-session";
import { PrincipeDeLEspacement } from "@/components/revision/principe-de-lespacement";
import { ROUTES } from "@/lib/auth/routes";
import { useLangue } from "@/lib/i18n/use-langue";

/**
 * La fin d'une session.
 *
 * Ce qui vient d'être revu, ce qui revient demain, et la carte de maîtrise si
 * elle s'est déclenchée. Pas de score, pas de série, pas de niveau : la
 * progression se lit dans l'espacement qui s'allonge, pas dans un compteur.
 *
 * C'est un palier, comme les écrans où il n'y avait rien à revoir : on vient de
 * finir, et la seule différence avec « tu es à jour » est le chemin qui y mène.
 *
 * **La pile qu'on vient de monter ouvre l'écran.** Elle s'est remplie pierre à
 * pierre dans la bande d'état pendant toute la session ; à la fin, elle est
 * entière et vient au milieu. C'est le même objet, pas une illustration de lui,
 * et c'est ce qui rend cette fin lisible d'un regard là où trois lignes de gris
 * demandaient d'être lues. Le mot « SESSION » en petites capitales est parti
 * avec elle : la pile et le compte le disent déjà deux fois.
 */

/**
 * Ce qui revient demain, et ce qu'on en fait.
 *
 * **C'est la seule phrase de retour du produit, et elle a deux versions parce
 * qu'elle a deux sens.** Quand quelque chose revient, elle pose un rendez-vous :
 * on dit combien, et à quelle heure on écrira. L'heure compte plus que le
 * compte — c'est l'email qui ramène, pas la bonne volonté, et l'annoncer engage
 * le produit sur quelque chose qu'il tient.
 *
 * Le rappel est toujours pour **demain** ici, jamais pour aujourd'hui : la
 * journée vient d'être faite, plus rien n'est dû, et le cron n'écrit qu'à qui a
 * quelque chose à revoir. Annoncer « aujourd'hui, 19 h » à quelqu'un qui vient de
 * finir promettrait un email qui ne partira pas.
 *
 * Quand rien ne revient, « rien ne revient demain » tout court est la pire phrase
 * qu'on puisse laisser sur un écran de fin : elle se lit comme « ne reviens pas ».
 * On dit donc ce que ça veut dire — être à jour est l'état normal, pas un vide —
 * et on nomme ce qui fait la suite, sans répéter le libellé du bouton juste
 * dessous.
 */
function PhraseDemain({
  nombre,
  heureDuRappel,
}: {
  nombre: number | null;
  heureDuRappel: number | null;
}) {
  const t = useTranslations("revision.paliers.fin");
  const langue = useLangue();

  if (nombre === null) return "";

  if (nombre === 0) return t("demainRien");

  // Deux phrases devenaient trois lignes sur un téléphone, dont la dernière ne
  // portait que le « h ». Une seule phrase, et l'heure insécable : « 19 h » est
  // un nombre et son unité, il ne se coupe pas.
  return heureDuRappel === null
    ? t("demain", { nombre })
    : t("demainAvecRappel", {
        nombre,
        heure: heureDuRappel,
        heureLue: heureLue(heureDuRappel, langue),
      });
}

export function FinDeSession({
  revus,
  carte,
  heureDuRappel,
  expliquerLEspacement = false,
}: {
  revus: number;
  carte: { atomId: string; concept: string } | null;
  /** L'heure du rappel quotidien, chez la personne. Nulle s'il est coupé. */
  heureDuRappel: number | null;
  /** Première session de ce compte : c'est le moment de dire pourquoi ça s'arrête. */
  expliquerLEspacement?: boolean;
}) {
  const [demain, setDemain] = useState<number | null>(null);
  const t = useTranslations("revision.paliers");

  useEffect(() => {
    let vivant = true;

    // Lu après coup : les notes qui viennent d'être données ont déplacé les
    // échéances, le chiffre d'avant serait faux.
    void compterDemainAction().then((nombre) => {
      if (vivant) setDemain(nombre);
    });

    /*
      La session est finie : le tableau de bord est périmé, et il le sait
      maintenant plutôt qu'au clic sur l'une des quatre portes de cet écran.

      C'est le point qui a manqué deux fois. La revalidation était accrochée au
      bouton « Arrêter là » ; les liens d'ici — déposer, s'entraîner, revenir à
      aujourd'hui, sans compter la barre de navigation — n'avaient aucune raison
      de la connaître, et le compte de concepts dus restait celui d'avant la
      session jusqu'au rechargement.

      Appelée à l'affichage, elle vaut pour toutes les sorties d'un coup, y
      compris celles qu'on ajoutera. Le rafraîchissement qu'elle déclenche sur
      `/reviser` ne fait plus rien à cet écran : c'est le client qui tient
      « la session est finie ». Voir `relireLeTableauAction`.
    */
    void relireLeTableauAction();

    return () => {
      vivant = false;
    };
  }, []);

  return (
    // Déposer d'abord, s'entraîner ensuite. La boucle de croissance du produit,
    // ce sont les dépôts : quelqu'un avec deux concepts n'a pas un problème de
    // session, il a un problème de contenu.
    <Palier
      // Muette pour un lecteur d'écran : le titre juste dessous dit le même
      // compte en toutes lettres, et l'entendre deux fois n'apprend rien.
      embleme={revus > 0 ? <PileDeSession rang={revus} total={revus} /> : undefined}
      titre={t("fin.titre", { revus })}
      // L'espace est réservé : la phrase arrive après un aller-retour, elle ne
      // doit pas pousser le bouton vers le bas en apparaissant. Deux lignes,
      // parce que c'est ce que fait la version longue à la mesure de ce palier.
      // Elle en faisait trois avant d'être raccourcie, et l'écran débordait
      // alors du pli d'un téléphone.
      explication={
        <span className="block min-h-12">
          <PhraseDemain nombre={demain} heureDuRappel={heureDuRappel} />
        </span>
      }
      action={{ libelle: t("deposerAutreChose"), href: `${ROUTES.depots}/nouveau` }}
      secondaire={{
        libelle: t("sentrainer"),
        href: ROUTES.entrainement,
        precision: t(ENTRAINEMENT_LIBRE),
      }}
      pied={
        <Link
          href={ROUTES.aujourdhui}
          className="text-petit text-stone-500 underline-offset-4 hover:underline focus-visible:underline"
        >
          {t("retourAujourdhui")}
        </Link>
      }
    >
      {expliquerLEspacement ? (
        <div className="mt-pas-12 w-full text-left">
          <PrincipeDeLEspacement />
        </div>
      ) : null}

      {/* Le concept est cité, donc aligné à gauche : une phrase de contenu
          centrée se lit moins bien, et c'est le seul texte de l'écran qui ne
          vient pas du produit.

          Et il est posé, plutôt que bordé d'un filet de lichen. C'est la forme
          que ce produit donne à ce qui compte — la bande d'annulation de la
          session est la même chose —, et elle ne dépense pas l'accent : le
          lichen ne signalait plus rien à force de border huit blocs qui
          n'avaient ni statut ni urgence. Un bloc posé se distingue par sa
          matière. */}
      {carte ? (
        <div className="mt-pas-12 p-pas-4 md:p-pas-6 rounded-carte bg-surface-ombre max-w-lg text-left">
          <p className="text-mono font-mono tracking-[0.12em] text-stone-500 uppercase">
            {t("fin.maitrise")}
          </p>
          <p className="mt-pas-2 text-corps leading-relaxed text-stone-900">{carte.concept}</p>
          <p className="mt-pas-2 text-petit text-stone-500">{t("fin.maitrisePourquoi")}</p>
        </div>
      ) : null}
    </Palier>
  );
}
