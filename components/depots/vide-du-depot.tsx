import { useTranslations } from "next-intl";
import { AttenteDuDepot } from "@/components/depots/attente-du-depot";
import { EtatVide } from "@/components/etats/etat-vide";
import { etapeDuTravail, type EtatDepot } from "@/lib/domain/etat-depot";

/**
 * Pourquoi ce dépôt ne montre aucun concept. Chaque raison a sa phrase : une
 * phrase unique ferait attendre un dépôt rejeté ou vidé.
 *
 * Sur un rejet, le contexte est le motif du modèle mot pour mot : il dit ce qui
 * manquait à ce texte-là.
 *
 * Les raisons `lecture` et `attente` ne sont pas un vide mais une attente :
 * elles passent par `AttenteDuDepot`, seul le contexte reste écrit ici.
 */
type Raison = "rejete" | "echec" | "vide" | "lecture" | "attente";

function raison(etat: EtatDepot): Raison {
  if (etat === "rejete" || etat === "echec" || etat === "vide" || etat === "lecture") return etat;

  return "attente";
}

export function VideDuDepot({
  etat,
  motif,
  graine,
}: {
  etat: EtatDepot;
  motif: string | null;
  graine: string;
}) {
  const t = useTranslations("depots.depot.vide");
  const cle = raison(etat);
  const constat = t(`${cle}.constat`);
  // Le motif du modèle passe avant la phrase générique, sur un rejet ou une
  // panne seulement.
  const contexte = (cle === "rejete" || cle === "echec" ? motif : null) ?? t(`${cle}.contexte`);
  const etape = etapeDuTravail(etat);

  if (etape) return <AttenteDuDepot etape={etape} contexte={contexte} graine={graine} />;

  return <EtatVide graine={graine} constat={constat} contexte={contexte} />;
}
