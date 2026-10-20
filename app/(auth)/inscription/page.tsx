import { permanentRedirect } from "next/navigation";
import { ROUTES } from "@/lib/auth/routes";

/**
 * Sans mot de passe, s'inscrire et se connecter sont un même geste. La route
 * reste pour les liens déjà envoyés.
 */
export default function PageInscription() {
  permanentRedirect(ROUTES.connexion);
}
