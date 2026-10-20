"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Cairn } from "@/components/cairn/cairn";
import { Apparition, Temps } from "@/components/site/apparition";
import { PorteDeSortie } from "@/components/site/porte-de-sortie";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/auth/routes";

/**
 * Le rappel d'un essai quand la fenêtre est fermée : sans lui, revenir dans les
 * sept jours du cookie retomberait sur un champ vide. Il garde la charpente du
 * formulaire qu'il remplace, pour que la bande ne change pas de forme.
 *
 * Le cairn n'apparaît qu'à deux pierres : seule, une pierre de quinze unités
 * sur cent de large se lit comme un trait. Il s'efface sur téléphone, où la
 * ligne du titre demande 338 points pour 331. Le `9.4vw` du titre fait tenir
 * « 1 concept t'attend. » sur une ligne de 390 points.
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
   * Vrai quand le rappel remplace une fenêtre qu'on ferme : sinon Radix rend le
   * focus à un bouton d'envoi disparu et le clavier repart du haut de la page.
   * Faux au chargement, où le focus ferait défiler la page sans qu'on ait rien
   * demandé.
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
