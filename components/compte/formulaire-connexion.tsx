"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Champ } from "@/components/compte/champ";
import { SaisieDuCode } from "@/components/compte/saisie-du-code";
import { Button } from "@/components/ui/button";
import { emailOtp } from "@/lib/auth/client";

/**
 * Une adresse, un code, et c'est tout.
 *
 * Il n'y a plus de mot de passe, donc plus de distinction entre s'inscrire et se
 * connecter : dans les deux cas on donne son adresse et on reçoit un code. Deux
 * écrans pour un seul geste auraient obligé quelqu'un à savoir s'il a déjà un
 * compte, ce qu'il ne sait pas toujours.
 *
 * L'écran ne dit jamais si l'adresse existe déjà. Le message est le même dans
 * les deux cas — sans quoi ce formulaire dirait à n'importe qui si telle
 * personne a un compte ici.
 *
 * Un code plutôt qu'un lien, parce qu'un lien s'ouvre depuis le client mail,
 * donc dans le navigateur par défaut, et jamais dans l'application installée.
 * Voir `lib/domain/code-de-connexion.ts`.
 */
export function FormulaireConnexion({ suite }: { suite: string }) {
  const [adresse, setAdresse] = useState("");
  const [envoyeA, setEnvoyeA] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const t = useTranslations("compte.connexion");

  async function demanderLeCode(evenement: React.FormEvent) {
    evenement.preventDefault();
    setErreur(null);
    setEnCours(true);

    const destinataire = adresse.trim();
    const { error } = await emailOtp.sendVerificationOtp({
      email: destinataire,
      type: "sign-in",
    });

    setEnCours(false);

    if (error) {
      setErreur(t("echecEnvoi"));
      return;
    }

    setEnvoyeA(destinataire);
  }

  if (envoyeA) {
    return (
      <div className="gap-pas-4 flex flex-col">
        <SaisieDuCode adresse={envoyeA} suite={suite} />

        <button
          type="button"
          onClick={() => setEnvoyeA(null)}
          className="rounded-galet text-petit self-start text-stone-500 underline-offset-4 hover:text-stone-900 hover:underline focus-visible:underline"
        >
          {t("changerDAdresse")}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={demanderLeCode} noValidate className="gap-pas-4 flex flex-col">
      <Champ
        id="email"
        name="email"
        type="email"
        intitule={t("adresse")}
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
        {enCours ? t("envoi") : t("recevoir")}
      </Button>

      {/* Le mécanisme du code, dit une fois et ici : c'est sous le champ que la
          question se pose, et le titre de la page le répétait plus haut. */}
      <p className="text-petit text-stone-500">{t("mecanisme")}</p>
    </form>
  );
}
