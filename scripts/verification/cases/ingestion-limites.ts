import { prisma } from "@/lib/db/client";
import { estEnListeDattente, inscrireEnListeDattente } from "@/lib/db/liste-dattente";
import { compterConceptsRetenus } from "@/lib/db/comptage-de-la-periode";
import { PLAFOND_GRATUIT, plafondDeDepots } from "@/lib/domain/plafond-du-plan";
import { deposer, type ResultatDepot } from "@/lib/depots/deposer";
import { formulaire, repartirDeZero, vieillirLesDepots } from "./depot-simule";
import { noter } from "./journal";

/** Le compte de vérification est gratuit. */
const DEPOTS_DUN_COMPTE_GRATUIT = plafondDeDepots(PLAFOND_GRATUIT);

/**
 * Ce qui borne le dépôt : l'envoi répété, le débit, le quota de la période.
 *
 * Pour atteindre le quota sans attendre entre deux dépôts, `vieillirLesDepots`
 * recule la fenêtre de débit : c'est le seul artifice, il ne touche qu'aux
 * horodatages.
 */

const TEXTE = "Une note courte, déposée pour éprouver les limites du compteur.";

async function deposerTexte(userId: string, cle: string): Promise<ResultatDepot> {
  return deposer(userId, formulaire({ texte: TEXTE, cleEnvoi: cle }));
}

export async function casDoubleEnvoi(userId: string): Promise<void> {
  await repartirDeZero(userId);

  const premier = await deposerTexte(userId, "verif-double-01");
  const second = await deposerTexte(userId, "verif-double-01");
  const ecrits = await prisma.input.count({ where: { userId, submissionKey: "verif-double-01" } });
  const consommes = await prisma.monthlyUsage.findFirst({ where: { userId } });

  noter(
    "Double envoi — le même geste n'écrit qu'un dépôt",
    premier.ok && second.ok && premier.inputId === second.inputId && ecrits === 1,
    `${ecrits} dépôt(s) écrit(s)`,
  );

  noter(
    "Double envoi — la place prise à tort est rendue",
    (consommes?.deposits ?? 0) === 1,
    `${consommes?.deposits ?? 0} place(s) consommée(s)`,
  );
}

export async function casDebitEtQuota(userId: string): Promise<void> {
  await repartirDeZero(userId);

  for (let numero = 1; numero <= 3; numero += 1) {
    const resultat = await deposerTexte(userId, `verif-debit-0${numero}`);

    if (!resultat.ok) throw new Error(`Le dépôt ${numero} aurait dû passer : ${resultat.motif}`);
  }

  const quatrieme = await deposerTexte(userId, "verif-debit-04");
  noter(
    "Débit — quatre dépôts coup sur coup, le quatrième attend",
    !quatrieme.ok && quatrieme.quota !== true,
    quatrieme.ok ? "accepté" : quatrieme.motif,
  );

  await vieillirLesDepots(userId);

  // Le quota porte sur les concepts, et l'extraction n'a pas lieu ici : on
  // remplit le compteur comme le découpage, à une place près.
  await compterConceptsRetenus(userId, "Europe/Paris", PLAFOND_GRATUIT - 1);

  const dernier = await deposerTexte(userId, "verif-quota-limite");
  noter(
    "Quota — il reste une place tant qu'un concept manque au plafond",
    dernier.ok,
    dernier.ok ? "accepté" : dernier.motif,
  );

  await vieillirLesDepots(userId);
  await compterConceptsRetenus(userId, "Europe/Paris", 1);

  const surnumeraire = await deposerTexte(userId, "verif-quota-plein");
  noter(
    `Quota — le dépôt qui suit les ${PLAFOND_GRATUIT} concepts est refusé, et se sait refusé`,
    !surnumeraire.ok && surnumeraire.quota === true,
    surnumeraire.ok ? "accepté" : surnumeraire.motif,
  );

  const consommes = await prisma.monthlyUsage.findFirst({ where: { userId } });
  noter(
    "Quota — un refus n'entame ni les concepts ni les dépôts de la période",
    (consommes?.concepts ?? 0) === PLAFOND_GRATUIT && (consommes?.deposits ?? 0) === 4,
    `${consommes?.concepts ?? 0} concept(s) sur ${PLAFOND_GRATUIT}, ${consommes?.deposits ?? 0} dépôt(s)`,
  );
}

/** Le second rideau : des dépôts d'une ligne paient quand même leur extraction. */
export async function casPlafondDeDepots(userId: string): Promise<void> {
  await repartirDeZero(userId);

  for (let numero = 1; numero <= DEPOTS_DUN_COMPTE_GRATUIT; numero += 1) {
    const resultat = await deposerTexte(userId, `verif-depots-${numero}`);

    if (!resultat.ok) throw new Error(`Le dépôt ${numero} aurait dû passer : ${resultat.motif}`);
    await vieillirLesDepots(userId);
  }

  const surnumeraire = await deposerTexte(userId, "verif-depots-trop");
  const consommes = await prisma.monthlyUsage.findFirst({ where: { userId } });

  noter(
    `Quota — le dépôt ${DEPOTS_DUN_COMPTE_GRATUIT + 1} est refusé même sans un seul concept retenu`,
    !surnumeraire.ok && surnumeraire.quota === true && (consommes?.concepts ?? 0) === 0,
    surnumeraire.ok ? "accepté" : surnumeraire.motif,
  );
}

export async function casListeDattente(userId: string): Promise<void> {
  await inscrireEnListeDattente(userId, "quota");
  const inscrit = await estEnListeDattente(userId);

  await inscrireEnListeDattente(userId, "quota");
  const inscriptions = await prisma.waitlistEntry.count({ where: { userId } });

  noter(
    "Liste d'attente — s'inscrire deux fois ne crée qu'une entrée",
    inscrit && inscriptions === 1,
    `${inscriptions} inscription(s)`,
  );
}
