import { Label } from "@/components/ui/label";

/**
 * Une décision : son nom, ce qu'elle change, son contrôle, et sa suite.
 *
 * **L'explication n'a pas de mesure à elle, et c'est délibéré.** Elle en portait
 * une — celle d'un paragraphe de prose, soixante-quatre signes — dans une carte
 * qui lui en offrait quatre-vingts, posée dans un panneau déjà serré à la mesure
 * d'une colonne de lecture. Deux bornes pour la même chose : la seconde ne
 * protégeait plus rien et laissait un quart de carte vide à droite de chaque
 * phrase, qui se lisait comme un écran pas fini.
 *
 * Ce qui la borne maintenant est la carte : la place qui reste à gauche du
 * contrôle. Le panneau, lui, tient la mesure de lecture pour tout le monde.
 */
export function Reglage({
  nom,
  intitule,
  explication,
  controle,
  children,
}: {
  nom: string;
  intitule: string;
  explication: string;
  controle: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="px-pas-4 py-pas-3 rounded-champ bg-surface-papier">
      <div className="gap-pas-4 flex items-start justify-between">
        <div>
          <Label htmlFor={nom} className="text-corps text-stone-900">
            {intitule}
          </Label>
          <p className="mt-pas-1 text-petit text-stone-500">{explication}</p>
        </div>

        <div className="mt-pas-1 shrink-0">{controle}</div>
      </div>

      {children}
    </div>
  );
}
