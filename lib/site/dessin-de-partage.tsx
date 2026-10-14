import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { ACCENT, PAPIER } from "@/lib/design/couleurs-hors-css";
import { PIERRES_DENSE } from "@/lib/design/marque";
import { symboleSeul } from "@/lib/design/symbole-svg";
import type { Langue } from "@/lib/db/types";
import { MESSAGES } from "@/lib/i18n/messages";

/**
 * L'aperçu d'un lien vers Kairn, dans une messagerie ou sur un réseau : le
 * verrouillage et une phrase, rien d'autre, parce qu'elle se lit en un instant
 * à trois cents pixels de large.
 *
 * Le symbole est le même SVG que la favicon (`symboleSeul()`), passé en image :
 * le moteur ne compose que du texte et des boîtes.
 *
 * Elle est rendue ici et non par le script d'export des icônes : `sharp`
 * composerait le texte avec les polices du système qui la fabrique, pas avec
 * Bricolage Grotesque, embarquée ici. Pas de grain : ce moteur ignore les
 * filtres SVG.
 *
 * Une langue par adresse, jamais par requête : les robots qui la demandent
 * n'ont ni cookie ni session. Le français passe par `app/opengraph-image.tsx`,
 * l'anglais par `/partage/en`, que les pages `/en` désignent.
 */
export const TAILLE_DE_PARTAGE = { width: 1200, height: 630 };

/** L'encre et le gris second : ce moteur ne lit pas les variables CSS. */
const ENCRE = "#0d2236";
const GRIS = "#345770";

export async function dessinerLImageDePartage(langue: Langue): Promise<ImageResponse> {
  const { constat, retournement, phrase } = MESSAGES[langue].site.partage;
  const accroche = [constat, retournement];

  const display = await readFile(join(process.cwd(), "app/fonts/BricolageGrotesque-600.ttf"));

  // Affiché à cent vingt pixels, au-dessus de `SEUIL_SYMBOLE_DENSE` : les cinq
  // pierres restent distinctes même une fois l'image réduite.
  const symbole = symboleSeul({ pierres: PIERRES_DENSE, hauteurPx: 240 });

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "80px 96px",
        background: PAPIER,
        fontFamily: "Bricolage",
      }}
    >
      {/* Le mot n'y porte pas la pierre sur son i : le symbole est déjà là. */}
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- ce moteur rend
              une image, pas une page : `next/image` n'y existe pas. */}
        <img
          src={`data:image/svg+xml;base64,${Buffer.from(symbole).toString("base64")}`}
          height={120}
          alt=""
        />
        <div style={{ fontSize: 68, color: ENCRE, letterSpacing: "-0.02em" }}>Kairn</div>
      </div>

      {/* Deux blocs, comme sur la page : un constat et son retournement, pas
            un titre de deux lignes. */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {accroche.map((ligne) => (
          <div
            key={ligne}
            style={{ fontSize: 82, lineHeight: 1.06, color: ENCRE, letterSpacing: "-0.03em" }}
          >
            {ligne}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {/* L'accent et non le lichen : le lichen ne dit que la maîtrise. */}
        <div style={{ width: 96, height: 6, background: ACCENT, marginBottom: 28 }} />
        <div style={{ fontSize: 32, lineHeight: 1.35, color: GRIS, maxWidth: 780 }}>{phrase}</div>
      </div>
    </div>,
    {
      ...TAILLE_DE_PARTAGE,
      fonts: [{ name: "Bricolage", data: display, style: "normal", weight: 600 }],
    },
  );
}
