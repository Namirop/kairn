"use client";

import { useActionState, useRef, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { envoyerUnRetourAction, type EtatDuRetour } from "@/app/(app)/reglages/retour-action";
import { ChoixDuSujet } from "@/components/reglages/choix-du-sujet";
import { Button } from "@/components/ui/button";
import { ChampDePieceJointe } from "@/components/formulaires/champ-de-piece-jointe";
import { Input } from "@/components/ui/input";
import type { SujetDeRetour } from "@/lib/db/types";
import { MESSAGE_MAX } from "@/lib/domain/retour-sur-le-produit";

/**
 * Un retour sur le produit : contrairement au signalement d'une question, il ne
 * retire rien du tirage. La fenêtre et le navigateur partent avec, pour
 * reproduire un défaut d'affichage ; rien d'autre (ni adresse, ni contenu).
 */
/** Rien à écouter : les valeurs se relisent au rendu. */
function sansAbonnement(): () => void {
  return () => {};
}

export function UnRetour() {
  const [etat, envoyer, enCours] = useActionState<EtatDuRetour, FormData>(
    envoyerUnRetourAction,
    {},
  );

  const [sujet, setSujet] = useState<SujetDeRetour>("COMPORTEMENT");
  const [capture, setCapture] = useState<string | null>(null);
  const fichier = useRef<HTMLInputElement>(null);
  const t = useTranslations("compte.retour");

  // Absentes au rendu serveur : des zéros, puis les vraies après hydratation.
  // Sans écoute du redimensionnement : seul compte l'état à l'envoi.
  const largeur = useSyncExternalStore(
    sansAbonnement,
    () => window.innerWidth,
    () => 0,
  );
  const hauteur = useSyncExternalStore(
    sansAbonnement,
    () => window.innerHeight,
    () => 0,
  );
  const agent = useSyncExternalStore(
    sansAbonnement,
    () => navigator.userAgent,
    () => "",
  );

  // Vider le champ natif, pour pouvoir rejoindre le même fichier après retrait.
  function retirerLaCapture() {
    setCapture(null);
    if (fichier.current) fichier.current.value = "";
  }

  if (etat.envoye) {
    return (
      <p className="text-corps text-stone-900" role="status">
        {t("envoye")}
      </p>
    );
  }

  return (
    <form action={envoyer} className="gap-pas-4 flex flex-col">
      <ChoixDuSujet choisi={sujet} onChoisir={setSujet} fige={enCours} />

      <div>
        <label htmlFor="retour-message" className="text-petit block text-stone-500">
          {t("message")}
        </label>
        <textarea
          id="retour-message"
          name="message"
          // La saisie refusée revient telle quelle, à corriger sans la retaper.
          defaultValue={etat.message ?? ""}
          key={etat.message ?? "message"}
          rows={4}
          maxLength={MESSAGE_MAX}
          disabled={enCours}
          placeholder={t("messageExemple")}
          // 16 px sur mobile : en deçà, Safari zoome à la mise au point.
          className="rounded-champ mt-pas-2 px-pas-3 py-pas-2 md:text-petit focus-visible:border-accent w-full resize-none border border-stone-300 bg-transparent text-base text-stone-900 outline-none disabled:opacity-45"
        />
      </div>

      <div>
        <label htmlFor="retour-ecran" className="text-petit block text-stone-500">
          {t("ecran")}
        </label>
        <Input
          id="retour-ecran"
          name="ecran"
          autoComplete="off"
          disabled={enCours}
          placeholder={t("ecranExemple")}
          className="mt-pas-2 max-w-sm"
        />
      </div>

      <CaptureDuRetour
        capture={capture}
        onCapture={setCapture}
        onRetirer={retirerLaCapture}
        fichier={fichier}
        enCours={enCours}
      />

      <input type="hidden" name="largeur" value={largeur} />
      <input type="hidden" name="hauteur" value={hauteur} />
      <input type="hidden" name="agent" value={agent} />

      <div className="gap-pas-4 flex flex-wrap items-center">
        <Button type="submit" disabled={enCours}>
          {enCours ? t("unInstant") : t("envoyer")}
        </Button>

        <p className="text-petit min-h-5" role="status" aria-live="polite">
          {etat.erreur ? <span className="text-alerte">{etat.erreur}</span> : null}
        </p>
      </div>
    </form>
  );
}

/** On n'en garde que le nom : le champ porte le fichier. */
function CaptureDuRetour({
  capture,
  onCapture,
  onRetirer,
  fichier,
  enCours,
}: {
  capture: string | null;
  onCapture: (nom: string | null) => void;
  onRetirer: () => void;
  fichier: React.RefObject<HTMLInputElement | null>;
  enCours: boolean;
}) {
  const t = useTranslations("compte.retour");

  return (
    <ChampDePieceJointe
      champ={fichier}
      id="retour-capture"
      name="capture"
      nom={capture}
      libelle={capture ? t("changerCapture") : t("joindreCapture")}
      libelleRetirer={t("retirerCapture")}
      onChoisir={(choisi) => onCapture(choisi?.name ?? null)}
      onRetirer={onRetirer}
      desactive={enCours}
      className="flex-wrap"
    />
  );
}
