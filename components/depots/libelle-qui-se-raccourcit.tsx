/**
 * Le libellé d'un bouton qui tient sur un téléphone sans perdre ses mots.
 *
 * Les deux facultatifs du dépôt — joindre une capture, ajouter une consigne —
 * font une paire et se lisent comme une paire : côte à côte, sous le champ. En
 * largeur de téléphone ils ne tenaient plus sur la ligne et s'empilaient l'un
 * sous l'autre, ce qui en faisait deux gestes séparés là où il n'y en a qu'un
 * seul à comprendre. Mesuré : les deux pilules font 385 px de large à elles
 * deux, pour 342 px de colonne sur un écran de 390.
 *
 * Plutôt que de raboter le rembourrage ou de retirer les icônes — deux
 * corrections qui rendent la rangée plus laide sans la faire tenir partout —,
 * c'est le texte qui se raccourcit, et seulement là où la place manque. Le
 * bouton dit alors ce qu'il joint : « Capture », « Consigne ». L'icône porte le
 * geste, la position porte le reste.
 *
 * **Ce qu'entend un lecteur d'écran ne change pas.** Le libellé complet est
 * toujours là, seulement replié hors de l'écran quand la colonne est étroite, et
 * c'est lui qui nomme le bouton. Le mot court, lui, est décoratif : il double un
 * texte déjà annoncé, et le laisser lire ferait entendre « Capture, joindre une
 * capture ».
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
