import "dotenv/config";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { conclure, noter } from "./cases/journal";
import { armerLePiegeReseau, noterLesTentativesReseau } from "./cases/piege-reseau";

/**
 * Preuve, à l'exécution, que le moteur de révision tient : une session se joue
 * du premier passage au dernier, la rotation ne se répète pas, l'archivage
 * repousse au lieu de supprimer, et le signal de maîtrise ne se lève que sur
 * une série qui accélère.
 *
 * Les passages suivent le chemin réel (lecture de session, puis
 * `enregistrerRevision`). Le moteur ne doit pas dépendre du modèle : tout appel
 * sortant vers un fournisseur est piégé et compté comme un échec.
 *
 *   npm run verifier:session
 */

const tentativesReseau = armerLePiegeReseau();

const IDENTIFIANT = "verification-session";

/**
 * L'entraînement tire dans tous les concepts du compte, sans échéance : il a
 * son propre compte pour ne pas piocher dans ceux des autres cas.
 */
const ENTRAINEMENT = "verification-entrainement";

/**
 * La règle centrale du produit, vérifiée sur le schéma : la planification porte
 * sur l'Atom, jamais sur `Variant`.
 */
function verifierQueLaVarianteNePlanifiePas(): void {
  const schema = readFileSync("prisma/schema/learning.prisma", "utf8");
  const modele = schema.slice(schema.indexOf("model Variant"));
  const corps = modele.slice(0, modele.indexOf("\n}"));

  const interdits = [
    "due",
    "stability",
    "difficulty",
    "elapsedDays",
    "scheduledDays",
    "lapses",
    "fsrsState",
    "lastReview",
  ];
  const trouves = interdits.filter((champ) => new RegExp(`^\\s+${champ}\\s`, "m").test(corps));

  noter(
    "Architecture — aucune variante ne porte d'intervalle, de difficulté ni d'échéance",
    trouves.length === 0,
    trouves.length === 0
      ? "Variant ne planifie rien"
      : `champs de planification : ${trouves.join(", ")}`,
  );
}

/** Tous les `actions.ts` de l'arborescence des routes. */
function fichiersDActions(dossier: string): string[] {
  return readdirSync(dossier, { withFileTypes: true }).flatMap((entree) => {
    const chemin = join(dossier, entree.name);

    if (entree.isDirectory()) return fichiersDActions(chemin);

    return entree.name === "actions.ts" ? [chemin] : [];
  });
}

/**
 * Un fichier `"use server"` n'exporte que des fonctions async. Règle de Next que
 * ni TypeScript ni ESLint ne voient, et qui ne casse qu'au build ; le piège
 * typique est une constante partagée avec le formulaire. Les `export type`,
 * effacés à la compilation, ne comptent pas.
 */
function verifierQueLesActionsNExportentQueDesFonctions(): void {
  const fautifs: string[] = [];

  for (const fichier of fichiersDActions("app")) {
    const source = readFileSync(fichier, "utf8");

    if (!source.includes('"use server"')) continue;

    const exports = source.match(/^export (?!async function |type )\S+/gm) ?? [];

    if (exports.length > 0) fautifs.push(`${fichier} (${exports.length})`);
  }

  noter(
    "Architecture — les fichiers d'actions n'exportent que des fonctions async",
    fautifs.length === 0,
    fautifs.length === 0 ? "aucun export de valeur" : fautifs.join(", "),
  );
}

async function main(): Promise<void> {
  process.env.AI_ENABLED = "true";
  process.env.MOCK_AI = "true";

  const { prisma } = await import("@/lib/db/client");
  const session = await import("./cases/session-revision");
  const signaux = await import("./cases/session-signaux");
  const fuseaux = await import("./cases/session-fuseaux");
  const entrainement = await import("./cases/entrainement-etanche");
  const usure = await import("./cases/regeneration-usee");
  const phase4 = await import("./cases/progression-et-signalement");
  const administration = await import("./cases/administration");
  const reglages = await import("./cases/reglages");
  const compte = await import("./cases/compte-efface");

  const comptes = [IDENTIFIANT, ENTRAINEMENT, "verification-effacement"];

  await prisma.aiCall.deleteMany({ where: { userId: { in: comptes } } });
  await prisma.user.deleteMany({ where: { id: { in: comptes } } });

  const creerCompte = (id: string, nom: string) =>
    prisma.user.create({
      data: {
        id,
        email: `${id}@cairn.test`,
        name: nom,
        emailVerified: true,
        settings: { create: { timezone: "Europe/Paris" } },
      },
      select: { id: true },
    });

  const utilisateur = await creerCompte(IDENTIFIANT, "Vérification session");
  const entraine = await creerCompte(ENTRAINEMENT, "Vérification entraînement");

  // Un instant fixe : la vérification ne dépend pas de l'heure du lancement.
  const maintenant = new Date("2026-06-15T12:00:00Z");

  try {
    verifierQueLaVarianteNePlanifiePas();
    verifierQueLesActionsNExportentQueDesFonctions();

    await fuseaux.casDeuxFuseaux(utilisateur.id);
    await session.casSessionComplete(utilisateur.id, maintenant);
    await session.casSessionInterrompue(utilisateur.id, maintenant);
    await session.casRotationDesFacettes(utilisateur.id, maintenant);
    await signaux.casSignalDeMaitrise(utilisateur.id, maintenant);
    await signaux.casArchivageDeclare(utilisateur.id, maintenant);
    await entrainement.casEntrainementEtanche(entraine.id, maintenant);
    await usure.casRegenerationParUsure(entraine.id, maintenant);

    await phase4.casProgressionComptee(utilisateur.id, maintenant);
    await phase4.casSerieAutourDeMinuit(utilisateur.id);
    await phase4.casSignalementTrace(utilisateur.id);
    phase4.casAdministrationFermee();

    // L'écran d'administration lit du SQL écrit à la main : il ne casse qu'à
    // l'exécution, et sur un écran qu'on ouvre rarement.
    await administration.casChiffresLisibles(maintenant);
    await administration.casJoursVidesMontres(maintenant);
    await administration.casMoyenneCalculee(utilisateur.id, maintenant);

    // Les réglages en base l'emportent sur l'environnement : un reste oublié
    // ferait dépenser un poste de développement.
    await reglages.casSurchargeEtRetour();
    await reglages.casValeurAbsurdeRefusee();
    await reglages.casSurchargeRattrapeLEnvironnement();
    await reglages.casJournalTrace();
    await reglages.casAucunResteEnBase();

    // En dernier, et sur son propre compte : le cas efface ce qu'il éprouve.
    const aEffacer = await creerCompte("verification-effacement", "Vérification effacement");
    await compte.casExportComplet(aEffacer.id, "Europe/Paris");
    await compte.casSuppressionComplete(aEffacer.id, "Europe/Paris");

    const appels = await prisma.aiCall.count({ where: { userId: { in: comptes } } });
    noter(
      "Le moteur de révision n'appelle jamais le modèle",
      appels === 0,
      `${appels} appel(s) au registre`,
    );

    noterLesTentativesReseau(tentativesReseau);
  } finally {
    await prisma.aiCall.deleteMany({ where: { userId: { in: comptes } } });
    await prisma.user.deleteMany({ where: { id: { in: comptes } } });

    // Le signalement du cas de suppression survit au compte, c'est ce que le
    // cas démontre : sans ce balayage, chaque exécution en laisserait un.
    await prisma.signalement.deleteMany({ where: { concept: compte.CONCEPT_EFFACE } });
  }
}

main()
  .then(() => conclure("Moteur de révision vérifié de bout en bout."))
  .catch((error: unknown) => {
    console.error("La vérification a échoué.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const { prisma } = await import("@/lib/db/client");
    await prisma.$disconnect();
  });
