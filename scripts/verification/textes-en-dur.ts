/**
 * Les textes d'interface restés en dur, hors des fichiers de messages.
 *
 * Lit l'arbre syntaxique plutôt que le texte : les commentaires du projet sont
 * en français et le resteront, et une recherche d'accents les ramènerait tous.
 * Relève le texte JSX et les chaînes qui contiennent une lettre accentuée ou au
 * moins deux mots, en écartant ce qui n'est jamais montré — classes, imports,
 * clés de traduction, journaux.
 *
 * Usage : `npx tsx scripts/verification/textes-en-dur.ts components/revision app/(app)/reviser`
 * Sans argument : `app`, `components`, `lib/email`. Rend un code non nul s'il
 * reste quelque chose, pour servir de critère de fin à une zone traduite.
 *
 * Un faux positif se tait en posant `// i18n-ignore` sur la ligne au-dessus —
 * avec la raison, comme partout ailleurs.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

const ATTRIBUTS_INVISIBLES = new Set([
  "className",
  "href",
  "src",
  "id",
  "key",
  "type",
  "name",
  "role",
  "variant",
  "size",
  "data-coquille",
  "htmlFor",
  "autoComplete",
  "inputMode",
  "rel",
  "target",
  "method",
  "lang",
]);

const APPELS_INVISIBLES =
  /^(console\.\w+|t|useTranslations|getTranslations|cn|cva|require|Error|.*Error)$/;

function fichiers(chemin: string): string[] {
  if (statSync(chemin).isFile()) return [chemin];

  return readdirSync(chemin).flatMap((nom) => {
    const complet = join(chemin, nom);

    if (statSync(complet).isDirectory()) return nom === "generated" ? [] : fichiers(complet);

    return /\.tsx?$/.test(nom) && !/\.test\.ts$|\.d\.ts$/.test(nom) ? [complet] : [];
  });
}

function ressembleAUnTexte(valeur: string): boolean {
  const texte = valeur.trim();

  if (!/\p{L}/u.test(texte)) return false;
  if (/var\(--|color-mix\(|calc\(|url\(/.test(texte)) return false; // du CSS composé
  if (/^[\w.-]+$/.test(texte) && !/[À-ÿ]/.test(texte)) return false; // un identifiant, un code
  if (/^[a-z0-9:_\-[\]/.()% #>&=*,'"@!]+$/.test(texte) && !/\s\p{Lu}/u.test(texte)) {
    return /[À-ÿ]/.test(texte); // des classes utilitaires, sauf accent
  }

  return (
    /[À-ÿ]/.test(texte) || /\p{L}{2,}\s+\p{L}{2,}/u.test(texte) || /^\p{Lu}\p{Ll}+/u.test(texte)
  );
}

function nomAppele(appel: ts.CallExpression): string {
  return appel.expression.getText();
}

function estInvisible(noeud: ts.Node): boolean {
  for (let parent = noeud.parent; parent; parent = parent.parent) {
    if (ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent)) return true;
    if (ts.isJsxAttribute(parent)) return ATTRIBUTS_INVISIBLES.has(parent.name.getText());
    if (ts.isCallExpression(parent) && APPELS_INVISIBLES.test(nomAppele(parent))) return true;
    if (ts.isNewExpression(parent) && /Error$/.test(parent.expression.getText())) return true;
    if (ts.isPropertyAssignment(parent) && /^(className|href|key)$/.test(parent.name.getText())) {
      return true;
    }
    if (ts.isBlock(parent) || ts.isSourceFile(parent)) return false;
  }

  return false;
}

function relever(fichier: string): string[] {
  const source = ts.createSourceFile(
    fichier,
    readFileSync(fichier, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  const lignes = source.getFullText().split("\n");
  const releves: string[] = [];

  function visiter(noeud: ts.Node): void {
    const texte = ts.isJsxText(noeud)
      ? noeud.getText()
      : ts.isStringLiteral(noeud) || ts.isNoSubstitutionTemplateLiteral(noeud)
        ? noeud.text
        : ts.isTemplateExpression(noeud)
          ? noeud.getText()
          : null;

    if (texte !== null && ressembleAUnTexte(texte) && !estInvisible(noeud)) {
      const ligne = source.getLineAndCharacterOfPosition(noeud.getStart()).line;

      if (!lignes[ligne - 1]?.includes("i18n-ignore")) {
        releves.push(`${fichier}:${ligne + 1}  ${texte.trim().replace(/\s+/g, " ").slice(0, 90)}`);
      }
    }

    if (!ts.isTemplateExpression(noeud)) ts.forEachChild(noeud, visiter);
  }

  visiter(source);

  return releves;
}

const cibles = process.argv.slice(2);
const releves = (cibles.length > 0 ? cibles : ["app", "components", "lib/email"])
  .flatMap(fichiers)
  .flatMap(relever);

for (const releve of releves) console.log(releve);
console.log(`\n${releves.length} texte(s) en dur.`);
process.exitCode = releves.length > 0 ? 1 : 0;
