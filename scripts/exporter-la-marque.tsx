import { readFile, mkdir, writeFile } from "node:fs/promises";
import React from "react";
import { ImageResponse } from "next/og";
import { GLACIER, GLACIER_PROFOND, PAPIER, ROCHE } from "@/lib/design/couleurs-hors-css";
import { CORPS_MINIMAL_DE_LA_PIERRE } from "@/components/coquille/mot-de-marque";
import { PIERRES_DENSE, COTE_DU_POINT, pierreDuPoint } from "@/lib/design/marque";
import { symboleSeul } from "@/lib/design/symbole-svg";

/**
 * Les trois variantes de la marque, en images, pour les usages hors application.
 *
 * `npm run exporter:marque`. Ce sont des fichiers de référence : ce qu'on joint à un
 * magasin d'applications, ce qu'on colle dans une présentation, ce qu'on regarde
 * pour juger. L'application, elle, ne les sert jamais — elle rend le composant.
 *
 * Le symbole sort de la même géométrie que tout le reste. Le mot, lui, demande une
 * police, donc le moteur de rendu de Next : la fonte est lue dans le dépôt et
 * embarquée, et le rendu est le même partout.
 *
 * **La pierre du i n'est pas placée à l'estime.** Un premier jet la posait à une
 * fraction de la largeur du mot, relevée sur les avances des glyphes : elle
 * tombait à côté du fût, et la corriger à l'œil aurait donné un nombre juste pour
 * une taille et faux pour les autres.
 *
 * Elle est donc **mesurée par le moteur lui-même**. Le mot visible reste un seul
 * bloc de texte, pour que le crénage soit celui de la police ; par-dessus, une
 * copie invisible de « Ka » et du « ı » sert de gabarit, et la pierre se centre
 * dans la boîte du second. Ce sont les mêmes glyphes dans la même fonte : la
 * largeur du gabarit est exactement celle du mot en dessous, et le placement est
 * le même que celui du composant — au milieu de la boîte du `ı` — sans aucun
 * nombre à régler.
 */

/** Les mêmes mesures que le composant, en parts de corps. */
const LARGEUR_DE_LA_PIERRE_EM = 0.14;
const BASE_DE_LA_PIERRE_EM = 0.66;

const DOSSIER = "public/marque";

type Ton = { nom: string; clair: boolean; fond: string; encre: string };

const TONS: Ton[] = [
  { nom: "encre", clair: false, fond: PAPIER, encre: "#141920" },
  { nom: "papier", clair: true, fond: ROCHE, encre: PAPIER },
];

/** Le corps du mot dans les images de référence. Largement au-dessus du seuil. */
const CORPS = 160;

/** La marge autour de la marque, en parts de corps. */
const MARGE = 0.5;

function symboleEnImage(clair: boolean, hauteur: number): React.ReactElement {
  const svg = symboleSeul({ pierres: PIERRES_DENSE, clair, hauteurPx: hauteur * 2 });

  return (
    // Ce moteur rend une image, pas une page : `next/image` n'y existe pas.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`}
      height={hauteur}
      alt=""
    />
  );
}

function pierreEnImage(corps: number, clair: boolean): React.ReactElement {
  const cote = COTE_DU_POINT;
  const largeur = Math.round(corps * LARGEUR_DE_LA_PIERRE_EM);
  // Les dimensions sont écrites dans le SVG **et** sur l'image : ce moteur ne
  // déduit pas de proportion intrinsèque d'une `viewBox`, et sans elles la pierre
  // s'étirait en une écharde verticale.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${largeur}" height="${largeur}" viewBox="${-cote / 2} ${-cote / 2} ${cote} ${cote}"><path d="${pierreDuPoint()}" fill="${clair ? GLACIER : GLACIER_PROFOND}"/></svg>`;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- idem.
    <img
      src={`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`}
      width={largeur}
      height={largeur}
      style={{
        position: "absolute",
        left: "50%",
        bottom: corps * BASE_DE_LA_PIERRE_EM,
        transform: `translateX(${-largeur / 2}px)`,
      }}
      alt=""
    />
  );
}

/** La typographie du mot, la même pour le texte visible et pour le gabarit. */
function corpsDuMot(couleur: string): React.CSSProperties {
  return {
    fontSize: CORPS,
    lineHeight: 1,
    color: couleur,
    letterSpacing: `${-0.02 * CORPS}px`,
  };
}

function mot(ton: Ton, avecPierre: boolean): React.ReactElement {
  if (!avecPierre) {
    return <div style={corpsDuMot(ton.encre)}>Kairn</div>;
  }

  return (
    <div style={{ display: "flex", position: "relative" }}>
      <div style={corpsDuMot(ton.encre)}>Kaırn</div>

      {/* Le gabarit : les mêmes glyphes, transparents, superposés au mot. Sa
          largeur est donc celle du mot, et la boîte du `ı` tombe pile sur le fût
          qu'on voit dessous. */}
      <div style={{ position: "absolute", left: 0, top: 0, display: "flex" }}>
        <div style={{ ...corpsDuMot("transparent"), display: "flex" }}>Ka</div>
        <div style={{ position: "relative", display: "flex" }}>
          <div style={corpsDuMot("transparent")}>ı</div>
          {pierreEnImage(CORPS, ton.clair)}
        </div>
      </div>
    </div>
  );
}

/** Les six images : trois variantes, deux tons. */
function planches(): { nom: string; largeur: number; hauteur: number; vue: React.ReactElement }[] {
  const marge = CORPS * MARGE;
  const planches = [];

  for (const ton of TONS) {
    const cadre = (largeur: number, hauteur: number, contenu: React.ReactElement) => ({
      largeur: Math.round(largeur),
      hauteur: Math.round(hauteur),
      vue: (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: ton.fond,
            fontFamily: "Bricolage",
          }}
        >
          {contenu}
        </div>
      ),
    });

    planches.push({
      nom: `symbole-${ton.nom}`,
      ...cadre(CORPS * 2 + marge * 2, CORPS * 2 + marge * 2, symboleEnImage(ton.clair, CORPS * 2)),
    });

    planches.push({
      nom: `mot-${ton.nom}`,
      ...cadre(CORPS * 3.2 + marge * 2, CORPS + marge * 2, mot(ton, true)),
    });

    planches.push({
      nom: `verrouillage-${ton.nom}`,
      ...cadre(
        CORPS * 4.4 + marge * 2,
        CORPS * 1.6 + marge * 2,
        <div style={{ display: "flex", alignItems: "center", gap: CORPS * 0.28 }}>
          {symboleEnImage(ton.clair, CORPS * 1.45)}
          {mot(ton, false)}
        </div>,
      ),
    });
  }

  return planches;
}

async function main(): Promise<void> {
  const police = await readFile("app/fonts/BricolageGrotesque-600.ttf");

  await mkdir(DOSSIER, { recursive: true });

  for (const planche of planches()) {
    const image = new ImageResponse(planche.vue, {
      width: planche.largeur,
      height: planche.hauteur,
      fonts: [{ name: "Bricolage", data: police, weight: 600, style: "normal" }],
    });

    const png = Buffer.from(await image.arrayBuffer());
    const chemin = `${DOSSIER}/${planche.nom}.png`;

    await writeFile(chemin, png);
    console.log(
      `${chemin} — ${planche.largeur}×${planche.hauteur}, ${(png.length / 1024).toFixed(1)} ko`,
    );
  }

  console.log(`\nLe seuil de la pierre du i est à ${CORPS_MINIMAL_DE_LA_PIERRE} px de corps.`);
}

void main();
