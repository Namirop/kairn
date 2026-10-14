"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Champ } from "@/components/compte/champ";
import { SaisieDuCode } from "@/components/compte/saisie-du-code";
import { Button } from "@/components/ui/button";
import { emailOtp } from "@/lib/auth/client";

/**
 * Une adresse, un code. Inscription et connexion sont un même geste : personne
 * n'a à savoir s'il a déjà un compte.
 *
 * L'écran ne dit jamais si l'adresse existe : sinon il révélerait à n'importe
 * qui si telle personne a un compte ici.
 *
 * Un code plutôt qu'un lien : un lien s'ouvre dans le navigateur par défaut,
 * jamais dans l'application installée. Voir `lib/domain/code-de-connexion.ts`.
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

      {/* Le mécanisme du code, dit une fois, sous le champ où la question se
          pose. */}
      <p className="text-petit text-stone-500">{t("mecanisme")}</p>
    </form>
  );
}
