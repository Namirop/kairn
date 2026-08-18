"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { emailOtp, signIn } from "@/lib/auth/client";
import { TIMEZONE_HEADER } from "@/lib/auth/en-tetes";
import { codeComplet, lireLeCode } from "@/lib/domain/code-de-connexion";

/**
 * L'échange avec le serveur pendant le second temps de l'entrée.
 *
 * Séparé de l'écran parce que ce sont deux sujets : ici la vérification, le
 * renvoi et ce qu'on en dit ; là-bas la mise en forme du champ et des boutons.
 *
 * La saisie part dès qu'elle est complète — c'est le geste qu'on ferait de toute
 * façon —, et le dernier code parti est retenu pour qu'un code refusé ne se
 * rejoue pas seul en boucle. Le bouton, lui, rejoue sans cette retenue : un
 * envoi qu'on ne déclenche pas soi-même laisse sans recours quand il échoue.
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

      // Le compte se crée ici quand il n'existe pas encore, donc dans une requête
      // que ce formulaire émet : c'est la seule occasion de porter le fuseau du
      // navigateur. Le lien de connexion ne l'avait pas — il partait du client
      // mail, sans aucun de nos en-têtes.
      const fuseau = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const entetes = fuseau ? { [TIMEZONE_HEADER]: fuseau } : {};

      const { error } = await signIn.emailOtp({ email: adresse, otp: valeur }, { headers: entetes });

      if (error) {
        setEnCours(false);
        setErreur(
          error.code === "TOO_MANY_ATTEMPTS"
            ? "Trop d'essais sur ce code. Demandes-en un nouveau."
            : "Ce code ne correspond pas, ou il a expiré.",
        );
        return;
      }

      // Pas de `setEnCours(false)` : la navigation part, et rendre le bouton à
      // son état d'attente le rouvrirait le temps que l'écran change.
      router.push(suite);
      router.refresh();
    },
    [adresse, router, suite],
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
      setErreur("Le code n'a pas pu repartir. Réessaie dans un instant.");
      return;
    }

    setRenvoye(true);
  }, [adresse]);

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
