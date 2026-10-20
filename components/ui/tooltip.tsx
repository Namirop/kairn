"use client";

import { Tooltip as TooltipPrimitive } from "radix-ui";

/**
 * Le contexte seul : la fiche vit dans `infobulle.tsx`, qui choisit selon
 * l'appareil. Monté une fois dans la coquille authentifiée.
 */
export const TooltipProvider = TooltipPrimitive.Provider;
