import {
  ArrowLeft,
  CircleUser,
  Coins,
  Flag,
  MessageSquareWarning,
  Gauge,
  Inbox,
  Layers,
  Mountain,
  SlidersHorizontal,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { ROUTES } from "@/lib/auth/routes";
import type { Messages } from "@/lib/i18n/messages";

/**
 * Les destinations de l'application, nommées du point de vue de l'utilisateur.
 * Le rail de bureau et la barre basse mobile lisent la même liste : les deux
 * traitements diffèrent par la forme, jamais par le contenu.
 */
export type Destination = {
  href: string;
  /** La clé du libellé dans l'espace `navigation` : le texte dépend de la langue. */
  libelle: keyof Messages["navigation"];
  icone: LucideIcon;
  /**
   * La destination n'est active que sur son adresse exacte.
   *
   * Il faut ça dès qu'une destination est le parent d'une autre : sans elle,
   * « Vue d'ensemble » resterait allumée sur les cinq autres onglets, et deux
   * onglets allumés à la fois ne disent plus où on est.
   */
  exact?: boolean;
};

export const DESTINATIONS: Destination[] = [
  { href: ROUTES.aujourdhui, libelle: "aujourdhui", icone: Mountain },
  { href: ROUTES.depots, libelle: "depots", icone: Inbox },
  { href: ROUTES.reglages, libelle: "reglages", icone: SlidersHorizontal },
];

/**
 * Le même rail, vu par un administrateur.
 *
 * « Admin » prend la place de « Réglages » plutôt que de s'ajouter en
 * quatrième : l'administrateur est la seule personne qui ait deux outils à
 * atteindre, et lui donner un rail plus long qu'aux autres ferait payer sa
 * particularité à la mise en page de tout le monde. Ses réglages personnels ne
 * disparaissent pas — ils passent dans le rail interne, où il est de toute façon
 * en train de travailler.
 */
export const DESTINATIONS_PRODUIT_ADMIN: Destination[] = [
  { href: ROUTES.aujourdhui, libelle: "aujourdhui", icone: Mountain },
  { href: ROUTES.depots, libelle: "depots", icone: Inbox },
  { href: ROUTES.admin, libelle: "admin", icone: Gauge },
];

/**
 * La navigation bascule entièrement en mode administration.
 *
 * L'écran interne n'est pas une page de l'application, c'est un autre outil qui
 * partage sa coquille : son lecteur, ses questions et son registre sont
 * différents. Lui laisser la navigation du produit obligerait à empiler ses six
 * sections dans une page unique, ou à les cacher dans un menu — deux façons de
 * rendre illisible ce qui doit se scanner.
 *
 * Le retour est la dernière entrée et porte une flèche : sans lui, on entre dans
 * l'administration et on n'en sort qu'en éditant l'adresse.
 */
export const DESTINATIONS_ADMIN: Destination[] = [
  // « Synthèse » et pas « Vue d'ensemble » : le rail fait cent douze pixels et
  // c'est le libellé le plus long qui commande sa largeur.
  { href: ROUTES.admin, libelle: "synthese", icone: Gauge, exact: true },
  { href: ROUTES.adminDepense, libelle: "depense", icone: Coins },
  { href: ROUTES.adminComptes, libelle: "comptes", icone: Users },
  { href: ROUTES.adminContenu, libelle: "contenu", icone: Layers },
  { href: ROUTES.adminSignalements, libelle: "signalements", icone: Flag },
  // « Retours » et non « Signalements du produit » : le rail fait cent douze
  // pixels, et les deux sections ne se confondent que si on les nomme pareil.
  { href: ROUTES.adminRetours, libelle: "retours", icone: MessageSquareWarning },
  { href: ROUTES.adminPilotage, libelle: "pilotage", icone: Wrench },
  // Les réglages du compte, et non ceux du modèle. Ils ont quitté le rail du
  // produit pour laisser la place à « Admin », donc ils doivent se retrouver
  // ici : le fuseau, l'heure de rappel, l'export, la suppression de compte et
  // la déconnexion n'ont pas d'autre porte.
  { href: ROUTES.reglages, libelle: "monCompte", icone: CircleUser, exact: true },
  { href: ROUTES.aujourdhui, libelle: "quitter", icone: ArrowLeft, exact: true },
];

/**
 * Vrai quand la navigation doit être celle de l'outil interne.
 *
 * Ce n'est pas tout à fait « l'adresse commence par `/admin` », et la nuance est
 * la porte de sortie de « Mon compte ». Les réglages du compte vivent dans le
 * produit, mais un administrateur n'y a **plus aucune entrée** depuis son rail
 * de produit — « Admin » a pris la place. Basculer sur le rail du produit en y
 * arrivant le renvoyait donc dans une page dont il ne pouvait plus revenir sans
 * repasser par l'administration, et le rail changeait sous ses yeux au milieu
 * d'un aller-retour qu'il n'avait pas demandé.
 *
 * Un compte ordinaire n'est pas concerné : son rail porte ses réglages, et cette
 * page lui appartient.
 */
export function railInterne(chemin: string, administrateur = false): boolean {
  if (chemin === ROUTES.admin || chemin.startsWith(`${ROUTES.admin}/`)) return true;

  return administrateur && chemin === ROUTES.reglages;
}

/**
 * La liste que porte la navigation à cet endroit, pour ce lecteur.
 *
 * Deux questions, dans cet ordre : est-on dans l'outil interne, et a-t-on le
 * droit d'y entrer. La seconde ne décide que d'une entrée du rail ; c'est la
 * garde des pages qui décide de l'accès, et elle est côté serveur. Un rail est
 * un raccourci, jamais une autorisation.
 */
export function destinationsPour(chemin: string, administrateur = false): Destination[] {
  if (railInterne(chemin, administrateur)) return DESTINATIONS_ADMIN;

  return administrateur ? DESTINATIONS_PRODUIT_ADMIN : DESTINATIONS;
}

/** Vrai si ce chemin est celui que la destination désigne. */
export function estActive(destination: Destination, chemin: string): boolean {
  if (destination.exact) return chemin === destination.href;

  return chemin === destination.href || chemin.startsWith(`${destination.href}/`);
}
