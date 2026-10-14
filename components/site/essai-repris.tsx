"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Cairn } from "@/components/cairn/cairn";
import { Apparition, Temps } from "@/components/site/apparition";
import { PorteDeSortie } from "@/components/site/porte-de-sortie";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/auth/routes";

/**
 * Ce que la bande garde quand la fenêtre de l'essai est fermée : sans ce
 * rappel, revenir dans les sept jours du cookie retomberait sur un champ vide
 * alors que les concepts sont là. Un rappel, pas une seconde copie du
 * résultat ; il garde la charpente du formulaire qu'il remplace pour que la
 * bande ne change pas de forme selon son état.
 *
 * Le cairn est dessiné à partir des mêmes identifiants que dans la fenêtre,
 * donc il est identique. Il ne paraît qu'à partir de deux pierres : à un
 * concept, la figure (cent unités de large pour une pierre de quinze) se lit
 * comme un trait. Sur téléphone il s'efface : la ligne du titre y demande
 * 338 points pour 331 disponibles.
 *
 * Le corps du titre suit la largeur (`9.4vw`) tant qu'elle contraint plus que
 * le jeton : réglé pour que « 1 concept t'attend. » tienne sur une ligne d'un
 * téléphone de 390 points.
 */
export function EssaiRepris({
  concepts,
  peutRedeposer,
  chaineFinie,
  surRevoir,
  surRedepot,
  prendLeFocus,
}: {
  /** Les identifiants des concepts : le cairn s'en sert pour ses formes. */
  concepts: string[];
  peutRedeposer: boolean;
  /** L'extraction est allée au bout : avant, il n'y a rien à dire de la suite. */
  chaineFinie: boolean;
  surRevoir: () => void;
  surRedepot: () => void;
  /**
   * Le rappel vient de remplacer une fenêtre qu'on ferme, et le clavier doit
   * suivre. Sans ça, Radix rend le focus à un bouton d'envoi qui n'existe plus
   * et il retombe sur le corps du document : on repart du haut de la page.
   *
   * Faux au chargement d'une visite qui revient — prendre le focus ferait
   * défiler la page jusqu'ici avant qu'on ait rien demandé.
   */
  prendLeFocus: boolean;
}) {
  const t = useTranslations("site.essai.repris");
  const combien = concepts.length;

  return (
    <div className="gap-pas-8 md:gap-pas-12 grid md:grid-cols-[1fr_minmax(0,36rem)]">
      <Apparition>
        <Temps>
          <div className="gap-pas-6 flex items-center">
            {combien > 1 ? (
              <Cairn
                nombre={combien}
                graines={concepts}
                className="hidden h-auto w-24 shrink-0 md:block"
              />
            ) : null}

            <h2 className="font-display text-[min(var(--t-h2-site),9.4vw)] leading-[1] font-bold tracking-[-0.02em] tabular-nums">
              {t("titre", { nombre: combien })}
            </h2>
          </div>
        </Temps>
      </Apparition>

      <Apparition>
        <Temps>
          <p className="text-stone-500">{t("texte")}</p>
        </Temps>

        {/* Les trois gestes sur une ligne, comme dans le pied de la fenêtre ;
            `flex-wrap` les replie sur téléphone. */}
        <Temps className="mt-pas-6 md:mt-pas-8">
          <div className="gap-pas-3 md:gap-pas-4 flex flex-wrap items-center">
            <Button asChild size="lg">
              <Link href={ROUTES.connexion}>{t("garder")}</Link>
            </Button>

            <Button type="button" variant="outline" onClick={surRevoir} autoFocus={prendLeFocus}>
              {t("revoir")}
            </Button>

            <PorteDeSortie
              peutRedeposer={peutRedeposer}
              chaineFinie={chaineFinie}
              surRedepot={surRedepot}
            />
          </div>
        </Temps>
      </Apparition>
    </div>
  );
}
