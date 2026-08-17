import { readFile, mkdir, writeFile } from "node:fs/promises";
import React from "react";
import { ImageResponse } from "next/og";
import { LICHEN, PAPIER, ROCHE } from "@/lib/design/couleurs-hors-css";
import { CORPS_MINIMAL_DE_LA_PIERRE } from "@/components/coquille/mot-de-marque";
import { PIERRES_DENSE, COTE_DU_POINT, pierreDuPoint } from "@/lib/design/marque";
import { symboleSeul } from "@/lib/design/symbole-svg";

/**
 * Les trois variantes de la marque, en images, pour les usages hors application.
 *
 * `npm run marque`. Ce sont des fichiers de référence : ce qu'on joint à un
 * magasin d'applications, ce qu'on colle dans une présentation, ce qu'on regarde
 * pour juger. L'application, elle, ne les sert jamais — elle rend le composant.
 *
 * Le symbole sort de la même géométrie que tout le reste. Le mot, lui, demande une
 * police, donc le moteur de rendu de Next : la fonte est lue dans le dépôt et
 * embarquée, et le rendu est le même partout.
 *
 * **Une approximation, et une seule.** Dans le composant, la pierre du i est posée
 * au milieu de la boîte du `ı`, ce que la mise en page en ligne du navigateur
 * calcule exactement. Ce moteur-ci ne fait pas de mise en page en ligne : le mot y
 * est un seul bloc de texte — pour que le crénage reste juste — et la pierre est
 * placée à une fraction de sa largeur, relevée sur les avances des glyphes. C'est
 * l'écart d'un cheveu sur une image de référence ; **le composant reste la
 * version qui fait foi**, et il ne dépend pas de ce chiffre.
 */

/**
 * Où tombe le centre du `ı` dans « Kaırn », en fraction de la largeur du mot.
 *
 * Relevé sur les avances de Bricolage Grotesque en 600 : K 0,72 em, a 0,55, ı 0,26,
 * r 0,36, n 0,55. Le centre du `ı` tombe donc à 1,40 em sur 2,44.
 */
const CENTRE_DU_I = 0.52;

/** Les mêmes mesures que le composant, en parts de corps. */
const LARGEUR_DE_LA_PIERRE_EM = 0.14;
const BASE_DE_LA_PIERRE_EM = 0.63;

const DOSSIER = "public/marque";

type Ton = { nom: string; clair: boolean; fond: string; encre: string };

const TONS: Ton[] = [
  { nom: "encre", clair: false, fond: PAPIER, encre: "#16191a" },
  { nom: "papier", clair: true, fond: ROCHE, encre: PAPIER },
];

/** Le corps du mot dans les images de référence. Largement au-dessus du seuil. */
const CORPS = 160;

/** La marge autour de la marque, en parts de corps. */
const MARGE = 0.5;

function symboleEnImage(clair: boolean, hauteur: number): React.ReactElement {
  const svg = symboleSeul({ pierres: PIERRES_DENSE, clair, hauteurPx: hauteur * 2 });

  return (
    // eslint-disable-next-line @next/next/no-img-element -- ce moteur rend une
    // image, pas une page : `next/image` n'y existe pas.
    <img
      src={`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`}
      height={hauteur}
      alt=""
    />
  );
}

function pierreEnImage(corps: number): React.ReactElement {
  const cote = COTE_DU_POINT;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-cote / 2} ${-cote / 2} ${cote} ${cote}"><path d="${pierreDuPoint()}" fill="${LICHEN}"/></svg>`;
  const largeur = corps * LARGEUR_DE_LA_PIERRE_EM;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- idem.
    <img
      src={`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`}
      width={largeur}
      style={{
        position: "absolute",
        left: `${CENTRE_DU_I * 100}%`,
        bottom: corps * BASE_DE_LA_PIERRE_EM,
        transform: `translateX(${-largeur / 2}px)`,
      }}
      alt=""
    />
  );
}

function mot(ton: Ton, avecPierre: boolean): React.ReactElement {
  return (
    <div style={{ display: "flex", position: "relative" }}>
      <div
        style={{
          fontSize: CORPS,
          lineHeight: 1,
          color: ton.encre,
          letterSpacing: `${-0.02 * CORPS}px`,
        }}
      >
        {avecPierre ? "Kaırn" : "Kairn"}
      </div>
      {avecPierre ? pierreEnImage(CORPS) : null}
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
