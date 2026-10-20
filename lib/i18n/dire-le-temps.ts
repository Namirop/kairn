import { jourEnDateUtc } from "@/lib/domain/jour-local";
import type { RemiseAZero } from "@/lib/domain/remise-a-zero";

/**
 * Les paramètres de `temps.remiseAZero` : toujours les trois, le `select`
 * choisit. Le jour civil est un minuit UTC : formaté dans le fuseau de la
 * machine, il reculerait d'un jour à l'ouest.
 */
export function parametresDeRemise(
  remise: RemiseAZero,
  etiquette: string,
): { quand: RemiseAZero["quand"]; nombre: number; date: string } {
  return {
    quand: remise.quand,
    nombre: remise.quand === "jours" ? remise.nombre : 0,
    date:
      remise.quand === "date"
        ? new Intl.DateTimeFormat(etiquette, {
            day: "numeric",
            month: "long",
            timeZone: "UTC",
          }).format(jourEnDateUtc(remise.jour))
        : "",
  };
}
