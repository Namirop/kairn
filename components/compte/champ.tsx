import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Un champ de formulaire. La place du message d'erreur est réservée en
 * permanence : signaler une erreur ne doit pas faire sauter la mise en page.
 */
export function Champ({
  id,
  intitule,
  erreur,
  ...props
}: React.ComponentProps<"input"> & { id: string; intitule: string; erreur?: string }) {
  return (
    <div className="gap-pas-1 flex flex-col">
      <Label htmlFor={id}>{intitule}</Label>
      <Input
        id={id}
        aria-invalid={erreur ? true : undefined}
        aria-describedby={`${id}-erreur`}
        {...props}
      />
      <p id={`${id}-erreur`} className="text-mono text-alerte min-h-4" role="status">
        {erreur}
      </p>
    </div>
  );
}
