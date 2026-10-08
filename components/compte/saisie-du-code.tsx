"use client";

import { useTranslations } from "next-intl";
import { BoutonColler } from "@/components/compte/bouton-coller";
import { useConnexionParCode } from "@/components/compte/connexion-par-code";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LONGUEUR_DU_CODE } from "@/lib/domain/code-de-connexion";

/**
 * Le second temps de l'entrée : les six chiffres reçus par email.
 *
 * Trois chemins mènent au champ rempli, et l'écran les sert tous les trois. Le
 * clavier mobile propose le code de lui-même — c'est `one-time-code` qui
 * l'autorise, et le mot « code » près des chiffres dans l'email qui le
 * déclenche. Le bouton coller sert le presse-papier, sur ordinateur surtout, et
 * il se tient dans le champ plutôt qu'au-dessus. Et la frappe reste possible,
 * sans rien installer ni autoriser.
 *
 * Le champ est en Geist Mono, espacé, à chasse fixe : six chiffres sont une
 * donnée, et on les relit caractère par caractère pour les vérifier. C'est le
 * seul champ de cet écran — il peut porter ce poids sans écraser quoi que ce
 * soit à côté.
 */
export function SaisieDuCode({ adresse, suite }: { adresse: string; suite: string }) {
  const { code, ecrireLeCode, enCours, erreur, renvoye, complet, valider, renvoyer } =
    useConnexionParCode(adresse, suite);
  const t = useTranslations("compte.connexion.code");

  return (
    <form
      noValidate
      onSubmit={(evenement) => {
        evenement.preventDefault();
        valider();
      }}
      className="gap-pas-4 flex flex-col"
    >
      <div className="gap-pas-1 flex flex-col">
        <Label htmlFor="code">{t("intitule", { longueur: LONGUEUR_DU_CODE })}</Label>

        <div className="relative">
          <Input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            required
            value={code}
            aria-invalid={erreur ? true : undefined}
            aria-describedby="code-erreur"
            onChange={(evenement) => ecrireLeCode(evenement.target.value)}
            // La réserve à droite est celle du bouton : sans elle, le sixième
            // chiffre passait sous l'icône.
            className="h-13 pr-14 font-mono text-[1.375rem] tracking-[0.3em] tabular-nums"
          />

          <BoutonColler
            onTexte={ecrireLeCode}
            intitule={t("coller")}
            className="absolute top-1/2 right-1 -translate-y-1/2"
          />
        </div>

        {/* La place du message est réservée : l'erreur ne décale pas le bouton. */}
        <p id="code-erreur" className="text-mono text-alerte min-h-4" role="status">
          {erreur}
        </p>
      </div>

      <Button type="submit" disabled={enCours || !complet}>
        {enCours ? t("verification") : t("entrer")}
      </Button>

      <p className="text-petit text-stone-500">
        <span role="status" aria-live="polite">
          {renvoye ? t("renvoyeA", { adresse }) : t("envoyeA", { adresse })}
        </span>{" "}
        {t("expire")}{" "}
        <button
          type="button"
          onClick={renvoyer}
          disabled={enCours}
          className="rounded-galet text-stone-900 underline decoration-stone-300 underline-offset-4 hover:decoration-stone-900 disabled:opacity-45"
        >
          {t("renvoyer")}
        </button>
      </p>
    </form>
  );
}
