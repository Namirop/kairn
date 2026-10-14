/**
 * Le libellé d'un bouton, raccourci sous `md` pour que les deux facultatifs du
 * dépôt (capture, consigne) tiennent sur une ligne de téléphone : mesurés, ils
 * font 385 px pour 342 px de colonne sur un écran de 390.
 *
 * Le lecteur d'écran entend toujours le libellé complet, replié en `sr-only` ;
 * le mot court est masqué, sinon il serait lu deux fois.
 */
export function LibelleQuiSeRaccourcit({ complet, court }: { complet: string; court: string }) {
  return (
    <>
      <span aria-hidden className="md:hidden">
        {court}
      </span>
      <span className="max-md:sr-only">{complet}</span>
    </>
  );
}
