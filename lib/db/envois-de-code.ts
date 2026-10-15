import { createHash } from "node:crypto";
import { prisma } from "@/lib/db/client";

/**
 * La limite des codes de connexion par adresse destinataire. Même mécanisme que
 * `limite-de-gestes.ts` : la fenêtre vit sur la ligne verrouillée par
 * l'upsert, pour que compter et refuser tiennent dans une seule instruction.
 */

/** Une heure, et cinq codes : de quoi se tromper d'onglet, pas de quoi inonder une boîte. */
export const FENETRE_CODES_SECONDES = 60 * 60;
export const CODES_PAR_FENETRE = 5;

/** L'empreinte de l'adresse, normalisée comme better-auth la compare. */
function cleDeLAdresse(adresse: string): string {
  return createHash("sha256").update(adresse.trim().toLowerCase()).digest("hex");
}

/** Prend une place pour un code envoyé à cette adresse, ou la refuse. */
export async function prendreUnEnvoiDeCode(adresse: string): Promise<boolean> {
  const lignes = await prisma.$queryRaw<{ nombre: number }[]>`
    INSERT INTO "EnvoisDeCode" ("cle", "debutDeFenetre", "nombre")
    VALUES (${cleDeLAdresse(adresse)}, now(), 1)
    ON CONFLICT ("cle") DO UPDATE
      SET "debutDeFenetre" = CASE
            WHEN "EnvoisDeCode"."debutDeFenetre"
                 < now() - make_interval(secs => ${FENETRE_CODES_SECONDES}::double precision)
            THEN now() ELSE "EnvoisDeCode"."debutDeFenetre" END,
          "nombre" = CASE
            WHEN "EnvoisDeCode"."debutDeFenetre"
                 < now() - make_interval(secs => ${FENETRE_CODES_SECONDES}::double precision)
            THEN 1 ELSE "EnvoisDeCode"."nombre" + 1 END
      WHERE "EnvoisDeCode"."debutDeFenetre"
              < now() - make_interval(secs => ${FENETRE_CODES_SECONDES}::double precision)
        OR "EnvoisDeCode"."nombre" < ${CODES_PAR_FENETRE}
    RETURNING "nombre"
  `;

  return lignes.length > 0;
}

/** Efface les fenêtres closes : passée l'heure, une ligne ne sert plus à rien. */
export async function oublierLesEnvoisDeCodeClos(maintenant: Date = new Date()): Promise<number> {
  const limite = new Date(maintenant.getTime() - FENETRE_CODES_SECONDES * 1000);
  const { count } = await prisma.envoisDeCode.deleteMany({
    where: { debutDeFenetre: { lt: limite } },
  });

  return count;
}
