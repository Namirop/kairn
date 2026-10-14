import "dotenv/config";
import { prisma } from "@/lib/db/client";
import { demanderDesQuestions } from "@/lib/db/demande-de-questions";
import { conclure, record } from "../verification/cases/journal";

/**
 * Réécrire les questions déjà en base sous un prompt qui a changé.
 *
 * Une question porte la version du prompt qui l'a écrite, et une correction de
 * prompt ne touche que ce qui sera généré ensuite. Le stock, lui, garde ses
 * formulations — parfois pendant des mois, puisqu'une question ne se réécrit
 * qu'à l'usure. Ce script sert le jour où l'on ne veut pas attendre.
 *
 * **Il ne fabrique aucun chemin parallèle.** Il appelle `demanderDesQuestions`,
 * celui de la production, qui porte les garde-fous : une place hebdomadaire par
 * concept, pas de seconde demande pour un concept déjà en file, et un job qui
 * retire les anciennes questions **au moment** où les nouvelles arrivent, jamais
 * avant. Rien n'est supprimé : les passages passés citent les anciennes
 * formulations, et la planification vit sur le concept, pas sur la question.
 *
 * Il met en file, il n'appelle pas le modèle : ce sont les passages planifiés
 * qui relèveront les jobs, à leur rythme.
 *
 *   npm run regenerer:questions                      # simulation, n'écrit rien
 *   npm run regenerer:questions -- --pour-de-vrai    # met les demandes en file
 *   npm run regenerer:questions -- --compte=moi@exemple.fr
 *   npm run regenerer:questions -- --avec-les-essais # inclut les dépôts sans compte
 */

type Cible = { id: string; inputId: string; userId: string | null };

function lireLOption(nom: string): string | undefined {
  const prefixe = `--${nom}=`;

  return process.argv.find((argument) => argument.startsWith(prefixe))?.slice(prefixe.length);
}

/**
 * Les concepts qui ont quelque chose à réécrire.
 *
 * Un concept sans question vivante n'en a jamais eu, ou les a toutes vu
 * retirer : dans les deux cas il n'y a pas de formulation à corriger, et le
 * découpage lui en donnera par son propre chemin.
 */
async function ciblesARegenerer(): Promise<Cible[]> {
  const email = lireLOption("compte");
  const avecLesEssais = process.argv.includes("--avec-les-essais");

  const compte = email
    ? await prisma.user.findFirstOrThrow({ where: { email }, select: { id: true } })
    : null;

  return prisma.atom.findMany({
    where: {
      variants: { some: { retiredAt: null } },
      ...(compte ? { userId: compte.id } : {}),
      // Les essais sans compte s'éteignent d'eux-mêmes et personne ne les
      // réclame : les réécrire dépense pour des concepts qui n'ont pas de
      // lecteur. On les prend s'il le faut, jamais par défaut.
      ...(compte || avecLesEssais ? {} : { userId: { not: null } }),
    },
    select: { id: true, inputId: true, userId: true },
    orderBy: { createdAt: "asc" },
  });
}

async function main(): Promise<string> {
  const cibles = await ciblesARegenerer();
  const parCompte = new Map<string, number>();

  for (const cible of cibles) {
    const cle = cible.userId ?? "essais sans compte";
    parCompte.set(cle, (parCompte.get(cle) ?? 0) + 1);
  }

  console.info(`${cibles.length} concept(s) à réécrire, répartis ainsi :\n`);
  for (const [cle, nombre] of [...parCompte].sort((a, b) => b[1] - a[1])) {
    // Le plafond d'appels se compte par compte et par jour : c'est cette
    // colonne, et pas le total, qui dit si tout passera en une fois.
    console.info(`  ${nombre.toString().padStart(4)}  ${cle}`);
  }
  console.info();

  if (!process.argv.includes("--pour-de-vrai")) {
    return "Simulation : rien n'a été écrit. Ajoute --pour-de-vrai pour mettre les demandes en file.";
  }

  const issues = new Map<string, number>();

  for (const cible of cibles) {
    const demande = await demanderDesQuestions(cible);
    issues.set(demande.etat, (issues.get(demande.etat) ?? 0) + 1);
  }

  for (const [etat, nombre] of [...issues].sort((a, b) => b[1] - a[1])) {
    record(`Demandes en état « ${etat} »`, etat !== "trop-tot", `${nombre} concept(s)`);
  }

  return "Les demandes sont en file. Les passages planifiés les relèveront.";
}

main()
  .then(conclure)
  .catch((erreur: unknown) => {
    console.error("La réécriture a échoué.", erreur);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
