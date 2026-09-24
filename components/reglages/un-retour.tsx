"use client";

import { Paperclip, X } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { envoyerUnRetourAction, type EtatDuRetour } from "@/app/(app)/reglages/retour-action";
import { ChoixDuSujet } from "@/components/reglages/choix-du-sujet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SujetDeRetour } from "@/lib/db/types";
import { MESSAGE_MAX } from "@/lib/domain/retour-sur-le-produit";

/**
 * Dire ce qui ne va pas, où que ce soit dans le produit.
 *
 * **Ce n'est pas le signalement d'une question**, et les deux ne se rejoignent
 * nulle part. Un signalement se déclenche depuis l'écran de révision, désigne
 * une formulation précise et la retire du tirage. Ceci porte sur le produit —
 * une logique qui surprend, un mot de travers, un écran qui déborde — et ne
 * retire rien. C'est aussi la seule trace que ces défauts-là laisseront : un
 * mauvais découpage se voit dans les chiffres, un écran mal fichu se subit en
 * silence.
 *
 * Le formulaire demande le strict minimum. Le sujet est présélectionné, l'écran
 * et la capture sont facultatifs, et il n'y a pas de champ d'adresse ni de
 * catégorie fine : chaque champ obligatoire de plus fait renoncer une part des
 * gens, et un retour qu'on n'écrit pas vaut zéro.
 *
 * La largeur de la fenêtre et le navigateur partent avec, parce que c'est ce
 * qu'un rapport écrit à la main n'inclut jamais et ce dont on a besoin pour
 * reproduire un défaut d'affichage. Rien d'autre — pas d'adresse, pas de contenu
 * déposé.
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
        C&apos;est envoyé, et c&apos;est lu. Tu n&apos;auras pas de réponse — mais ce que tu viens
        d&apos;écrire finira corrigé.
      </p>
    );
  }

  return (
    <form action={envoyer} className="gap-pas-4 flex flex-col">
      <ChoixDuSujet choisi={sujet} onChoisir={setSujet} fige={enCours} />

      <div>
        <label htmlFor="retour-message" className="text-petit block text-stone-500">
          Ce que tu as rencontré
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
          placeholder="Ce que tu faisais, ce à quoi tu t'attendais, ce qui s'est passé."
          // 16 px sur mobile : en deçà, Safari zoome à la mise au point.
          className="rounded-champ mt-pas-2 px-pas-3 py-pas-2 md:text-petit focus-visible:border-lichen w-full resize-none border border-stone-300 bg-transparent text-base text-stone-900 outline-none disabled:opacity-45"
        />
      </div>

      <div>
        <label htmlFor="retour-ecran" className="text-petit block text-stone-500">
          Sur quel écran, si tu t&apos;en souviens
        </label>
        <Input
          id="retour-ecran"
          name="ecran"
          autoComplete="off"
          disabled={enCours}
          placeholder="La session, le dépôt, la page d'accueil…"
          className="mt-pas-2 max-w-sm"
        />
      </div>

      <PieceJointe capture={capture} onCapture={setCapture} fichier={fichier} enCours={enCours} />

      <input type="hidden" name="largeur" value={fenetre.largeur} />
      <input type="hidden" name="hauteur" value={fenetre.hauteur} />
      <input type="hidden" name="agent" value={fenetre.agent} />

      <div className="gap-pas-4 flex flex-wrap items-center">
        <Button type="submit" disabled={enCours}>
          {enCours ? "Un instant" : "Envoyer"}
        </Button>

        <p className="text-petit min-h-5" role="status" aria-live="polite">
          {etat.erreur ? <span className="text-alerte">{etat.erreur}</span> : null}
        </p>
      </div>
    </form>
  );
}

/**
 * La capture, facultative.
 *
 * Le champ natif sort du parcours clavier et c'est le bouton qui porte l'action,
 * comme au dépôt : deux arrêts pour un seul geste sont un doublon, et le champ
 * natif ne se dessine pas.
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
        {capture ? "Changer la capture" : "Joindre une capture"}
      </Button>

      {capture ? (
        <span className="gap-pas-2 text-petit flex items-center text-stone-500">
          <span className="max-w-48 truncate">{capture}</span>
          <button
            type="button"
            aria-label="Retirer la capture"
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
