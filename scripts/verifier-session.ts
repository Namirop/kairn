import "dotenv/config";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { conclure, record } from "./verification/journal";
import { versUnFournisseurDeModele } from "./verification/hotes-des-fournisseurs";

/**
 * Preuve, à l'exécution, que le moteur de révision tient : une session se joue
 * du premier passage au dernier, la rotation ne se répète pas, l'archivage
 * repousse au lieu de supprimer, et le signal de maîtrise ne se lève que sur
 * une série qui accélère.
 *
 * Les passages sont écrits par le chemin réel — lecture de session, puis
 * `enregistrerRevision`. Aucun appel modèle n'est nécessaire : le moteur ne
 * dépend pas du modèle, et c'est justement ce que cette phase doit démontrer.
 *
 *   npm run verifier:session
 */

const tentativesReseau: string[] = [];
const vraiFetch = globalThis.fetch;

globalThis.fetch = function fetchPiege(input: RequestInfo | URL, init?: RequestInit) {
  const url = typeof input === "string" ? input : input.toString();

  if (!versUnFournisseurDeModele(url)) return vraiFetch(input, init);

  tentativesReseau.push(url);
  return Promise.reject(new Error(`Requête sortante interdite pendant la vérification : ${url}`));
};

const IDENTIFIANT = "verification-session";

/**
 * L'entraînement tire dans tous les concepts du compte, sans regarder aucune
 * échéance. Il lui faut donc son propre compte : sur celui des autres cas, il
 * piocherait dans les concepts qu'ils viennent d'écrire et on ne saurait plus
 * ce qu'on mesure.
 */
const ENTRAINEMENT = "verification-entrainement";

/**
 * La règle centrale du produit, vérifiée sur le schéma lui-même.
 *
 * Un intervalle, une difficulté ou une échéance posés sur `Variant` seraient un
 * bug d'architecture, pas un raccourci : la planification porte sur l'Atom. Une
 * relecture attentive laisse passer ce genre de champ ; une assertion non.
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

  record(
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
 * Un fichier `"use server"` n'exporte que des fonctions async.
 *
 * Ni TypeScript ni ESLint ne connaissent cette règle : elle appartient à Next, et
 * elle ne se manifeste qu'au moment où le module est atteint depuis un composant
 * client — donc à la compilation, souvent longtemps après l'avoir écrite. Une
 * constante partagée entre l'action et son formulaire est la façon la plus
 * naturelle de tomber dedans, et c'est exactement ce qui est arrivé.
 *
 * Les `export type` sont effacés à la compilation et ne comptent pas.
 */
function verifierQueLesActionsNExportentQueDesFonctions(): void {
  const fautifs: string[] = [];

  for (const fichier of fichiersDActions("app")) {
    const source = readFileSync(fichier, "utf8");

    if (!source.includes('"use server"')) continue;

    const exports = source.match(/^export (?!async function |type )\S+/gm) ?? [];

    if (exports.length > 0) fautifs.push(`${fichier} (${exports.length})`);
  }

  record(
    "Architecture — les fichiers d'actions n'exportent que des fonctions async",
    fautifs.length === 0,
    fautifs.length === 0 ? "aucun export de valeur" : fautifs.join(", "),
  );
}

async function main(): Promise<void> {
  process.env.AI_ENABLED = "true";
  process.env.MOCK_AI = "true";

  const { prisma } = await import("@/lib/db/client");
  const session = await import("./verification/session-revision");
  const signaux = await import("./verification/session-signaux");
  const fuseaux = await import("./verification/session-fuseaux");
  const entrainement = await import("./verification/entrainement-etanche");
  const usure = await import("./verification/regeneration-usee");
  const phase4 = await import("./verification/progression-et-signalement");
  const administration = await import("./verification/administration");
  const reglages = await import("./verification/reglages");
  const compte = await import("./verification/compte-efface");

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

  // Un instant fixe : la vérification ne doit pas dépendre de l'heure qu'il est
  // quand on la lance.
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

    // Les réglages posés l'emportent sur l'environnement : un oubli en base ne
    // salirait pas un test, il ferait dépenser un poste de développement.
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
    record(
      "Le moteur de révision n'appelle jamais le modèle",
      appels === 0,
      `${appels} appel(s) au registre`,
    );

    record(
      "Aucune requête n'est sortie vers l'API",
      tentativesReseau.length === 0,
      tentativesReseau.length === 0 ? "zéro tentative" : tentativesReseau.join(", "),
    );
  } finally {
    await prisma.aiCall.deleteMany({ where: { userId: { in: comptes } } });
    await prisma.user.deleteMany({ where: { id: { in: comptes } } });

    // Le signalement du cas de suppression survit au compte — c'est ce que le
    // cas démontre —, donc il survit aussi à la vérification. Sans ce balayage,
    // chaque exécution en laisse un de plus, détaché, et l'écran interne finit
    // par compter des signalements qui ne viennent de personne.
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
