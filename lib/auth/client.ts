"use client";

import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";

/** Sans `baseURL` exprès : l'origine de la page est juste partout, preview et port compris. */
export const authClient = createAuthClient({ plugins: [emailOTPClient()] });

export const { signIn, signOut, emailOtp } = authClient;
