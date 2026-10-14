import { permanentRedirect } from "next/navigation";
import { ROUTES } from "@/lib/auth/routes";

/**
 * Pas d'écran d'inscription : sans mot de passe, s'inscrire et se connecter
 * sont le même geste (le code crée le compte s'il n'existe pas). La route reste
 * en redirection permanente pour les liens déjà envoyés.
 */
export default function PageInscription() {
  permanentRedirect(ROUTES.connexion);
}
