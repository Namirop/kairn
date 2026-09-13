"use client";

import { Tooltip as TooltipPrimitive } from "radix-ui";

/**
 * Le contexte des info-bulles, et lui seul.
 *
 * Ce fichier portait aussi la fiche et son déclencheur. Ils sont partis dans
 * `components/ui/infobulle.tsx` le 13/09/2026, avec le reste : une info-bulle
 * répond à un survol, donc elle n'existait pas au doigt, et il fallait un
 * composant qui choisisse selon l'appareil. Garder ici une seconde définition de
 * la même fiche aurait donné deux encres à corriger le jour où l'une bouge.
 *
 * Le fournisseur reste : il règle le délai d'ouverture pour toute l'application,
 * et il est monté une fois dans la coquille authentifiée.
 */
export const TooltipProvider = TooltipPrimitive.Provider;
