// i18n-ignore-fichier — outil de l'administrateur, qui reste en français par décision du 08/10/2026.
import Link from "next/link";
import { Section } from "@/components/administration/section";
import { LigneDeRetour } from "@/components/administration/ligne-de-retour";
import { ROUTES } from "@/lib/auth/routes";
import type { PageDeRetours } from "@/lib/db/retour";
import { cn } from "@/lib/fusion-des-classes";

/**
 * Sur tout sauf une question générée (les signalements). Le non-traité passe
 * devant quel que soit son âge, sinon il redescendrait sous les classés.
 */
export function BlocRetours({ page }: { page: PageDeRetours }) {
  return (
    <Section
      intitule="Retours"
      contexte={
        page.total === 0
          ? "Rien pour l'instant."
          : page.aLire === 0
            ? "Tout est lu. Les plus récents d'abord."
            : `${page.aLire} à lire, et ils passent devant.`
      }
    >
      {page.total === 0 ? (
        <p className="text-petit max-w-prose text-stone-500">
          Ce que les comptes écrivent depuis leurs réglages arrivera ici, avec la largeur de leur
          fenêtre, leur navigateur, et la capture s&apos;ils en ont joint une.
        </p>
      ) : (
        <>
          <ul className="divide-y divide-stone-300">
            {page.lignes.map((retour) => (
              <LigneDeRetour key={retour.id} retour={retour} />
            ))}
          </ul>

          <Pagination page={page} />
        </>
      )}
    </Section>
  );
}

function Pagination({ page }: { page: PageDeRetours }) {
  if (page.pages <= 1) return null;

  return (
    <nav
      aria-label="Pages de retours"
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

/** Absent, ni lien mort ni libellé grisé ; la grille tient sa place. */
function Rang({ cible, actif, children }: { cible: number; actif: boolean; children: string }) {
  if (!actif) return <span aria-hidden />;

  return (
    <Link
      href={`${ROUTES.adminRetours}?page=${cible}`}
      className={cn(
        "rounded-galet text-petit underline-offset-4",
        "text-stone-500 hover:text-stone-900 hover:underline focus-visible:underline",
      )}
    >
      {children}
    </Link>
  );
}
