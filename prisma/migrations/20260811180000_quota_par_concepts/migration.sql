-- Le quota du jour porte sur les concepts retenus, pas sur les dépôts déposés :
-- c'est le concept qui coûte, et c'est la bonne unité pour l'utilisateur.

-- AlterTable
ALTER TABLE "DailyUsage" ADD COLUMN "concepts" INTEGER NOT NULL DEFAULT 0;
