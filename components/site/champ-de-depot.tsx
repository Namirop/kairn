"use client";

import type { RefObject } from "react";

/**
 * L'endroit où l'on dépose : une dalle creusée dans le papier.
 *
 * **Le champ n'avait aucune boîte, et personne ne voyait que c'en était un.**
 * C'était une décision assumée — « un sol, pas une boîte », le texte se pose à
 * même le papier —, mais elle avait dérivé jusqu'à l'invisible : le trait de
 * deux pixels que le système décrit sous un champ était posé **en
 * transparent**, et ne réapparaissait qu'à l'entrée dans le champ. Au repos il
 * ne restait donc qu'un paragraphe gris sous une étiquette. On arrivait sur du
 * texte de page, un blanc, un bouton, sans comprendre qu'il y avait quelque
 * chose à écrire.
 *
 * **Un creux, et non un contour.** La différence n'est pas cosmétique : c'est ce
 * qui permet de rendre la zone évidente sans rouvrir le défaut qu'on avait fui.
 * Un contour fait une boîte posée sur la page ; un creux est du terrain, et on
 * dépose dans un creux. La règle du système survit intacte — c'est toujours le
 * sol, il est juste creusé à l'endroit où l'on pose.
 *
 * Il est fait d'une **surface**, comme tout le reste du produit : l'ombre dans du
 * papier. Aucune ombre portée, aucun contour — voir la règle du plat.
 *
 * **Le trait du bas revient, et au repos.** Il passe au lichen à l'entrée dans le
 * champ : le changement mesure 3,03 pour un, juste au-dessus du seuil exigé d'un
 * indicateur de focus. C'est lui, et non un anneau, qui signale le focus — un
 * anneau redessinerait la boîte qu'on vient de creuser.
 *
 * **L'invite passe de `stone-400` à `stone-500`**, et c'était un défaut
 * d'accessibilité. Sur le creux, `stone-400` ne donnait que 2,09 pour un ; sur
 * le papier d'avant, à peine mieux. Or cette phrase-là est la seule qui dise
 * quoi mettre dans le champ : c'est le pire endroit du produit où laisser du
 * texte sous le seuil. Elle se lit maintenant, et c'est la dalle qui l'empêche
 * de passer pour du texte de page — pas sa pâleur.
 *
 * **Sa hauteur est fixe, et c'est le champ qui défile.** Il grandissait avec son
 * contenu jusqu'à un plafond : à cette taille de corps, coller un article
 * faisait pousser un mur de lettres qui repoussait le bouton hors de l'écran, et
 * la page entière se réorganisait à chaque paragraphe collé.
 */
export function ChampDeDepot({
  champ,
  invite,
  texte,
  surTexte,
  enErreur,
}: {
  champ: RefObject<HTMLTextAreaElement | null>;
  invite: string;
  texte: string;
  surTexte: (valeur: string) => void;
  enErreur: boolean;
}) {
  return (
    <div>
      {/* L'intitulé est collé à sa dalle et détaché du reste : la proximité fait
          le groupe, et c'est elle qui dit où commence et où finit la zone. */}
      <label
        htmlFor="essai"
        className="text-mono font-mono tracking-[0.14em] text-stone-500 uppercase"
      >
        Ce que tu veux retenir
      </label>

      <div className="mt-pas-2 rounded-champ bg-surface-ombre px-pas-4 pt-pas-4 md:px-pas-6 md:pt-pas-6 focus-within:border-lichen-deep border-b-2 border-stone-300 transition-colors">
        <textarea
          ref={champ}
          id="essai"
          name="texte"
          rows={4}
          value={texte}
          onChange={(evenement) => surTexte(evenement.target.value)}
          placeholder={invite}
          aria-invalid={enErreur}
          className="pb-pas-4 md:pb-pas-6 font-display text-h1-app ascenseur-discret h-[clamp(7rem,22vh,13rem)] w-full resize-none overflow-y-auto border-0 bg-transparent leading-[1.12] font-bold tracking-[-0.02em] text-stone-900 outline-none placeholder:font-normal placeholder:tracking-normal placeholder:text-stone-500 focus-visible:outline-none"
        />
      </div>
    </div>
  );
}
