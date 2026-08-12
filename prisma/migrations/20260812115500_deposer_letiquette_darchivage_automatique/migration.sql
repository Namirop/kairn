-- Les concepts que le produit avait archivés tout seuls reprennent leur état.
--
-- L'archivage par intervalle a disparu de `etatApresRevision` : au-delà de
-- trois mois, un concept est CONSOLIDATED, il n'est plus « sorti du cycle ».
-- Les lignes écrites sous l'ancienne règle porteraient sinon une étiquette que
-- plus aucun code ne sait produire, et qui continuerait de décider — c'est elle
-- qui écartait de l'entraînement précisément ce qu'on sait le mieux.
--
-- Seules les lignes que l'utilisateur n'a pas déclarées sont touchées :
-- `archivedByUser` est ce qui les distingue, et c'est le seul archivage qui
-- reste. REVIEWING est délibérément le choix bas — la régularité se recompte
-- sur l'historique, ce que ce script n'a pas à faire. Le prochain passage
-- rendra l'état exact.
UPDATE "Atom"
SET "state" = 'REVIEWING',
    "archivedAt" = NULL
WHERE "state" = 'ARCHIVED'
  AND "archivedByUser" = false;
