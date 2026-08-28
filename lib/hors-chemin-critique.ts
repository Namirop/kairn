import { after } from "next/server";

/**
 * Faire quelque chose après avoir rendu la main.
 *
 * Il vivait sous `lib/ai/` tant que les deux seules choses à différer étaient
 * des alertes d'appel modèle. Un retour sur le produit prévient aussi par email
 * et n'a rien à voir avec le modèle : le garder là forcerait un formulaire de
 * réglages à importer la couche IA pour une raison qui ne la concerne pas.
 *
 * Un garde-fou qui casse ce qu'il surveille est pire que pas de garde-fou : une
 * alerte de plafond ne doit ni ralentir un dépôt, ni le faire échouer parce que
 * Resend a hoqueté. Elle sort donc du chemin critique.
 *
 * **Mais une promesse simplement lâchée ne survit pas partout.** Chez un
 * hébergeur sans serveur, la fonction s'endort dès la réponse rendue, et le
 * travail détaché meurt avec elle — sans erreur nulle part, ce qui est
 * exactement la panne qu'on cherche à corriger ici. `after()` existe pour ça :
 * il tient la fonction éveillée le temps du travail, après la réponse.
 *
 * Il n'est disponible que dans une portée de requête. Hors d'une requête — un
 * script, un test, une file traitée en dehors d'un handler — il lève tout de
 * suite, et là il n'y a plus de réponse à ne pas attendre : la promesse lâchée
 * fait l'affaire. Le repli est donc le cas simple, pas le cas dégradé.
 */
export function differer(travail: () => Promise<void>): void {
  try {
    after(travail);
  } catch {
    void travail();
  }
}
