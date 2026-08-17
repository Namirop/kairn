import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { LICHEN, PAPIER } from "@/lib/design/couleurs-hors-css";
import { PIERRES_DENSE } from "@/lib/design/marque";
import { symboleSeul } from "@/lib/design/symbole-svg";

/**
 * L'aperçu d'un lien vers Kairn, dans une messagerie ou sur un réseau.
 *
 * Le verrouillage sur le papier, et la phrase qui dit ce que fait le produit.
 * Rien d'autre : une image de partage se lit en un huitième de seconde dans une
 * conversation, entre deux messages, à trois cents pixels de large.
 *
 * **Le symbole vient du même endroit que la favicon** — `symboleSeul()`, donc
 * `empiler()`. Il est passé en image parce que le moteur de rendu ne compose que
 * du texte et des boîtes ; c'est le même SVG que le fichier de `public/`, en ligne.
 *
 * Elle est produite par cette route et non par le script d'export, contrairement
 * aux icônes : elle porte du texte, et une image cuite par `sharp` composerait ce
 * texte avec les polices du système d'exploitation qui la fabrique — c'est-à-dire
 * pas avec Bricolage Grotesque. Ici la fonte est chargée depuis le dépôt et
 * embarquée, donc le rendu est le même partout. Next la fige au build : elle ne
 * coûte rien à l'exécution.
 *
 * Pas de grain non plus : ce moteur ne connaît pas les filtres SVG, et un faux
 * grain plaqué serait une autre texture que celle du site.
 */

export const alt = "Kairn — dépose ce que tu apprends, il te le repose au bon moment.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const ACCROCHE = ["Tu lis beaucoup.", "Tu retiens peu."];
const PHRASE =
  "Dépose ce que tu apprends. Kairn le découpe en concepts et te les repose au bon moment.";

/** L'encre et le gris second du papier, écrits ici pour la même raison que le reste. */
const ENCRE = "#16191a";
const GRIS = "#5e635f";

export default async function Image() {
  const display = await readFile(join(process.cwd(), "app/fonts/BricolageGrotesque-600.ttf"));

  // Cent vingt pixels, donc au-dessus du seuil : c'est là que le verrouillage
  // porte vraiment ses cinq pierres, chaque étage gardant de quoi se distinguer
  // du suivant même une fois l'image réduite dans une conversation.
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
      {/* Le verrouillage : le symbole, puis le mot. Le mot n'y porte pas la
            pierre sur son i — le symbole est déjà là, et deux pierres
            raconteraient deux fois la même chose. */}
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

      {/* Les deux lignes sont deux blocs, comme sur la page : c'est un constat
            et son retournement, pas un titre de deux lignes. */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {ACCROCHE.map((ligne) => (
          <div
            key={ligne}
            style={{ fontSize: 82, lineHeight: 1.06, color: ENCRE, letterSpacing: "-0.03em" }}
          >
            {ligne}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {/* Le seul trait de l'image, et il porte le lichen : le même accent
              qu'au sommet du cairn. */}
        <div style={{ width: 96, height: 6, background: LICHEN, marginBottom: 28 }} />
        <div style={{ fontSize: 32, lineHeight: 1.35, color: GRIS, maxWidth: 780 }}>{PHRASE}</div>
      </div>
    </div>,
    {
      ...size,
      fonts: [{ name: "Bricolage", data: display, style: "normal", weight: 600 }],
    },
  );
}
