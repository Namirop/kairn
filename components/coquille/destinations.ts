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
   * La destination n'est active que sur son adresse exacte. Nécessaire dès
   * qu'une destination est le parent d'une autre, sinon deux onglets
   * s'allument à la fois.
   */
  exact?: boolean;
};

export const DESTINATIONS: Destination[] = [
  { href: ROUTES.aujourdhui, libelle: "aujourdhui", icone: Mountain },
  { href: ROUTES.depots, libelle: "depots", icone: Inbox },
  { href: ROUTES.reglages, libelle: "reglages", icone: SlidersHorizontal },
];

/**
 * Le même rail, vu par un administrateur : « Admin » prend la place de
 * « Réglages » pour garder trois entrées, et les réglages du compte passent
 * dans le rail interne (« Mon compte »).
 */
export const DESTINATIONS_PRODUIT_ADMIN: Destination[] = [
  { href: ROUTES.aujourdhui, libelle: "aujourdhui", icone: Mountain },
  { href: ROUTES.depots, libelle: "depots", icone: Inbox },
  { href: ROUTES.admin, libelle: "admin", icone: Gauge },
];

/**
 * Le rail de l'outil interne, qui remplace entièrement celui du produit. La
 * dernière entrée est le retour : sans elle, on ne sort de l'administration
 * qu'en éditant l'adresse.
 */
export const DESTINATIONS_ADMIN: Destination[] = [
  // « Synthèse » et pas « Vue d'ensemble » : le rail fait cent douze pixels et
  // c'est le libellé le plus long qui commande sa largeur.
  { href: ROUTES.admin, libelle: "synthese", icone: Gauge, exact: true },
  { href: ROUTES.adminDepense, libelle: "depense", icone: Coins },
  { href: ROUTES.adminComptes, libelle: "comptes", icone: Users },
  { href: ROUTES.adminContenu, libelle: "contenu", icone: Layers },
  { href: ROUTES.adminSignalements, libelle: "signalements", icone: Flag },
  // « Retours » et non « Signalements du produit » : même contrainte de largeur,
  // et les deux sections ne doivent pas se confondre.
  { href: ROUTES.adminRetours, libelle: "retours", icone: MessageSquareWarning },
  { href: ROUTES.adminPilotage, libelle: "pilotage", icone: Wrench },
  // Les réglages du compte : pour un administrateur, c'est leur seule porte
  // (fuseau, rappel, export, suppression, déconnexion).
  { href: ROUTES.reglages, libelle: "monCompte", icone: CircleUser, exact: true },
  { href: ROUTES.aujourdhui, libelle: "quitter", icone: ArrowLeft, exact: true },
];

/**
 * Vrai quand la navigation doit être celle de l'outil interne.
 *
 * Les réglages comptent aussi pour un administrateur : il n'y entre que par
 * « Mon compte » du rail interne, et basculer sur le rail du produit en y
 * arrivant changerait le rail sous ses yeux.
 */
export function railInterne(chemin: string, administrateur = false): boolean {
  if (chemin === ROUTES.admin || chemin.startsWith(`${ROUTES.admin}/`)) return true;

  return administrateur && chemin === ROUTES.reglages;
}

/**
 * La liste que porte la navigation à cet endroit, pour ce lecteur.
 *
 * `administrateur` ne décide que des entrées du rail ; l'accès est gardé côté
 * serveur par les pages. Un rail est un raccourci, jamais une autorisation.
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
