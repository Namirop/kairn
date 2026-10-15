"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { emailOtp, signIn } from "@/lib/auth/client";
import { ENTETE_DU_FUSEAU } from "@/lib/auth/en-tetes";
import { codeComplet, lireLeCode } from "@/lib/domain/code-de-connexion";

/**
 * La vérification et le renvoi du code de connexion.
 *
 * Le code part dès qu'il est complet ; le dernier code parti est retenu pour
 * qu'un code refusé ne se rejoue pas seul en boucle. Le bouton, lui, rejoue
 * sans cette retenue, pour laisser un recours.
 */

export type ConnexionParCode = {
  code: string;
  ecrireLeCode: (saisie: string) => void;
  enCours: boolean;
  erreur: string | null;
  renvoye: boolean;
  complet: boolean;
  valider: () => void;
  renvoyer: () => void;
};

export function useConnexionParCode(adresse: string, suite: string): ConnexionParCode {
  const router = useRouter();
  const t = useTranslations("compte.connexion.code");
  const tConnexion = useTranslations("compte.connexion");
  const [code, setCode] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [renvoye, setRenvoye] = useState(false);
  const dejaTente = useRef<string | null>(null);

  const verifier = useCallback(
    async (valeur: string) => {
      dejaTente.current = valeur;
      setErreur(null);
      setEnCours(true);

      // Le compte se crée dans cette requête s'il n'existe pas : c'est la seule
      // occasion de transmettre le fuseau du navigateur.
      const fuseau = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const entetes = fuseau ? { [ENTETE_DU_FUSEAU]: fuseau } : {};

      const { error } = await signIn.emailOtp(
        { email: adresse, otp: valeur },
        { headers: entetes },
      );

      if (error) {
        setEnCours(false);
        setErreur(error.code === "TOO_MANY_ATTEMPTS" ? t("tropDEssais") : t("invalide"));
        return;
      }

      // Pas de `setEnCours(false)` : le bouton se rouvrirait le temps que la
      // navigation aboutisse.
      router.push(suite);
      router.refresh();
    },
    [adresse, router, suite, t],
  );

  useEffect(() => {
    if (enCours || !codeComplet(code) || code === dejaTente.current) return;
    void verifier(code);
  }, [code, enCours, verifier]);

  const renvoyer = useCallback(async () => {
    setErreur(null);
    setRenvoye(false);
    setEnCours(true);

    const { error } = await emailOtp.sendVerificationOtp({ email: adresse, type: "sign-in" });

    setEnCours(false);
    dejaTente.current = null;
    setCode("");

    if (error) {
      setErreur(error.status === 429 ? tConnexion("tropDeCodes") : t("echecRenvoi"));
      return;
    }

    setRenvoye(true);
  }, [adresse, t, tConnexion]);

  return {
    code,
    ecrireLeCode: (saisie) => setCode(lireLeCode(saisie)),
    enCours,
    erreur,
    renvoye,
    complet: codeComplet(code),
    valider: () => {
      if (!enCours && codeComplet(code)) void verifier(code);
    },
    renvoyer: () => void renvoyer(),
  };
}
