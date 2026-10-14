"use client";

import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";

/**
 * Le client d'authentification, utilisé par les formulaires de connexion.
 *
 * Sans `baseURL` exprès : il vise l'origine de la page, juste partout, quand
 * une URL fixée serait fausse sur chaque preview et à chaque changement de port.
 */
export const authClient = createAuthClient({ plugins: [emailOTPClient()] });

export const { signIn, signOut, useSession, emailOtp } = authClient;
