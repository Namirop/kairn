import { permanentRedirect } from "next/navigation";
import { ROUTES } from "@/lib/auth/routes";

/**
 * L'inscription n'existe plus comme écran séparé.
 *
 * Sans mot de passe, s'inscrire et se connecter sont le même geste : on donne
 * son adresse, on reçoit un code, et le code crée le compte s'il n'existe pas.
 * Deux écrans auraient obligé quelqu'un à savoir s'il a déjà un compte, ce
 * qu'on ne sait pas toujours — et à revenir en arrière quand on s'est trompé.
 *
 * La route reste, en redirection permanente : elle est dans des liens déjà
 * envoyés, et peut-être dans un signet.
 */
export default function PageInscription() {
  permanentRedirect(ROUTES.connexion);
}
