import { Section } from "@/components/administration/section";
import { dollars, nombre } from "@/components/administration/formats";
import type { BlocDepense as Chiffres } from "@/lib/db/administration-depense";

/**
 * Ce que la journée a coûté, dans les deux conventions de prix.
 *
 * Les deux colonnes sont là parce qu'aucune ne suffit. Le **catalogue** est ce
 * que le registre enregistre — il majore volontairement, ce qui est le bon sens
 * de l'erreur pour un garde-fou. Le **réel** est ce qui est facturé aujourd'hui,
 * remises d'introduction comprises. Ne montrer que le premier annonce une facture
 * qu'on ne paie pas ; ne montrer que le second ferait oublier que les remises
 * expirent, et que la dépense montera d'une marche ce jour-là sans qu'on ait rien
 * changé.
 *
 * Les échecs ont leur colonne : un appel raté a pu consommer des tokens et a pris
 * sa place au plafond. Les masquer ferait croire à une dépense plus faible
 * exactement le jour où quelque chose ne va pas.
 */
export function BlocDepense({ chiffres }: { chiffres: Chiffres }) {
  return (
    <Section
      intitule="Dépense du jour"
      contexte={`Journée ${chiffres.jour} en UTC, le calendrier du plafond d'appels.`}
    >
      <div className="gap-pas-6 mb-pas-6 grid grid-cols-2 sm:grid-cols-4">
        <Total intitule="Appels" valeur={nombre(chiffres.appels)} />
        <Total intitule="Échecs" valeur={nombre(chiffres.echecs)} />
        <Total intitule="Tokens entrée" valeur={nombre(chiffres.entree)} />
        <Total intitule="Tokens sortie" valeur={nombre(chiffres.sortie)} />
        <Total intitule="Coût catalogue" valeur={dollars(chiffres.coutCatalogue)} />
        <Total intitule="Coût réel facturé" valeur={dollars(chiffres.coutReel)} />
      </div>

      {chiffres.parIntention.length === 0 ? (
        <p className="text-petit text-stone-500">Aucun appel émis aujourd&apos;hui.</p>
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
                <tr key={ligne.intention} className="border-b border-stone-300 last:border-b-0">
                  <td className="py-pas-2 pr-pas-4 font-mono">{ligne.intention}</td>
                  <Cellule>{nombre(ligne.appels)}</Cellule>
                  <Cellule>{nombre(ligne.echecs)}</Cellule>
                  <Cellule>{nombre(ligne.entree)}</Cellule>
                  <Cellule>{nombre(ligne.sortie)}</Cellule>
                  <Cellule>{dollars(ligne.coutCatalogue)}</Cellule>
                  <Cellule>{dollars(ligne.coutReel)}</Cellule>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}

function Total({ intitule, valeur }: { intitule: string; valeur: string }) {
  return (
    <div>
      <p className="text-mono font-mono tracking-[0.14em] text-stone-500 uppercase">{intitule}</p>
      <p className="mt-pas-1 text-h2-app font-mono tabular-nums">{valeur}</p>
    </div>
  );
}

function Entete({ children }: { children: string }) {
  return <th className="py-pas-2 pl-pas-4 text-right font-normal">{children}</th>;
}

function Cellule({ children }: { children: string }) {
  return <td className="py-pas-2 pl-pas-4 text-right font-mono tabular-nums">{children}</td>;
}
