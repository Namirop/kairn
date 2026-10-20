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

/** Rail de bureau et barre basse lisent la même liste : la forme diffère, pas le contenu. */
export type Destination = {
  href: string;
  libelle: keyof Messages["navigation"];
  icone: LucideIcon;
  /** Active sur l'adresse exacte seulement : sur un parent, deux onglets s'allumeraient. */
  exact?: boolean;
};

export const DESTINATIONS: Destination[] = [
  { href: ROUTES.aujourdhui, libelle: "aujourdhui", icone: Mountain },
  { href: ROUTES.depots, libelle: "depots", icone: Inbox },
  { href: ROUTES.reglages, libelle: "reglages", icone: SlidersHorizontal },
];

/** « Admin » remplace « Réglages » (trois entrées) ; le compte passe au rail interne. */
export const DESTINATIONS_PRODUIT_ADMIN: Destination[] = [
  { href: ROUTES.aujourdhui, libelle: "aujourdhui", icone: Mountain },
  { href: ROUTES.depots, libelle: "depots", icone: Inbox },
  { href: ROUTES.admin, libelle: "admin", icone: Gauge },
];

/** Sans la dernière entrée, on ne sortirait qu'en éditant l'adresse. */
export const DESTINATIONS_ADMIN: Destination[] = [
  // Libellés courts : le rail fait 112 px, le plus long commande sa largeur.
  { href: ROUTES.admin, libelle: "synthese", icone: Gauge, exact: true },
  { href: ROUTES.adminDepense, libelle: "depense", icone: Coins },
  { href: ROUTES.adminComptes, libelle: "comptes", icone: Users },
  { href: ROUTES.adminContenu, libelle: "contenu", icone: Layers },
  { href: ROUTES.adminSignalements, libelle: "signalements", icone: Flag },
  // « Retours » : même contrainte, et à ne pas confondre avec les signalements.
  { href: ROUTES.adminRetours, libelle: "retours", icone: MessageSquareWarning },
  { href: ROUTES.adminPilotage, libelle: "pilotage", icone: Wrench },
  // Seule porte d'un administrateur vers les réglages de son compte.
  { href: ROUTES.reglages, libelle: "monCompte", icone: CircleUser, exact: true },
  { href: ROUTES.aujourdhui, libelle: "quitter", icone: ArrowLeft, exact: true },
];

/**
 * Les réglages comptent pour un administrateur : il y entre par le rail interne,
 * qui ne doit pas changer sous ses yeux.
 */
export function railInterne(chemin: string, administrateur = false): boolean {
  if (chemin === ROUTES.admin || chemin.startsWith(`${ROUTES.admin}/`)) return true;

  return administrateur && chemin === ROUTES.reglages;
}

/** `administrateur` ne choisit que les entrées : les pages gardent l'accès côté serveur. */
export function destinationsPour(chemin: string, administrateur = false): Destination[] {
  if (railInterne(chemin, administrateur)) return DESTINATIONS_ADMIN;

  return administrateur ? DESTINATIONS_PRODUIT_ADMIN : DESTINATIONS;
}

export function estActive(destination: Destination, chemin: string): boolean {
  if (destination.exact) return chemin === destination.href;

  return chemin === destination.href || chemin.startsWith(`${destination.href}/`);
}
