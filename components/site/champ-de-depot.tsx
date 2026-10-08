"use client";

import { useState, type RefObject } from "react";
import { Maximize2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { ChampEnGrand } from "@/components/site/champ-en-grand";
import { VoileDeFin } from "@/components/site/voile-de-fin";

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
 * **Le creux n'est arrondi qu'en haut, et c'est le trait qui l'impose.** Un trait
 * posé au bas d'une boîte arrondie sur ses quatre angles s'interrompt au moment
 * où la courbe commence : il reste deux crochets dans les coins, et la ligne
 * qu'on voulait droite ne l'est plus. Les angles du bas sont donc vifs, la ligne
 * les traverse d'un bord à l'autre — et le creux a l'air posé au sol plutôt que
 * de flotter, ce qui est exactement ce qu'on lui demande de dire.
 *
 * **L'invite passe de `stone-400` à `stone-500`**, et c'était un défaut
 * d'accessibilité. Sur le creux, `stone-400` ne donnait que 2,09 pour un ; sur
 * le papier d'avant, à peine mieux. Or cette phrase-là est la seule qui dise
 * quoi mettre dans le champ : c'est le pire endroit du produit où laisser du
 * texte sous le seuil. Elle se lit maintenant, et c'est la dalle qui l'empêche
 * de passer pour du texte de page — pas sa pâleur.
 *
 * **Le rembourrage est sur le creux, pas sur le champ.** Le champ défile dans
 * une hauteur fixe, donc son texte se coupe à son propre bord : posé à ras du
 * creux, le rembourrage n'empêchait rien et la ligne coupée venait mourir dans
 * l'angle arrondi de la dalle — on lisait un texte cassé plutôt qu'un texte qui
 * continue. Le creux garde ses quatre marges, le champ se coupe à l'intérieur,
 * et la coupure a de l'air en dessous d'elle.
 *
 * **Sa hauteur est fixe, et c'est le champ qui défile.** Il grandissait avec son
 * contenu jusqu'à un plafond : à cette taille de corps, coller un article
 * faisait pousser un mur de lettres qui repoussait le bouton hors de l'écran, et
 * la page entière se réorganisait à chaque paragraphe collé.
 *
 * **Le texte déposé n'est plus en display, et il n'est plus gras.** Il l'était —
 * quarante pixels de Bricolage en gras —, et à cette échelle une recette de
 * crêpes prenait la forme d'un titre de campagne : quatre mots par ligne, un
 * pavé d'encre, et la sensation d'écrire dans une affiche plutôt que dans un
 * champ. La règle du système le disait déjà : la display est réservée aux titres
 * et aux grands nombres, et ce qu'on colle ici n'est ni l'un ni l'autre. Il garde
 * le corps d'un énoncé, qui est le rôle exact de ce qu'il porte — le contenu
 * qu'on aura à relire —, dans la police de texte et à graisse normale. C'est
 * toujours le champ héros du formulaire ; il ne crie plus.
 *
 * **Son ascenseur est parti, et un fondu le remplace.** Une barre système en
 * travers d'un creux de papier était le seul objet de la page dessiné par
 * quelqu'un d'autre. Le texte qui continue se dit maintenant par l'encre qui
 * s'efface au bas de la dalle, et seulement quand il continue vraiment — voir
 * `VoileDeFin`. Le clavier, lui, n'a jamais eu besoin de la barre : le curseur
 * emmène la vue avec lui.
 *
 * **Et pour le reste, il y a la loupe.** Un fondu dit qu'il y a une suite, il ne
 * la montre pas : sur un texte collé de deux mille signes, la relecture par une
 * meurtrière de quatre lignes reste une corvée. Le bouton d'agrandissement ouvre
 * la même zone au milieu de l'écran — voir `ChampEnGrand`. Il vit dans la ligne
 * de l'intitulé plutôt que dans le coin du creux : posé sur la dalle, il aurait
 * fallu réserver sa place sur chaque ligne du texte pour qu'aucune ne passe
 * dessous.
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
  const t = useTranslations("site.essai.champ");
  const [enGrand, setEnGrand] = useState(false);

  return (
    <div>
      {/* L'intitulé est collé à sa dalle et détaché du reste : la proximité fait
          le groupe, et c'est elle qui dit où commence et où finit la zone. La
          loupe tient l'autre bout de cette ligne — c'est le seul geste qui porte
          sur la zone entière, et il n'a donc pas à vivre dedans. */}
      <div className="gap-pas-3 flex items-center justify-between">
        <label
          htmlFor="essai"
          className="text-mono font-mono tracking-[0.14em] text-stone-500 uppercase"
        >
          {t("intitule")}
        </label>

        <button
          type="button"
          onClick={() => setEnGrand(true)}
          aria-label={t("enGrand")}
          className="-my-pas-2 px-pas-2 py-pas-2 inline-flex items-center rounded-xs text-stone-500 transition-colors hover:text-stone-900"
        >
          <Maximize2 className="size-4" />
        </button>
      </div>

      <div className="mt-pas-2 rounded-t-champ bg-surface-ombre p-pas-4 md:p-pas-6 focus-within:border-accent-profond relative border-b-2 border-stone-300 transition-colors">
        <textarea
          ref={champ}
          id="essai"
          name="texte"
          rows={4}
          value={texte}
          onChange={(evenement) => surTexte(evenement.target.value)}
          placeholder={invite}
          aria-invalid={enErreur}
          className="text-enonce sans-ascenseur h-[clamp(7rem,22vh,13rem)] w-full resize-none overflow-y-auto border-0 bg-transparent leading-[1.35] text-stone-900 outline-none placeholder:text-stone-500 focus-visible:outline-none"
        />

        <VoileDeFin zone={champ} contenu={texte} />
      </div>

      <ChampEnGrand
        ouvert={enGrand}
        surFermeture={() => setEnGrand(false)}
        invite={invite}
        texte={texte}
        surTexte={surTexte}
      />
    </div>
  );
}
