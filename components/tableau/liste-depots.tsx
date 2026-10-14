import Link from "next/link";
import { Image as Capture } from "lucide-react";
import { useTranslations } from "next-intl";
import { PointDeTravail } from "@/components/depots/point-de-travail";
import { EtatVide } from "@/components/etats/etat-vide";
import { Badge } from "@/components/ui/badge";
import { ROUTES } from "@/lib/auth/routes";
import type { DepotListe } from "@/lib/db/depots";
import { anciennete } from "@/lib/domain/echeance";
import { cn } from "@/lib/utils";
import { TexteTechnique } from "@/components/typographie/texte-technique";
import { conceptsLisibles, travailEnCours } from "@/lib/domain/etat-depot";

/**
 * L'avancement d'un dépôt. Un dépôt prêt affiche ce qu'il a produit, pas son
 * état ; le compte de concepts paraît dès qu'il existe, sans attendre les
 * questions. L'alerte est réservée à la panne : un texte qui ne portait rien à
 * retenir n'est pas une avarie.
 */
function Avancement({ depot }: { depot: DepotListe }) {
  const tEtat = useTranslations("etatDepot");
  const t = useTranslations("tableau.aujourdhui.depots");
  const concepts = t("concepts", { nombre: depot.nombreAtoms });

  if (depot.etat === "echec") return <Badge variant="alerte">{tEtat(depot.etat)}</Badge>;

  if (depot.etat === "pret") {
    return <span className="font-mono tabular-nums">{concepts}</span>;
  }

  return (
    <>
      {conceptsLisibles(depot.etat) ? (
        <span className="font-mono tabular-nums">{concepts}</span>
      ) : null}
      <Badge variant="pose">
        {travailEnCours(depot.etat) ? <PointDeTravail /> : null}
        {tEtat(depot.etat)}
      </Badge>
    </>
  );
}

export function ListeDepots({
  depots,
  maintenant,
  fuseau,
  titre,
  avecLien = true,
  surface = "papier",
}: {
  depots: DepotListe[];
  maintenant: Date;
  fuseau: string;
  /**
   * Nul sur la page dédiée, où le titre de page dit déjà de quoi il s'agit.
   * Absent, c'est « Ce que tu as déposé ».
   */
  titre?: string | null;
  avecLien?: boolean;
  /** La surface du panneau qui porte la liste : les cartes prennent l'autre. */
  surface?: "papier" | "ombre";
}) {
  const tTemps = useTranslations("temps");
  const t = useTranslations("tableau.aujourdhui.depots");
  const titreAffiche = titre === undefined ? t("titre") : titre;

  return (
    <section>
      <div className="gap-pas-4 flex items-baseline justify-between">
        {titreAffiche ? (
          <h2 className="text-mono font-mono tracking-[0.14em] text-stone-500 uppercase">
            {titreAffiche}
          </h2>
        ) : (
          <span />
        )}
        {avecLien && depots.length > 0 ? (
          <Link
            href={ROUTES.depots}
            className="text-petit rounded-galet text-stone-500 underline decoration-stone-300 underline-offset-4 transition-colors hover:text-stone-900"
          >
            {t("toutVoir")}
          </Link>
        ) : null}
      </div>

      {depots.length === 0 ? (
        <div className="mt-pas-4">
          <EtatVide constat={t("videConstat")} contexte={t("videContexte")} />
        </div>
      ) : (
        <ul className="mt-pas-4 gap-pas-2 flex max-w-3xl flex-col">
          {depots.map((depot) => (
            <li key={depot.id}>
              <Link
                href={`${ROUTES.depots}/${depot.id}`}
                // Une carte cliquable se soulève : le survol change de surface
                // et décolle d'un cheveu, il ne baisse pas l'opacité.
                className={cn(
                  "p-pas-4 rounded-carte block transition-[transform,background-color] duration-150",
                  "hover:-translate-y-0.5 motion-reduce:hover:translate-y-0",
                  surface === "ombre"
                    ? "bg-surface-papier hover:bg-surface-papier"
                    : "bg-surface-ombre hover:bg-surface-ombre/70",
                )}
              >
                <div className="gap-pas-3 flex">
                  {/* La gouttière de provenance est réservée sur toutes les
                      lignes, vide ou non, pour garder un seul bord gauche au
                      texte. */}
                  <span className="mt-pas-1 size-4 shrink-0">
                    {depot.sourceType === "IMAGE" ? (
                      <Capture aria-hidden className="size-4 text-stone-500" />
                    ) : null}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="text-corps line-clamp-2">
                      {/* L'icône est muette : la provenance se dit ici au
                          lecteur d'écran. */}
                      {depot.sourceType === "IMAGE" ? (
                        <span className="sr-only">{t("capture")} </span>
                      ) : null}
                      {/* L'aperçu est tronqué : un accent grave resté seul
                          s'affiche littéralement, c'est voulu. */}
                      <TexteTechnique>{depot.apercu || t("captureEnLecture")}</TexteTechnique>
                    </p>
                    <p className="mt-pas-2 gap-pas-3 text-mono flex flex-wrap items-center text-stone-500">
                      <Avancement depot={depot} />
                      <span aria-hidden>·</span>
                      <span>
                        {tTemps("anciennete", anciennete(depot.createdAt, maintenant, fuseau))}
                      </span>
                    </p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
