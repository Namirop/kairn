import { Inbox, Mountain, SlidersHorizontal, type LucideIcon } from "lucide-react";
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
};

export const DESTINATIONS: Destination[] = [
  { href: ROUTES.aujourdhui, libelle: "Aujourd'hui", icone: Mountain },
  { href: ROUTES.depots, libelle: "Dépôts", icone: Inbox },
  { href: ROUTES.reglages, libelle: "Réglages", icone: SlidersHorizontal },
];
