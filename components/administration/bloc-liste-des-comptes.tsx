// i18n-ignore-fichier — outil de l'administrateur, qui reste en français par décision du 08/10/2026.
import { Section } from "@/components/administration/section";
import { ABSENT, nombre } from "@/components/administration/formats";
import type { CompteInscrit } from "@/lib/db/liste-des-comptes";

/**
 * Les comptes nommés, un par ligne : la seule vue qui permette d'écrire à
 * quelqu'un ou de rapprocher un retour de son auteur. Un tableau, pour comparer
 * colonne par colonne.
 */
const JOUR = new Intl.DateTimeFormat("fr-BE", { dateStyle: "medium" });
const JOUR_ET_HEURE = new Intl.DateTimeFormat("fr-BE", { dateStyle: "medium", timeStyle: "short" });

const PLANS = { GRATUIT: "Gratuit", MENSUEL: "Mensuel", ANNUEL: "Annuel" } as const;

export function BlocListeDesComptes({ comptes }: { comptes: CompteInscrit[] }) {
  if (comptes.length === 0) {
    return (
      <Section intitule="Qui a un compte">
        <p className="text-petit max-w-prose text-stone-500">
          Personne encore. Les comptes apparaîtront ici du plus récent au plus ancien.
        </p>
      </Section>
    );
  }

  return (
    <Section
      intitule="Qui a un compte"
      contexte="Du plus récent au plus ancien. Les compteurs sont des totaux depuis l'inscription, pas des fenêtres."
    >
      {/* Sept colonnes ne tiennent pas sur téléphone : le tableau défile dans
          sa boîte, sans emporter la page. */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[46rem] border-collapse text-left">
          <thead>
            <tr className="border-b border-stone-300">
              <Entete>Adresse</Entete>
              <Entete>Inscrit</Entete>
              <Entete>Dernier passage</Entete>
              <Entete chiffre>Dépôts</Entete>
              <Entete chiffre>Concepts</Entete>
              <Entete chiffre>Série</Entete>
              <Entete>Plan</Entete>
            </tr>
          </thead>
          <tbody>
            {comptes.map((compte) => (
              <tr key={compte.id} className="border-b border-stone-300 last:border-b-0">
                <td className="py-pas-2 pr-pas-4 text-petit text-stone-900">
                  <span className="font-medium">{compte.email}</span>
                  {/* Une adresse non vérifiée explique un rappel qui ne produit
                      rien. */}
                  {compte.emailVerifie ? null : (
                    <span className="text-mono ml-pas-2 font-mono text-stone-500">
                      non vérifiée
                    </span>
                  )}
                  <span className="text-mono block font-mono text-stone-500">{compte.nom}</span>
                </td>
                <Cellule>{JOUR.format(compte.inscritLe)}</Cellule>
                <Cellule>
                  {compte.dernierPassage ? JOUR_ET_HEURE.format(compte.dernierPassage) : ABSENT}
                </Cellule>
                <Chiffre valeur={compte.depots} />
                <Chiffre valeur={compte.concepts} />
                <Chiffre valeur={compte.serie} />
                <Cellule>{PLANS[compte.plan]}</Cellule>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function Entete({ children, chiffre = false }: { children: string; chiffre?: boolean }) {
  return (
    <th
      scope="col"
      className={`py-pas-2 pr-pas-4 text-petit font-normal text-stone-500 ${chiffre ? "text-right" : ""}`}
    >
      {children}
    </th>
  );
}

function Cellule({ children }: { children: React.ReactNode }) {
  return <td className="py-pas-2 pr-pas-4 text-mono font-mono text-stone-500">{children}</td>;
}

/** Zéro s'affiche comme zéro : ici, ne rien avoir fait est une information. */
function Chiffre({ valeur }: { valeur: number }) {
  return (
    <td className="py-pas-2 pr-pas-4 text-mono text-right font-mono text-stone-900 tabular-nums">
      {nombre(valeur)}
    </td>
  );
}
