"use client";

import { Crosshair } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * L'interrupteur qui donne le cairn au doigt.
 *
 * Le balayage tactile est observé sans jamais prendre le geste : la page défile
 * toujours, et un empilement se fauche au passage. C'est le bon défaut — une
 * zone morte sur l'écran d'ouverture se lit comme un bug — mais ça laisse un
 * seul mouvement possible, l'horizontal, et un geste qui monte ou descend
 * appartient à la page même quand on visait une pierre.
 *
 * Ce bouton est la sortie : tant qu'il est enfoncé, le cairn tient les gestes
 * qui partent de lui, dans toutes les directions, et la page ne défile plus
 * sous eux. On l'enfonce pour jouer, on le relâche pour lire. Le prix de
 * l'immobilité n'est plus payé par quelqu'un qui n'a rien demandé, il est
 * demandé par celui qui joue.
 *
 * La croix, et pas une main ni un cadenas : c'est déjà le curseur de la souris
 * sur cette zone. Le doigt reçoit ici ce que la souris a d'office — une visée.
 *
 * Il ne se montre qu'au doigt. À la souris, le survol fauche déjà l'empilement
 * et rien ne défile pendant ce temps : il n'y aurait rien à armer, seulement un
 * bouton de plus à comprendre.
 */
export function PriseDuCairn({ tenu, surBascule }: { tenu: boolean; surBascule: () => void }) {
  return (
    <button
      type="button"
      onClick={surBascule}
      aria-pressed={tenu}
      aria-label="Jouer avec le cairn"
      className={cn(
        /* La cible fait quarante-quatre pixels, le glyphe seize : c'est la zone
           qui grandit, pas le dessin. Il se tient en haut à droite, au-dessus
           d'une pile qui s'affine en montant : le coin est vide, et il l'est
           encore quand l'empilement s'écroule — les pierres tombent, elles ne
           montent pas. */
        "rounded-galet absolute top-0 right-0 hidden h-11 w-11 touch-manipulation items-center justify-center transition-colors duration-200 [@media(pointer:coarse)]:flex",
        /* Le repos est au gris de second plan, pas en dessous : une commande qui
           passe sous le contraste AA pour rester discrète n'est plus discrète,
           elle est invisible. La prise armée se dit deux fois — le glyphe passe
           au lichen, et un disque très pâle le pose sur le sentier. */
        tenu ? "bg-lichen/20 text-lichen-deep" : "text-stone-500",
      )}
    >
      <Crosshair aria-hidden className="h-4 w-4" strokeWidth={1.5} />
    </button>
  );
}

/**
 * La bande que la prise armée soustrait au défilement.
 *
 * Elle traverse l'écran. La boîte du cairn fait 62 % de la largeur sur
 * téléphone, et le geste qui fauche un empilement part **à côté** des pierres —
 * souvent dans la marge que cette boîte laisse de chaque côté. `touch-action`
 * se lit sur ce que le doigt touche en premier : posé dans la marge, il
 * appartenait encore à la page, qui défilait, et la prise avait l'air de ne
 * rien faire.
 *
 * C'est la bande de l'essai du 29/08, à une différence près, et elle change
 * tout : elle n'est plus là par défaut. On ne peut pas amorcer un défilement
 * depuis elle, mais on l'a demandé — et un second appui la retire.
 *
 * Elle se pose au-dessus du dessin, exprès : ce que le doigt touche en premier
 * doit être elle. Elle n'intercepte rien pour autant — le balayage est mesuré
 * sur la fenêtre, et le tapotement remonte au bloc qui l'écoute.
 *
 * Elle déborde la boîte du cairn d'un pas en haut comme en bas, parce qu'un
 * geste vise les pierres mais commence dans l'air autour. Un pas et pas deux :
 * au-dessus il reste dix pixels avant le bouton de l'ouverture, qui doit rester
 * un bouton.
 *
 * À placer dans un parent `relative` qui borne sa hauteur.
 */
export function BandeDePrise() {
  return (
    <span
      aria-hidden
      className="-inset-y-pas-6 absolute left-1/2 w-screen max-w-none -translate-x-1/2 touch-none"
    />
  );
}
