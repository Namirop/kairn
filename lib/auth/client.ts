"use client";

import { createAuthClient } from "better-auth/react";
import { magicLinkClient } from "better-auth/client/plugins";

/**
 * Le client d'authentification, utilisé par les formulaires de connexion.
 *
 * Sans `baseURL`, il vise l'origine de la page. C'est volontaire : une URL fixée
 * en variable d'environnement est fausse dès qu'on change de port en
 * développement, et fausse sur chaque preview, qui porte son propre domaine.
 * L'origine, elle, est juste partout.
 */
export const authClient = createAuthClient({ plugins: [magicLinkClient()] });

export const { signIn, signOut, useSession } = authClient;
