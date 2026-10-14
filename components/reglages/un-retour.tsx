"use client";

import { Paperclip, X } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { envoyerUnRetourAction, type EtatDuRetour } from "@/app/(app)/reglages/retour-action";
import { ChoixDuSujet } from "@/components/reglages/choix-du-sujet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SujetDeRetour } from "@/lib/db/types";
import { MESSAGE_MAX } from "@/lib/domain/retour-sur-le-produit";

/**
 * Un retour sur le produit, depuis les réglages. Distinct du signalement d'une
 * question (écran de révision), qui retire une formulation du tirage : ceci ne
 * retire rien.
 *
 * Le formulaire demande le strict minimum : sujet présélectionné, écran et
 * capture facultatifs. La taille de la fenêtre et le navigateur partent avec,
 * pour reproduire un défaut d'affichage ; rien d'autre (ni adresse, ni contenu
 * déposé).
 */
export function UnRetour() {
  const [etat, envoyer, enCours] = useActionState<EtatDuRetour, FormData>(
    envoyerUnRetourAction,
    {},
  );

  const [sujet, setSujet] = useState<SujetDeRetour>("COMPORTEMENT");
  const [capture, setCapture] = useState<string | null>(null);
  const [fenetre, setFenetre] = useState({ largeur: 0, hauteur: 0, agent: "" });
  const fichier = useRef<HTMLInputElement>(null);
  const t = useTranslations("compte.retour");

  // Lu après le montage : ces trois valeurs n'existent pas au rendu serveur, et
  // les y chercher ferait diverger le balisage des deux côtés.
  useEffect(() => {
    setFenetre({
      largeur: window.innerWidth,
      hauteur: window.innerHeight,
      agent: navigator.userAgent,
    });
  }, []);

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
          // La saisie refusée revient telle quelle : on la corrige, on ne la
          // retape pas.
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

      <PieceJointe capture={capture} onCapture={setCapture} fichier={fichier} enCours={enCours} />

      <input type="hidden" name="largeur" value={fenetre.largeur} />
      <input type="hidden" name="hauteur" value={fenetre.hauteur} />
      <input type="hidden" name="agent" value={fenetre.agent} />

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

/**
 * La capture, facultative. Le champ natif sort du parcours clavier : c'est le
 * bouton qui porte l'action, pour un seul arrêt de tabulation.
 */
function PieceJointe({
  capture,
  onCapture,
  fichier,
  enCours,
}: {
  capture: string | null;
  onCapture: (nom: string | null) => void;
  fichier: React.RefObject<HTMLInputElement | null>;
  enCours: boolean;
}) {
  const t = useTranslations("compte.retour");

  return (
    <div className="gap-pas-3 flex flex-wrap items-center">
      <input
        ref={fichier}
        id="retour-capture"
        name="capture"
        type="file"
        accept="image/*"
        tabIndex={-1}
        aria-hidden
        className="sr-only"
        onChange={(evenement) => onCapture(evenement.target.files?.[0]?.name ?? null)}
      />

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={enCours}
        onClick={() => fichier.current?.click()}
      >
        <Paperclip aria-hidden />
        {capture ? t("changerCapture") : t("joindreCapture")}
      </Button>

      {capture ? (
        <span className="gap-pas-2 text-petit flex items-center text-stone-500">
          <span className="max-w-48 truncate">{capture}</span>
          <button
            type="button"
            aria-label={t("retirerCapture")}
            className="rounded-xs text-stone-500 transition-colors hover:text-stone-900"
            onClick={() => {
              onCapture(null);
              if (fichier.current) fichier.current.value = "";
            }}
          >
            <X aria-hidden className="size-4" />
          </button>
        </span>
      ) : null}
    </div>
  );
}
