import { Section } from "@/components/administration/section";
import { LigneDeSignalement } from "@/components/signalements/ligne-de-signalement";
import type { SignalementLu } from "@/lib/db/signalement";

/**
 * Ce qu'on reproche aux questions, dans l'ordre où c'est arrivé.
 *
 * C'est la seule instrumentation qualitative du produit : les compteurs disent
 * combien de questions ont été écrites, ceux-ci disent lesquelles n'auraient pas
 * dû l'être. L'empreinte de prompt portée par chaque ligne est ce qui permet de
 * rattacher une série de plaintes à un réglage précis plutôt qu'à une impression.
 *
 * Le décompte ne figure pas dans l'intitulé : il est dans le bandeau de tête,
 * fenêtré sur sept jours, ce qui est la seule forme sous laquelle il apprend
 * quelque chose.
 */
export function BlocSignalements({ signalements }: { signalements: SignalementLu[] }) {
  return (
    <Section
      intitule="Signalements"
      contexte={
        signalements.length === 0
          ? "Rien pour l'instant."
          : "Les plus récents d'abord. L'empreinte dit sous quel prompt la question a été écrite."
      }
    >
      {signalements.length === 0 ? (
        <p className="text-petit max-w-prose text-stone-500">
          Les questions signalées pendant une session arriveront ici, avec le concept dont elles
          sont tirées et le réglage qui les a écrites.
        </p>
      ) : (
        <ul className="divide-y divide-stone-300">
          {signalements.map((signalement) => (
            <LigneDeSignalement key={signalement.id} signalement={signalement} />
          ))}
        </ul>
      )}
    </Section>
  );
}
