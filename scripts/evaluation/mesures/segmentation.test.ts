import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { LONGUEUR_MINIMALE, segmenter } from "./segmentation";

describe("segmenter", () => {
  it("coupe sur la ponctuation forte", () => {
    const texte =
      "La lumière du soleil traverse l'atmosphère en quelques minutes. Elle y perd une partie de son énergie au passage. Ce qui reste finit par atteindre la surface du sol.";

    expect(segmenter(texte)).toEqual([
      "La lumière du soleil traverse l'atmosphère en quelques minutes.",
      "Elle y perd une partie de son énergie au passage.",
      "Ce qui reste finit par atteindre la surface du sol.",
    ]);
  });

  it("coupe aussi après un point d'exclamation, d'interrogation ou de suspension", () => {
    const texte =
      "Combien de temps met la lumière du Soleil pour nous parvenir ? Un peu plus de huit minutes en moyenne, selon la saison… Et rien ne va plus vite qu'elle dans le vide interstellaire !";

    expect(segmenter(texte)).toHaveLength(3);
  });

  it("recolle une phrase entière restée sous la borne", () => {
    // « Le reste atteint le sol. » fait vingt-quatre signes : c'est une phrase,
    // mais trop courte pour qu'un concept ait à la couvrir seule. La fiche fixe
    // la borne à ~40 signes, et c'est ce comportement-là qu'elle décrit.
    const texte =
      "La lumière du soleil traverse l'atmosphère en quelques minutes. Le reste atteint le sol.";

    expect(segmenter(texte)).toEqual([
      "La lumière du soleil traverse l'atmosphère en quelques minutes. Le reste atteint le sol.",
    ]);
  });

  it("recolle un paragraphe coupé dur, sans y voir une unité par ligne", () => {
    // `03-article-colle.md` est un article collé tel quel, coupé autour de la
    // soixante-dizième colonne. Une unité par ligne y fabriquait des bouts de
    // phrase qu'aucun concept ne pouvait couvrir, et la couverture s'effondrait
    // sur la mise en forme du fichier plutôt que sur un oubli du modèle.
    const texte = [
      "JavaScript n'exécute qu'une chose à la fois. Il y a une seule pile",
      "d'appels, et tant qu'une fonction n'a pas rendu la main, absolument rien",
      "d'autre ne s'exécute.",
    ].join("\n");

    expect(segmenter(texte)).toEqual([
      "JavaScript n'exécute qu'une chose à la fois.",
      "Il y a une seule pile d'appels, et tant qu'une fonction n'a pas rendu la main, absolument rien d'autre ne s'exécute.",
    ]);
  });

  it("sépare deux paragraphes séparés par une ligne vide", () => {
    const texte = [
      "Le premier paragraphe porte une idée et se termine sans ponctuation forte",
      "",
      "Le second paragraphe en porte une autre et se termine lui aussi sans point",
    ].join("\n");

    expect(segmenter(texte)).toHaveLength(2);
  });

  it("garde une puce par segment, même sans ponctuation finale", () => {
    // Sans frontière sur les puces, ces deux-là feraient un seul segment et la
    // couverture jugerait d'un bloc ce qui porte deux idées.
    const texte = [
      "Les trois règles à retenir avant de commencer :",
      "- La première règle porte sur la vitesse de propagation du signal",
      "- La deuxième règle porte sur l'atténuation dans le milieu traversé",
    ].join("\n");

    expect(segmenter(texte)).toEqual([
      "Les trois règles à retenir avant de commencer :",
      "La première règle porte sur la vitesse de propagation du signal",
      "La deuxième règle porte sur l'atténuation dans le milieu traversé",
    ]);
  });

  it("rattache les lignes de continuation d'une puce à cette puce", () => {
    const texte = [
      "- La première règle porte sur la vitesse de propagation du signal dans",
      "  le milieu traversé, et sur rien d'autre",
      "- La deuxième règle porte sur l'atténuation, qui dépend de la distance",
    ].join("\n");

    const segments = segmenter(texte);

    expect(segments).toHaveLength(2);
    expect(segments[0]).toBe(
      "La première règle porte sur la vitesse de propagation du signal dans le milieu traversé, et sur rien d'autre",
    );
  });

  it("reconnaît les puces numérotées et les marques exotiques", () => {
    const texte = [
      "1. La première proposition tient sur une ligne entière et se suffit",
      "2) La deuxième proposition tient elle aussi sur une ligne entière",
      "• La troisième proposition ferme la liste sans rien ajouter d'autre",
    ].join("\n");

    expect(segmenter(texte)).toHaveLength(3);
    expect(segmenter(texte)[0]).toBe(
      "La première proposition tient sur une ligne entière et se suffit",
    );
  });

  it("garde le texte d'un titre markdown, sans ses dièses", () => {
    const texte = [
      "## Le principe de la mesure",
      "",
      "On plonge les phrases et les concepts dans le même espace vectoriel commun.",
    ].join("\n");

    expect(segmenter(texte)).toEqual([
      "Le principe de la mesure On plonge les phrases et les concepts dans le même espace vectoriel commun.",
    ]);
  });

  it("ferme l'unité en cours quand un titre survient sans ligne vide avant lui", () => {
    const texte = [
      "Une phrase de fin de section qui se termine sans ponctuation forte",
      "## Le titre de la section suivante arrive juste derrière",
      "Et le paragraphe qui la commence tient sur cette ligne-ci exactement",
    ].join("\n");

    expect(segmenter(texte)).toHaveLength(3);
  });

  it("recolle un premier fragment trop court à son suivant", () => {
    // Rien ne le précède au moment où il entre : il doit rejoindre l'aval.
    const texte = "Attention. La densité de l'eau atteint son maximum à quatre degrés Celsius.";

    expect(segmenter(texte)).toEqual([
      "Attention. La densité de l'eau atteint son maximum à quatre degrés Celsius.",
    ]);
  });

  it("ne filtre aucun contenu, pas même une ligne de tâche", () => {
    // `21-mixte` : ces lignes doivent ressortir « anodines » chez le juge de
    // résidu, pas disparaître avant d'avoir été jugées.
    const texte = [
      "Le point de rosée dépend de la température et de l'humidité relative.",
      "- Rappeler à Marc de renvoyer le devis avant vendredi prochain matin",
    ].join("\n");

    expect(segmenter(texte)).toHaveLength(2);
    expect(segmenter(texte)[1]).toContain("Marc");
  });

  it("ignore le soulignement d'un titre alterné", () => {
    const texte = ["Le principe de la mesure", "========================", ""].join("\n");

    expect(segmenter(texte)).toEqual(["Le principe de la mesure"]);
  });

  it("rend une liste vide sur un texte vide ou blanc", () => {
    expect(segmenter("")).toEqual([]);
    expect(segmenter("   \n\n  \t ")).toEqual([]);
  });

  it("est déterministe : deux appels rendent le même découpage", () => {
    fc.assert(
      fc.property(fc.string(), (texte) => {
        expect(segmenter(texte)).toEqual(segmenter(texte));
      }),
    );
  });

  it("ne perd aucun mot du texte", () => {
    fc.assert(
      fc.property(fc.string(), (texte) => {
        const motsDuTexte = texte.split(/\s+/).filter(Boolean).join(" ");
        const motsDesSegments = segmenter(texte).join(" ").split(/\s+/).filter(Boolean).join(" ");

        // Seuls les dièses de titre, les marques de puce et les soulignements
        // disparaissent : tout le reste doit se retrouver dans les segments.
        expect(motsDuTexte.length).toBeGreaterThanOrEqual(motsDesSegments.length);
      }),
    );
  });

  it("ne rend que des segments non vides et sans blancs de bord", () => {
    fc.assert(
      fc.property(fc.string(), (texte) => {
        for (const segment of segmenter(texte)) {
          expect(segment).toBe(segment.trim());
          expect(segment.length).toBeGreaterThan(0);
        }
      }),
    );
  });

  it("ne laisse qu'au plus un segment sous la longueur minimale", () => {
    // Le cas restant est le texte entier plus court que la borne : il n'a
    // personne à qui se recoller.
    fc.assert(
      fc.property(fc.string(), (texte) => {
        const courts = segmenter(texte).filter((s) => s.length < LONGUEUR_MINIMALE);

        expect(courts.length).toBeLessThanOrEqual(1);
      }),
    );
  });
});
