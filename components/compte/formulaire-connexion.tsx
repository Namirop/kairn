"use client";

import { useState } from "react";
import { Champ } from "@/components/compte/champ";
import { Button } from "@/components/ui/button";
import { signIn } from "@/lib/auth/client";

/**
 * Une adresse, un lien, et c'est tout.
 *
 * Il n'y a plus de mot de passe, donc plus de distinction entre s'inscrire et se
 * connecter : dans les deux cas on donne son adresse et on reçoit un lien. Deux
 * écrans pour un seul geste auraient obligé quelqu'un à savoir s'il a déjà un
 * compte, ce qu'il ne sait pas toujours.
 *
 * L'écran ne dit jamais si l'adresse existe déjà. Le message est le même dans
 * les deux cas — sans quoi ce formulaire dirait à n'importe qui si telle
 * personne a un compte ici.
 */
export function FormulaireConnexion({ suite }: { suite: string }) {
  const [adresse, setAdresse] = useState("");
  const [envoye, setEnvoye] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function demanderLeLien(evenement: React.FormEvent) {
    evenement.preventDefault();
    setErreur(null);
    setEnCours(true);

    // Aucun fuseau n'accompagne cette requête, et ce serait inutile : le compte
    // n'est pas créé ici mais au clic sur le lien, depuis le client mail, dans
    // une requête qui ne porte aucun de nos en-têtes. C'est `AccordFuseau` qui
    // réconcilie au premier affichage — le même chemin que l'entrée par Google.
    const { error } = await signIn.magicLink({ email: adresse.trim(), callbackURL: suite });

    setEnCours(false);

    if (error) {
      setErreur("Le lien n'a pas pu partir. Réessaie dans un instant.");
      return;
    }

    setEnvoye(true);
  }

  if (envoye) {
    return (
      <div className="gap-pas-3 flex flex-col" role="status">
        <p className="text-corps text-stone-900">Regarde tes emails.</p>
        <p className="text-petit max-w-prose text-stone-500">
          Un lien vient de partir vers {adresse.trim()}. Il fonctionne une seule fois et expire dans
          un quart d&apos;heure. Pense au dossier des indésirables.
        </p>
        <button
          type="button"
          onClick={() => setEnvoye(false)}
          className="rounded-galet text-petit self-start text-stone-500 underline-offset-4 hover:text-stone-900 hover:underline focus-visible:underline"
        >
          Changer d&apos;adresse
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={demanderLeLien} noValidate className="gap-pas-4 flex flex-col">
      <Champ
        id="email"
        name="email"
        type="email"
        intitule="Adresse email"
        autoComplete="email"
        required
        value={adresse}
        onChange={(evenement) => setAdresse(evenement.target.value)}
      />

      {/* L'espace du message est réservé : l'erreur ne décale pas le bouton. */}
      <p className="text-petit min-h-5" role="status" aria-live="polite">
        {erreur ? <span className="text-alerte">{erreur}</span> : null}
      </p>

      <Button type="submit" disabled={enCours || adresse.trim().length === 0}>
        {enCours ? "Envoi…" : "Recevoir mon lien"}
      </Button>

      <p className="text-petit text-stone-500">
        Pas de mot de passe à retenir. Si tu n&apos;as pas encore de compte, le lien en crée un.
      </p>
    </form>
  );
}
