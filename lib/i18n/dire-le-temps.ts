import { dayToUtcDate } from "@/lib/domain/local-day";
import type { RemiseAZero } from "@/lib/domain/remise-a-zero";

/**
 * Les paramètres de `temps.remiseAZero`, à partir de ce que le domaine a décidé.
 *
 * Le message prend toujours ses trois arguments — c'est le `select` qui choisit
 * lequel il lit. La date se formate ici, dans la langue de l'écran : le jour
 * civil est un minuit UTC, donc il se lit en UTC et jamais dans le fuseau de la
 * machine, qui le ferait reculer d'un jour à l'ouest.
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
          }).format(dayToUtcDate(remise.jour))
        : "",
  };
}
