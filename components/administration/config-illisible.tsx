// i18n-ignore-fichier — outil de l'administrateur, qui reste en français par décision du 08/10/2026.
import Link from "next/link";
import { ROUTES } from "@/lib/auth/routes";

/** Le motif tel quel : variable et valeur reçue, qu'une reformulation perdrait. */
export function ConfigIllisible({ motif }: { motif: string }) {
  return (
    <section aria-labelledby="config-illisible" className="px-pas-4 py-pas-4 bg-alerte-surface">
      <h2 id="config-illisible" className="text-corps text-alerte font-semibold">
        La configuration du modèle ne se lit pas
      </h2>

      <p className="mt-pas-2 text-petit font-mono break-words text-stone-800">{motif}</p>

      <p className="mt-pas-3 text-petit max-w-prose text-stone-800">
        Tant qu&apos;elle est dans cet état, tout appel au modèle échoue, l&apos;ingestion comprise.
        Poser la valeur rattrape le prochain appel, sans redéploiement. La variable
        d&apos;environnement reste à corriger chez l&apos;hébergeur, pour que le défaut redevienne
        juste une fois le réglage retiré.
      </p>

      <p className="mt-pas-2 text-petit">
        <Link href={ROUTES.adminPilotage} className="text-stone-900 underline underline-offset-4">
          Poser la valeur dans Pilotage
        </Link>{" "}
        <span className="text-stone-500">
          — l&apos;écran montre aussi ce que le serveur reçoit aujourd&apos;hui.
        </span>
      </p>
    </section>
  );
}
