import { Label } from "@/components/ui/label";

/**
 * L'explication n'a pas de `max-w` : le panneau tient déjà la mesure, une
 * seconde borne laisserait un vide à droite de chaque phrase.
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
