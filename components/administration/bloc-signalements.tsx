import Link from "next/link";
import { Section } from "@/components/administration/section";
import { LigneDeSignalement } from "@/components/signalements/ligne-de-signalement";
import { ROUTES } from "@/lib/auth/routes";
import type { PageDeSignalements } from "@/lib/db/signalement";
import { cn } from "@/lib/utils";

/**
 * Ce qu'on reproche aux questions, dans l'ordre où c'est arrivé.
 *
 * C'est la seule instrumentation qualitative du produit : les compteurs disent
 * combien de questions ont été écrites, ceux-ci disent lesquelles n'auraient pas
 * dû l'être. L'empreinte de prompt portée par chaque ligne est ce qui permet de
 * rattacher une série de plaintes à un réglage précis plutôt qu'à une
 * impression.
 *
 * La liste est paginée court. Un signalement se lit en entier — question,
 * réponse, concept, empreinte —, donc cinq occupent déjà un écran ; à cent, une
 * page unique devient une chose qu'on fait défiler sans lire, et un signalement
 * qu'on ne lit pas ne sert à rien.
 *
 * Le décompte ne figure pas dans l'intitulé mais sous la liste, avec le rang de
 * page : c'est là qu'il sert, et un nombre entre parenthèses dans un titre n'est
 * pas une façon d'écrire.
 */
export function BlocSignalements({ page }: { page: PageDeSignalements }) {
  return (
    <Section
      intitule="Signalements"
      contexte={
        page.total === 0
          ? "Rien pour l'instant."
          : "Les plus récents d'abord. L'empreinte dit sous quel prompt la question a été écrite."
      }
    >
      {page.total === 0 ? (
        <p className="text-petit max-w-prose text-stone-500">
          Les questions signalées pendant une session arriveront ici, avec le concept dont elles
          sont tirées et le réglage qui les a écrites.
        </p>
      ) : (
        <>
          <ul className="divide-y divide-stone-300">
            {page.lignes.map((signalement) => (
              <LigneDeSignalement key={signalement.id} signalement={signalement} />
            ))}
          </ul>

          <Pagination page={page} />
        </>
      )}
    </Section>
  );
}

function Pagination({ page }: { page: PageDeSignalements }) {
  if (page.pages <= 1) return null;

  return (
    <nav
      aria-label="Pages de signalements"
      className="gap-pas-4 mt-pas-6 pt-pas-4 grid grid-cols-3 items-center border-t border-stone-300"
    >
      <Rang cible={page.page - 1} actif={page.page > 1}>
        Précédents
      </Rang>

      <p className="text-mono text-center font-mono text-stone-500 tabular-nums">
        Page {page.page} sur {page.pages} · {page.total} au total
      </p>

      <div className="text-right">
        <Rang cible={page.page + 1} actif={page.page < page.pages}>
          Suivants
        </Rang>
      </div>
    </nav>
  );
}

/**
 * Un bout de page qui n'existe pas ne s'affiche pas du tout.
 *
 * Ni lien mort — atteignable au clavier pour n'arriver nulle part —, ni libellé
 * grisé, qui aurait demandé une encre trop pâle pour rester lisible. La place
 * reste tenue par la grille, donc le rang de page ne se déplace pas quand on
 * passe de la première page à la deuxième.
 */
function Rang({ cible, actif, children }: { cible: number; actif: boolean; children: string }) {
  if (!actif) return <span aria-hidden />;

  return (
    <Link
      href={`${ROUTES.adminSignalements}?page=${cible}`}
      className={cn(
        "rounded-galet text-petit underline-offset-4",
        "text-stone-500 hover:text-stone-900 hover:underline focus-visible:underline",
      )}
    >
      {children}
    </Link>
  );
}
