import { prisma } from "@/lib/db/client";
import { reclamerSignalDeMaitrise } from "@/lib/db/carte-de-maitrise";
import {
  confirmerConcept,
  desarchiverConcept,
  modifierConcept,
  supprimerConcept,
} from "@/lib/db/concepts";
import { lireDepotDetaille } from "@/lib/db/depot-detaille";
import { enregistrerEntrainement, lireTourDentrainement } from "@/lib/db/entrainement";
import { supprimerDepot } from "@/lib/db/reprise-depot";
import { enregistrerRevision } from "@/lib/db/revision";
import { lireSessionDuJour } from "@/lib/db/session-du-jour";
import { redecouper } from "@/lib/depots/redecouper";
import { fabriquerConcept, viderLeCompte } from "./abus-fabrique";
import { record } from "./journal";

/**
 * La propriété des ressources : avec le compte A, toucher aux ressources du
 * compte B. Les identifiants passés sont ceux qu'un corps de requête porterait ;
 * le `userId` vient de la session, seule chose qu'un attaquant ne choisit pas.
 */

const JOUR_MS = 24 * 60 * 60 * 1000;

type Tentative = { libelle: string; echoue: () => Promise<boolean> };

export async function casRessourcesDunAutre(
  usurpateur: string,
  victime: string,
  maintenant: Date,
): Promise<void> {
  await viderLeCompte(usurpateur);
  await viderLeCompte(victime);

  const sien = await fabriquerConcept(victime, {
    libelle: "Un concept qui n'est pas le sien",
    due: new Date(maintenant.getTime() - JOUR_MS),
    lastReview: new Date(maintenant.getTime() - 10 * JOUR_MS),
    state: "REVIEWING",
    scheduledDays: 12,
  });
  const archive = await fabriquerConcept(victime, {
    libelle: "Un concept sorti du cycle par son propriétaire",
    state: "ARCHIVED",
    archivedByUser: true,
    archivedAt: maintenant,
    scheduledDays: 95,
  });
  const douteux = await fabriquerConcept(victime, {
    libelle: "Un concept douteux qui attend une décision",
    questions: false,
  });
  await prisma.atom.update({ where: { id: douteux.atomId }, data: { uncertain: true } });

  // Deux concepts du même compte : la variante de l'un envoyée sous l'autre est
  // le cas qu'une vérification de propriété seule laisse passer.
  const premier = await fabriquerConcept(usurpateur, {
    libelle: "Le premier concept de l'usurpateur",
    due: new Date(maintenant.getTime() - JOUR_MS),
  });
  const second = await fabriquerConcept(usurpateur, {
    libelle: "Le second concept de l'usurpateur",
    due: new Date(maintenant.getTime() - JOUR_MS),
  });

  const variante = sien.variantIds[0] ?? "";
  const tentatives: Tentative[] = [
    {
      libelle: "lire le dépôt d'un autre",
      echoue: async () => (await lireDepotDetaille(sien.inputId, usurpateur)) === null,
    },
    {
      libelle: "réécrire le concept d'un autre",
      echoue: async () =>
        !(await modifierConcept(
          sien.atomId,
          usurpateur,
          "Un texte réécrit par quelqu'un d'autre.",
        )),
    },
    {
      libelle: "confirmer le concept douteux d'un autre",
      echoue: async () => !(await confirmerConcept(douteux.atomId, usurpateur)),
    },
    {
      libelle: "supprimer le concept d'un autre",
      echoue: async () => !(await supprimerConcept(sien.atomId, usurpateur)),
    },
    {
      libelle: "remettre en cycle le concept archivé d'un autre",
      echoue: async () => !(await desarchiverConcept(archive.atomId, usurpateur, maintenant)),
    },
    {
      libelle: "supprimer le dépôt d'un autre",
      echoue: async () => !(await supprimerDepot(sien.inputId, usurpateur)),
    },
    {
      libelle: "relancer l'extraction sur le dépôt d'un autre",
      echoue: async () => !(await redecouper(usurpateur, sien.inputId)).ok,
    },
    {
      libelle: "réviser le concept d'un autre",
      echoue: async () =>
        (await enregistrerRevision(
          {
            userId: usurpateur,
            atomId: sien.atomId,
            variantId: variante,
            note: "EASY",
            tempsMs: 1000,
            maitrise: false,
          },
          maintenant,
        )) === null,
    },
    {
      libelle: "s'entraîner sur le concept d'un autre",
      echoue: async () =>
        !(await enregistrerEntrainement(
          {
            userId: usurpateur,
            atomId: sien.atomId,
            variantId: variante,
            note: "EASY",
            tempsMs: 1000,
          },
          maintenant,
        )),
    },
    {
      libelle: "réclamer la carte de maîtrise du concept d'un autre",
      echoue: async () =>
        (await reclamerSignalDeMaitrise(usurpateur, [archive.atomId], maintenant)) === null,
    },
    {
      libelle: "répondre sous l'identifiant d'un de ses concepts avec la question d'un autre",
      echoue: async () =>
        (await enregistrerRevision(
          {
            userId: usurpateur,
            atomId: premier.atomId,
            variantId: second.variantIds[0] ?? "",
            note: "EASY",
            tempsMs: 1000,
            maitrise: false,
          },
          maintenant,
        )) === null,
    },
  ];

  const passees: string[] = [];

  for (const tentative of tentatives) {
    if (!(await tentative.echoue())) passees.push(tentative.libelle);
  }

  record(
    `Propriété — les ${tentatives.length} tentatives du compte A sur le compte B échouent`,
    passees.length === 0,
    passees.length === 0 ? "toutes refusées" : `passées : ${passees.join(" ; ")}`,
  );

  const session = await lireSessionDuJour(usurpateur, maintenant);
  const tour = await lireTourDentrainement(usurpateur);
  const siens = new Set([sien.atomId, archive.atomId, douteux.atomId]);
  const fuites = [...session.questions, ...tour].filter((question) => siens.has(question.atomId));

  record(
    "Propriété — ni la session ni l'entraînement du compte A ne servent les concepts du compte B",
    fuites.length === 0,
    fuites.length === 0 ? "aucune fuite" : `${fuites.length} question(s) d'un autre compte`,
  );

  const restant = await prisma.atom.count({ where: { userId: victime } });
  const passages = await prisma.review.count({ where: { atomId: { in: [...siens] } } });

  record(
    "Propriété — le compte B ressort intact : rien de supprimé, rien d'écrit",
    restant === 3 && passages === 0,
    `${restant} concept(s) sur 3, ${passages} passage(s) écrit(s)`,
  );
}
