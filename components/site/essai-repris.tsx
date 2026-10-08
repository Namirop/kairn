"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Cairn } from "@/components/cairn/cairn";
import { Apparition, Temps } from "@/components/site/apparition";
import { PorteDeSortie } from "@/components/site/porte-de-sortie";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/auth/routes";

/**
 * Ce que la bande garde quand la fenêtre de l'essai est fermée.
 *
 * Le découpage a donné quelque chose, et il faut que la page le dise : sans
 * rappel, fermer la fenêtre effacerait le résultat, et revenir sur le site dans
 * les sept jours du cookie retomberait sur un champ vide alors que les concepts
 * sont là.
 *
 * **C'est un rappel, pas une seconde copie du résultat.** La tentation était de
 * remettre la liste des concepts et l'échantillon dans la bande, ce qui aurait
 * demandé de rendre tout l'arbre sur deux surfaces — et aurait rendu à la bande
 * le défaut qu'on vient de lui retirer, celui d'être plusieurs mises en page à
 * la fois. Ici il n'y a que ce qui sert à décider : combien, l'appel à garder,
 * et de quoi rouvrir.
 *
 * **Le cairn fait le lien.** C'est le même empilement que dans la fenêtre,
 * dessiné à partir des mêmes identifiants, donc exactement la même figure :
 * rouvrir ne donne pas l'impression d'ouvrir autre chose.
 *
 * **Il est à côté du titre, et plus en dessous.** Posé sous une ligne de soixante
 * pixels, un cairn d'une seule pierre est une barre sombre de cent points de
 * large sur quinze de haut : on ne lit pas une pierre, on lit un trait resté là.
 * À gauche du titre et centré sur sa hauteur, il redevient ce qu'il est — un
 * objet posé au sol, à côté du nombre qu'il dessine. Sa hauteur grandit avec les
 * concepts, le centrage ne bouge pas.
 *
 * **Le titre n'a plus de coupure forcée**, et il en avait une au milieu. Sur le
 * bureau, « 1 concept t'attend. » fait cinq cent sept points dans une colonne qui
 * en offre six cent cinquante-six : la ligne tenait déjà, on la cassait en deux
 * pour rien. Au-delà d'un concept, le pli revient tout seul et au bon endroit —
 * ce qu'une balise posée à la main ne sait pas faire.
 *
 * **Il ne paraît qu'à partir de deux pierres.** Une pierre seule n'est pas un
 * empilement, et le dessin le dit sans détour : la vue d'un cairn est large de
 * cent unités pour une pierre haute de quinze, donc à un concept la figure est
 * une barre sombre de quatre-vingts points sur dix-sept, posée sur un trait. Ni
 * la position ni la taille n'y changent rien — élargie à cent quarante, c'est
 * une barre plus longue, et elle renvoie le titre à la ligne. Ce qu'on perd à un
 * concept est un ornement ; ce qu'on garderait est un tiret qu'on prend pour une
 * coquille. À deux, il y a un empilement, et la figure redevient la signature du
 * produit.
 *
 * **Sur téléphone, le cairn s'efface.** La ligne y demande trois cent
 * trente-huit points pour trois cent trente et un disponibles. Entre un cairn
 * qui prend le tiers de la largeur pour renvoyer le titre à la ligne, et un
 * titre entier, c'est le titre qui porte la bande — le cairn, lui, est dans la
 * fenêtre, à un geste d'ici.
 *
 * **Et le corps du titre se mesure à la fenêtre en dessous de quatre cent
 * vingt-cinq points.** Il manquait sept pixels pour que la ligne tienne sur un
 * téléphone de trois cent quatre-vingt-dix : à deux pour cent près, on lisait
 * « 1 concept » puis « t'attend. », c'est-à-dire la coupure qu'on venait de
 * retirer. Le corps suit donc la largeur tant qu'elle est plus contraignante que
 * lui, et reprend sa valeur de jeton dès qu'elle ne l'est plus — soit partout
 * au-dessus d'un grand téléphone. La formule est réglée sur la phrase la plus
 * longue à un concept, cas de loin le plus fréquent sur la landing ; au-delà,
 * le pli revient et c'est très bien.
 *
 * Il porte la charpente du formulaire qu'il remplace — titre à gauche, contenu à
 * droite, même mesure, même grille. La bande ne change pas de forme selon son
 * état : c'est tout l'objet de la manœuvre.
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

        {/* Les trois gestes sur une seule ligne, comme dans le pied de la
            fenêtre. « Déposer autre chose » vivait en dessous, seul sur sa
            ligne : un lien isolé sous deux boutons se lit comme un quatrième
            niveau de hiérarchie alors que c'est la porte de sortie du même
            groupe. Les trois font cinq cent dix points dans une colonne qui en
            offre cinq cent soixante-seize, et le `flex-wrap` les replie sur un
            téléphone. */}
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
