import {
  ArrowLeft,
  CircleUser,
  Coins,
  Flag,
  Gauge,
  Inbox,
  Layers,
  Mountain,
  SlidersHorizontal,
  Users,
  type LucideIcon,
} from "lucide-react";
import { ROUTES } from "@/lib/auth/routes";

/**
 * Les destinations de l'application, nommées du point de vue de l'utilisateur.
 * Le rail de bureau et la barre basse mobile lisent la même liste : les deux
 * traitements diffèrent par la forme, jamais par le contenu.
 */
export type Destination = {
  href: string;
  libelle: string;
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
  { href: ROUTES.aujourdhui, libelle: "Aujourd'hui", icone: Mountain },
  { href: ROUTES.depots, libelle: "Dépôts", icone: Inbox },
  { href: ROUTES.reglages, libelle: "Réglages", icone: SlidersHorizontal },
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
  { href: ROUTES.aujourdhui, libelle: "Aujourd'hui", icone: Mountain },
  { href: ROUTES.depots, libelle: "Dépôts", icone: Inbox },
  { href: ROUTES.admin, libelle: "Admin", icone: Gauge },
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
  { href: ROUTES.admin, libelle: "Synthèse", icone: Gauge, exact: true },
  { href: ROUTES.adminDepense, libelle: "Dépense", icone: Coins },
  { href: ROUTES.adminComptes, libelle: "Comptes", icone: Users },
  { href: ROUTES.adminContenu, libelle: "Contenu", icone: Layers },
  { href: ROUTES.adminSignalements, libelle: "Signalements", icone: Flag },
  { href: ROUTES.adminReglages, libelle: "Réglages", icone: SlidersHorizontal },
  // Les réglages du compte, et non ceux du modèle. Ils ont quitté le rail du
  // produit pour laisser la place à « Admin », donc ils doivent se retrouver
  // ici : le fuseau, l'heure de rappel, l'export, la suppression de compte et
  // la déconnexion n'ont pas d'autre porte. Sous un autre nom, faute de quoi
  // deux entrées appelées « Réglages » se suivraient sans se distinguer.
  { href: ROUTES.reglages, libelle: "Mon compte", icone: CircleUser, exact: true },
  { href: ROUTES.aujourdhui, libelle: "Quitter", icone: ArrowLeft, exact: true },
];

/** Vrai quand on est dans l'outil interne plutôt que dans le produit. */
export function dansLAdministration(chemin: string): boolean {
  return chemin === ROUTES.admin || chemin.startsWith(`${ROUTES.admin}/`);
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
  if (dansLAdministration(chemin)) return DESTINATIONS_ADMIN;

  return administrateur ? DESTINATIONS_PRODUIT_ADMIN : DESTINATIONS;
}

/** Vrai si ce chemin est celui que la destination désigne. */
export function estActive(destination: Destination, chemin: string): boolean {
  if (destination.exact) return chemin === destination.href;

  return chemin === destination.href || chemin.startsWith(`${destination.href}/`);
}
