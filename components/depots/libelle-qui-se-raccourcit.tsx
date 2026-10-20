/**
 * Raccourci sous `md` : en entier, les deux facultatifs du dépôt font 385 px
 * pour 342 px de colonne sur 390. Le lecteur d'écran n'entend que le complet.
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
