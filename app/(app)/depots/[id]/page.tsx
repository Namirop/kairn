import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Panneau } from "@/components/coquille/panneau";
import { PileDePanneaux } from "@/components/coquille/pile-de-panneaux";
import { Strates } from "@/components/coquille/strates";
import { ConceptCorrigeable } from "@/components/depots/concept-corrigeable";
import { GestesDuDepot } from "@/components/depots/gestes-du-depot";
import { VideDuDepot } from "@/components/depots/vide-du-depot";
import { Badge } from "@/components/ui/badge";
import { TexteTechnique } from "@/components/typographie/texte-technique";
import { ROUTES } from "@/lib/auth/routes";
import { getCurrentUser } from "@/lib/auth/session";
import { lireDepotDetaille } from "@/lib/db/depot-detaille";
import { lireFuseauUtilisateur } from "@/lib/db/user-settings";
import { compte } from "@/lib/domain/accord";
import { anciennete } from "@/lib/domain/echeance";
import { etatDuDepot, libelleEtat, redecoupable } from "@/lib/domain/etat-depot";
import { PLAFOND_CONCEPTS_PAR_DEPOT } from "@/lib/domain/plafond-de-concepts";
import { CARACTERES_MAXIMUM } from "@/lib/depots/bornes-du-depot";

export const metadata: Metadata = { title: "Dépôt" };

/**
 * Un dépôt et ce qu'il a donné.
 *
 * L'écran distingue trois fins sans concept, là où il n'en montrait qu'une :
 * rejeté faute de matière, arrêté par une panne, ou vidé par son auteur. Elles
 * n'appellent pas la même conduite — c'est tout l'intérêt de les séparer.
 */
export default async function PageDepot({ params }: { params: Promise<{ id: string }> }) {
  const utilisateur = await getCurrentUser();

  if (!utilisateur) redirect(ROUTES.connexion);

  const { id } = await params;
  const depot = await lireDepotDetaille(id, utilisateur.id);

  if (!depot) notFound();

  const fuseau = await lireFuseauUtilisateur(utilisateur.id);
  const etat = etatDuDepot({
    status: depot.status,
    travaux: depot.travauxEnCours,
    concepts: depot.concepts.length,
  });
  const texte = depot.rawContent.trim() || depot.extractedText || "";

  return (
    <PileDePanneaux sol="ombre">
      <Panneau surface="papier" mesure="colonne">
        <Link
          href={ROUTES.depots}
          className="text-petit rounded-galet text-stone-500 underline decoration-stone-300 underline-offset-4 transition-colors hover:text-stone-900"
        >
          Retour aux dépôts
        </Link>

        <h1 className="mt-pas-3 text-h1-app leading-tight font-bold">
          {compte(depot.concepts.length, "concept", "concepts")}
        </h1>

        <p className="mt-pas-2 gap-pas-3 text-mono flex flex-wrap items-center text-stone-500">
          {etat === "pret" ? null : (
            // Une panne est la seule chose qui mérite la couleur d'alerte. Un
            // dépôt sans matière n'a rien cassé, et le peindre en rouge
            // annonçait une avarie du produit à qui avait collé une URL nue.
            <Badge variant={etat === "echec" ? "alerte" : "pose"}>{libelleEtat(etat)}</Badge>
          )}
          <span>Déposé {anciennete(depot.createdAt, new Date(), fuseau)}</span>
        </p>

        {texte ? (
          <section className="mt-pas-8">
            <h2 className="text-mono font-mono tracking-[0.14em] text-stone-500 uppercase">
              Ce que tu as déposé
            </h2>
            {/* Les termes de code du dépôt sont relevés comme ceux des concepts
                qu'on en a tirés : c'est le même texte, à deux étapes de la même
                chaîne, et les voir traités autrement laissait croire que le
                produit avait ajouté quelque chose. La convention est celle de qui
                colle une doc, pas une devinette — un terme sans accents graves
                reste du texte, on ne cherche pas à reconnaître du code. */}
            <p className="mt-pas-3 p-pas-4 text-petit rounded-carte bg-surface-ombre whitespace-pre-wrap text-stone-700">
              <TexteTechnique>{texte}</TexteTechnique>
            </p>
            {depot.texteTronque ? (
              <p className="mt-pas-2 text-petit text-stone-500">
                La capture portait plus de texte qu&apos;un dépôt n&apos;en accepte. La lecture
                s&apos;arrête à {CARACTERES_MAXIMUM.toLocaleString("fr-FR")} caractères.
              </p>
            ) : null}
          </section>
        ) : null}
      </Panneau>

      <Strates de="papier" vers="ombre" graine="depot-concepts" />

      <Panneau surface="ombre" mesure="colonne" remplit className="md:pb-pas-16">
        <h2 className="text-mono font-mono tracking-[0.14em] text-stone-500 uppercase">
          Ce qu&apos;on en a tiré
        </h2>

        {depot.conceptsTronques ? (
          // La borne est la nôtre : le message dit ce qui s'est passé et ouvre
          // une porte, sans conseiller de déposer moins ni reprocher la longueur.
          <p className="mt-pas-2 text-petit text-stone-500">
            Ce texte en portait plus. On a gardé les {PLAFOND_CONCEPTS_PAR_DEPOT} plus importants —
            dépose la suite si tu veux le reste.
          </p>
        ) : null}

        {depot.concepts.length === 0 ? (
          <div className="mt-pas-2">
            <VideDuDepot etat={etat} motif={depot.failureReason} graine={depot.id} />
          </div>
        ) : (
          <ul className="mt-pas-4 gap-pas-2 flex flex-col">
            {depot.concepts.map((concept) => (
              <ConceptCorrigeable key={concept.id} concept={concept} inputId={depot.id} />
            ))}
          </ul>
        )}

        <GestesDuDepot
          inputId={depot.id}
          redecoupable={redecoupable(etat)}
          concepts={depot.concepts.length}
        />
      </Panneau>
    </PileDePanneaux>
  );
}
