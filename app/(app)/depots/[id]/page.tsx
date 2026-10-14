import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Panneau } from "@/components/coquille/panneau";
import { PileDePanneaux } from "@/components/coquille/pile-de-panneaux";
import { Strates } from "@/components/coquille/strates";
import { ConceptCorrigeable } from "@/components/depots/concept-corrigeable";
import { EntreeDansLaSerie } from "@/components/depots/entree-dans-la-serie";
import { ANCRE_A_VERIFIER, ConceptsAVerifier } from "@/components/depots/concepts-a-verifier";
import { GestesDuDepot } from "@/components/depots/gestes-du-depot";
import { SuivreLAvancement } from "@/components/depots/suivre-lavancement";
import { PointDeTravail } from "@/components/depots/point-de-travail";
import { VideDuDepot } from "@/components/depots/vide-du-depot";
import { Badge } from "@/components/ui/badge";
import { TexteRiche } from "@/components/typographie/texte-riche";
import { ROUTES } from "@/lib/auth/routes";
import { getCurrentUser } from "@/lib/auth/session";
import { lireDepotDetaille } from "@/lib/db/depot-detaille";
import { lireChargeDuJour } from "@/lib/db/session-du-jour";
import { lireFuseauUtilisateur } from "@/lib/db/user-settings";
import { anciennete } from "@/lib/domain/echeance";
import { etatDuDepot, redecoupable, travailEnCours } from "@/lib/domain/etat-depot";
import { PLAFOND_CONCEPTS_PAR_DEPOT } from "@/lib/domain/plafond-de-concepts";
import { CARACTERES_MAXIMUM } from "@/lib/depots/bornes-du-depot";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("depots.depot");

  return { title: t("metaTitre") };
}

/**
 * Un dépôt et ce qu'il a donné.
 *
 * Trois fins sans concept sont distinguées — rejeté faute de matière, arrêté
 * par une panne, vidé par son auteur — parce qu'elles n'appellent pas la même
 * conduite.
 */
export default async function PageDepot({ params }: { params: Promise<{ id: string }> }) {
  const tEtat = await getTranslations("etatDepot");
  const tTemps = await getTranslations("temps");
  const t = await getTranslations("depots.depot");
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
  // Lu seulement une fois la chaîne finie : c'est le seul état où le compte de
  // la journée tient compte de ce dépôt.
  const duJour = etat === "pret" ? await lireChargeDuJour(utilisateur.id) : null;
  const depose = depot.rawContent.trim() || depot.extractedText || "";
  /*
    On montre ce sur quoi on sera questionné : quand la consigne écarte une
    partie du dépôt, seule la partie retenue s'affiche, avec une mention dessous.
    `rawContent` reste intact et c'est lui qui repartirait au modèle. Voir
    `lib/domain/texte-retenu.ts`.
  */
  const texte = depot.texteRetenu ?? depose;
  // Les concepts que le modèle a marqués douteux, dans l'ordre de la liste :
  // c'est le premier qui porte l'ancre, et c'est vers lui que le chapeau mène.
  const aVerifier = depot.concepts.filter((concept) => concept.uncertain);

  return (
    <PileDePanneaux sol="ombre">
      <Panneau surface="papier" mesure="colonne">
        {/* Le chapeau se centre sur mobile ; le texte et les concepts, lecture
            au long, restent au fer à gauche sur tous les écrans. */}
        <div className="text-center md:text-left">
          <Link
            href={ROUTES.depots}
            className="text-petit rounded-galet text-stone-500 underline decoration-stone-300 underline-offset-4 transition-colors hover:text-stone-900"
          >
            {t("retour")}
          </Link>

          <h1 className="mt-pas-3 text-h1-app leading-tight font-bold">
            {t("titre", { nombre: depot.concepts.length })}
          </h1>

          <p className="mt-pas-2 gap-pas-3 text-mono flex flex-wrap items-center justify-center text-stone-500 md:justify-start">
            {etat === "pret" ? null : (
              // Seule une panne prend la couleur d'alerte : un dépôt sans
              // matière n'a rien cassé.
              <Badge variant={etat === "echec" ? "alerte" : "pose"}>
                {/* Le point dit que ça tourne là où le libellé, seul, ne dit que
                    l'étape — voir `PointDeTravail`. */}
                {travailEnCours(etat) ? <PointDeTravail /> : null}
                {tEtat(etat)}
              </Badge>
            )}
            <span>
              {t("depose", {
                quand: tTemps("anciennete", anciennete(depot.createdAt, new Date(), fuseau)),
              })}
            </span>
          </p>

          <ConceptsAVerifier nombre={aVerifier.length} />

          {/* Monté seulement quand un travail tourne : ailleurs, l'interrogation
              bouclerait sur une page qui ne bougera plus. Une demande qui
              attend sa date n'en est pas un — voir `travailEnCours`. */}
          {travailEnCours(etat) ? (
            <SuivreLAvancement inputId={depot.id} etat={etat} concepts={depot.concepts.length} />
          ) : null}

          {/* Seulement quand la chaîne a fini : avant, on compterait des
              concepts qui n'ont pas encore leurs questions. */}
          {duJour ? <EntreeDansLaSerie charge={duJour.charge} /> : null}
        </div>

        {texte ? (
          <section className="mt-pas-8">
            <h2 className="text-mono font-mono tracking-[0.14em] text-stone-500 uppercase">
              {t("ceQueTuAsDepose")}
            </h2>
            {/* `TexteRiche` et non `whitespace-pre-wrap` : celui-ci garderait les
                retours à la ligne d'un éditeur qui enroule, et ignorerait les
                barrières de code. Les termes entre accents graves sont relevés
                comme dans les concepts ; on ne devine pas le code. */}
            <div className="mt-pas-3 p-pas-4 text-petit rounded-carte bg-surface-ombre text-stone-700">
              <TexteRiche>{texte}</TexteRiche>
            </div>
            {depot.texteRetenu ? (
              <p className="mt-pas-2 text-petit text-stone-500">{t("consigneEcartait")}</p>
            ) : null}

            {depot.texteTronque ? (
              <p className="mt-pas-2 text-petit text-stone-500">
                {t("captureTronquee", { maximum: CARACTERES_MAXIMUM })}
              </p>
            ) : null}

            {/* La consigne se lit sous le dépôt et sans titre : un titre en
                ferait une troisième section de même poids que les deux vraies. */}
            {depot.instruction ? (
              <p className="mt-pas-3 text-petit text-stone-500">
                {t("taConsigne", { consigne: depot.instruction })}
              </p>
            ) : null}
          </section>
        ) : null}
      </Panneau>

      <Strates de="papier" vers="ombre" graine="depot-concepts" />

      <Panneau surface="ombre" mesure="colonne" remplit className="md:pb-pas-16">
        <h2 className="text-mono font-mono tracking-[0.14em] text-stone-500 uppercase">
          {t("ceQuOnEnATire")}
        </h2>

        {depot.conceptsTronques ? (
          /*
            Les concepts sortent dans l'ordre du texte, pas par importance : la
            coupe emporte la fin. Le message ne prétend donc pas garder « les plus
            importants » ; il dit où la lecture s'est arrêtée, ce que montre le
            dernier concept de la liste. La borne est la nôtre : pas de reproche
            sur la longueur.
          */
          <p className="mt-pas-2 text-petit text-stone-500">
            {t("conceptsTronques", { plafond: PLAFOND_CONCEPTS_PAR_DEPOT })}
          </p>
        ) : null}

        {depot.concepts.length === 0 ? (
          <div className="mt-pas-2">
            <VideDuDepot etat={etat} motif={depot.failureReason} graine={depot.id} />
          </div>
        ) : (
          <ul className="mt-pas-4 gap-pas-2 flex flex-col">
            {depot.concepts.map((concept) => (
              <ConceptCorrigeable
                key={concept.id}
                concept={concept}
                inputId={depot.id}
                ancre={concept.id === aVerifier[0]?.id ? ANCRE_A_VERIFIER : undefined}
              />
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
