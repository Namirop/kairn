// i18n-ignore-fichier — outil de l'administrateur, qui reste en français.
import { STYLE_DES_EMAILS as S } from "./gabarit";

/**
 * Les blocs communs aux alertes d'exploitation : l'heure UTC de l'alerte et le
 * tableau « valeur / légende » qui permet de décider sans ouvrir le tableau de
 * bord.
 */

/** L'heure de l'alerte en UTC : la journée des plafonds et des bascules se compte en UTC. */
export function heureUtc(instant: Date): string {
  return `${instant.toISOString().slice(11, 16)} UTC`;
}

/** Les lignes du tableau, la valeur en chasse fixe, la légende à côté. */
export function lignesDeValeurs(lignes: readonly (readonly [string, string])[]): string {
  return lignes
    .map(
      ([valeur, legende]) =>
        `<tr><td style="padding:0 12px 8px 0;font-family:${S.MONO};font-size:15px;color:${S.encre};white-space:nowrap;">${valeur}</td><td style="padding:0 0 8px;font-size:14px;color:${S.secondaire};">${legende}</td></tr>`,
    )
    .join("");
}
