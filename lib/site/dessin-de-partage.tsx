import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { ACCENT, PAPIER } from "@/lib/design/couleurs-hors-css";
import { PIERRES_DENSE } from "@/lib/design/marque";
import { symboleSeul } from "@/lib/design/symbole-svg";
import type { Langue } from "@/lib/db/types";
import { MESSAGES } from "@/lib/i18n/messages";

/**
 * L'aperçu d'un lien partagé : le verrouillage et une phrase, lus en un instant
 * à 300 px de large. Le symbole passe en image (le moteur ne compose que texte
 * et boîtes) ; pas de grain, il ignore les filtres SVG. Rendu ici plutôt que par
 * `sharp`, qui prendrait les polices du système et non Bricolage.
 *
 * Une langue par adresse, jamais par requête : les robots n'ont ni cookie ni
 * session. Français par `app/opengraph-image.tsx`, anglais par `/partage/en`.
 */
export const TAILLE_DE_PARTAGE = { width: 1200, height: 630 };

/** Ce moteur ne lit pas les variables CSS. */
const ENCRE = "#0d2236";
const GRIS = "#345770";

export async function dessinerLImageDePartage(langue: Langue): Promise<ImageResponse> {
  const { constat, retournement, phrase } = MESSAGES[langue].site.partage;
  const accroche = [constat, retournement];

  const display = await readFile(join(process.cwd(), "app/fonts/BricolageGrotesque-600.ttf"));

  // Affiché à 120 px, au-dessus de `SEUIL_SYMBOLE_DENSE` : cinq pierres distinctes.
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
      {/* Pas de pierre sur le i : le symbole est déjà là. */}
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
