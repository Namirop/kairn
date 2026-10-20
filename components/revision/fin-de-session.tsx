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
 * La fin d'une session : ce qui a été revu, ce qui revient demain, la carte de
 * maîtrise si elle s'est déclenchée. Pas de score : la progression se lit dans
 * l'espacement.
 */

/**
 * Le rappel annoncé est toujours celui de demain : la journée est faite, et le
 * cron n'écrit qu'à qui a quelque chose à revoir. « Aujourd'hui » promettrait un
 * email qui ne partira pas.
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
  /** Heure locale du rappel quotidien. Nulle s'il est coupé. */
  heureDuRappel: number | null;
  /** Première session du compte : le moment de dire pourquoi ça s'arrête. */
  expliquerLEspacement?: boolean;
}) {
  const [demain, setDemain] = useState<number | null>(null);
  const t = useTranslations("revision.paliers");

  useEffect(() => {
    let vivant = true;

    // Lu après coup : les notes données viennent de déplacer les échéances.
    void compterDemainAction().then((nombre) => {
      if (vivant) setDemain(nombre);
    });

    // Revalidé à l'affichage plutôt que sur un bouton : toutes les sorties de
    // l'écran trouvent un tableau de bord à jour.
    void relireLeTableauAction();

    return () => {
      vivant = false;
    };
  }, []);

  return (
    // Déposer d'abord, s'entraîner ensuite : quelqu'un avec deux concepts n'a
    // pas un problème de session, il a un problème de contenu.
    <Palier
      // Muette : le titre dessous dit le même compte en toutes lettres.
      embleme={revus > 0 ? <PileDeSession rang={revus} total={revus} /> : undefined}
      titre={t("fin.titre", { revus })}
      // Réservé : la phrase arrive après un aller-retour et ne doit pas pousser
      // le bouton. Deux lignes, la hauteur de la version longue.
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

      {/* Aligné à gauche : seul texte de l'écran qui vient de l'utilisateur. */}
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
