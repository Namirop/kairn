import { Section } from "@/components/administration/section";
import { ABSENT } from "@/components/administration/formats";
import type { LigneDeJournal } from "@/lib/db/reglages";

/**
 * Ce qui a été changé, par qui, et depuis quelle valeur.
 *
 * Un réglage qui se change en un clic doit laisser une trace, sinon le gain de
 * réactivité se paie en enquêtes : « pourquoi la génération est coupée depuis
 * mardi » devient une question sans réponse. Un tiret dans une colonne veut dire
 * « rendu à la valeur d'environnement ».
 */
export function BlocJournal({ lignes }: { lignes: LigneDeJournal[] }) {
  if (lignes.length === 0) {
    return (
      <Section intitule="Journal des réglages">
        <p className="text-petit max-w-prose text-stone-500">
          Aucun réglage n&apos;a encore été posé : tout suit l&apos;environnement.
        </p>
      </Section>
    );
  }

  return (
    <Section intitule="Journal des réglages" contexte="Les vingt derniers changements.">
      <div className="overflow-x-auto">
        <table className="text-petit w-full border-collapse">
          <thead>
            <tr className="border-b border-stone-300 text-left text-stone-500">
              <th className="py-pas-2 pr-pas-4 font-normal">Quand</th>
              <th className="py-pas-2 pr-pas-4 font-normal">Réglage</th>
              <th className="py-pas-2 pr-pas-4 font-normal">Avant</th>
              <th className="py-pas-2 pr-pas-4 font-normal">Après</th>
              <th className="py-pas-2 font-normal">Par</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((ligne) => (
              <tr key={ligne.id} className="border-b border-stone-300 last:border-b-0">
                <td className="py-pas-2 pr-pas-4 font-mono tabular-nums">
                  {ligne.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                </td>
                <td className="py-pas-2 pr-pas-4 font-mono">{ligne.reglage}</td>
                <td className="py-pas-2 pr-pas-4 font-mono">{ligne.avant ?? ABSENT}</td>
                <td className="py-pas-2 pr-pas-4 font-mono">{ligne.apres ?? ABSENT}</td>
                <td className="py-pas-2 text-stone-500">{ligne.parEmail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
