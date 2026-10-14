// i18n-ignore-fichier — outil de l'administrateur, qui reste en français par décision du 08/10/2026.
import { Section } from "@/components/administration/section";
import { dollars, nombre } from "@/components/administration/formats";
import type { BlocDepense as Chiffres } from "@/lib/db/administration-depense";

/**
 * Ce que la journée a coûté, dans les deux conventions de prix.
 *
 * Le catalogue est ce qu'enregistre le registre : il majore volontairement, le
 * bon sens de l'erreur pour un garde-fou. Le réel est ce qui est facturé,
 * remises d'introduction comprises ; seul, il ferait oublier que les remises
 * expirent et que la dépense montera d'une marche.
 *
 * Les échecs ont leur colonne : un appel raté a pu consommer des tokens et
 * compte au plafond.
 *
 * Les totaux sont en pied de tableau ; la synthèse vit dans `Bandeau`.
 */
export function BlocDepense({ chiffres }: { chiffres: Chiffres }) {
  return (
    <Section
      intitule="Par intention"
      contexte={`Journée ${chiffres.jour}. Le coût réel tient compte des remises en cours ; le catalogue est ce qu'enregistre le registre.`}
    >
      {chiffres.parIntention.length === 0 ? (
        <p className="text-petit text-stone-500">
          Aucun appel émis aujourd&apos;hui. Les intentions et leur coût apparaîtront ici dès le
          premier découpage de la journée.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="text-petit w-full border-collapse">
            <thead>
              <tr className="border-b border-stone-300 text-left text-stone-500">
                <th className="py-pas-2 pr-pas-4 font-normal">Intention</th>
                <Entete>Appels</Entete>
                <Entete>Échecs</Entete>
                <Entete>Entrée</Entete>
                <Entete>Sortie</Entete>
                <Entete>Catalogue</Entete>
                <Entete>Réel</Entete>
              </tr>
            </thead>
            <tbody>
              {chiffres.parIntention.map((ligne) => (
                <tr key={ligne.intention} className="border-b border-stone-300">
                  <td className="py-pas-2 pr-pas-4 font-mono text-stone-900">{ligne.intention}</td>
                  <Cellule>{nombre(ligne.appels)}</Cellule>
                  <Cellule>{nombre(ligne.echecs)}</Cellule>
                  <Cellule>{nombre(ligne.entree)}</Cellule>
                  <Cellule>{nombre(ligne.sortie)}</Cellule>
                  <Cellule>{dollars(ligne.coutCatalogue)}</Cellule>
                  <Cellule>{dollars(ligne.coutReel)}</Cellule>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold text-stone-900">
                <td className="py-pas-2 pr-pas-4">Total</td>
                <Cellule>{nombre(chiffres.appels)}</Cellule>
                <Cellule>{nombre(chiffres.echecs)}</Cellule>
                <Cellule>{nombre(chiffres.entree)}</Cellule>
                <Cellule>{nombre(chiffres.sortie)}</Cellule>
                <Cellule>{dollars(chiffres.coutCatalogue)}</Cellule>
                <Cellule>{dollars(chiffres.coutReel)}</Cellule>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </Section>
  );
}

function Entete({ children }: { children: string }) {
  return <th className="py-pas-2 pl-pas-4 text-right font-normal">{children}</th>;
}

function Cellule({ children }: { children: string }) {
  return <td className="py-pas-2 pl-pas-4 text-right font-mono tabular-nums">{children}</td>;
}
