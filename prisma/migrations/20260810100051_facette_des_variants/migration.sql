-- CreateEnum
CREATE TYPE "VariantFacet" AS ENUM ('RECOGNITION', 'MECHANISM', 'BOUNDARY', 'APPLICATION');

-- AlterTable
-- Les Variants déjà écrits sont antérieurs à la facette. Le défaut n'existe que
-- le temps de la reprise : on les répartit dans l'ordre de création au sein de
-- leur Atom, puis on le retire. Passé cette migration, la facette est toujours
-- écrite explicitement.
ALTER TABLE "Variant" ADD COLUMN "facet" "VariantFacet" NOT NULL DEFAULT 'RECOGNITION';

UPDATE "Variant" AS v
SET "facet" = rang.facette
FROM (
  SELECT
    id,
    (ARRAY['RECOGNITION', 'MECHANISM', 'BOUNDARY', 'APPLICATION']::"VariantFacet"[])[
      LEAST(ROW_NUMBER() OVER (PARTITION BY "atomId" ORDER BY "createdAt", id), 4)::int
    ] AS facette
  FROM "Variant"
) AS rang
WHERE v.id = rang.id;

ALTER TABLE "Variant" ALTER COLUMN "facet" DROP DEFAULT;
