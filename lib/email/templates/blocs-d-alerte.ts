// i18n-ignore-fichier — outil de l'administrateur, qui reste en français.
import { echapper } from "./echapper";
import { STYLE_DES_EMAILS as S } from "./gabarit";

/** La journée des plafonds et des bascules se compte en UTC. */
export function heureUtc(instant: Date): string {
  return `${instant.toISOString().slice(11, 16)} UTC`;
}

export function lignesDeValeurs(lignes: readonly (readonly [string, string])[]): string {
  return lignes
    .map(
      ([valeur, legende]) =>
        `<tr><td style="padding:0 12px 8px 0;font-family:${S.MONO};font-size:15px;color:${S.encre};white-space:nowrap;">${echapper(valeur)}</td><td style="padding:0 0 8px;font-size:14px;color:${S.secondaire};">${echapper(legende)}</td></tr>`,
    )
    .join("");
}
