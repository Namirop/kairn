"use client";

import { Tooltip as TooltipPrimitive } from "radix-ui";

/**
 * Le contexte des info-bulles, et lui seul : la fiche et son déclencheur vivent
 * dans `components/ui/infobulle.tsx`, qui choisit selon l'appareil. Le
 * fournisseur est monté une fois dans la coquille authentifiée.
 */
export const TooltipProvider = TooltipPrimitive.Provider;
