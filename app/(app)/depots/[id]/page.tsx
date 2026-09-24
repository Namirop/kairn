import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
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
import { compte } from "@/lib/domain/accord";
import { anciennete } from "@/lib/domain/echeance";
import { etatDuDepot, libelleEtat, redecoupable, travailEnCours } from "@/lib/domain/etat-depot";
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
  // Lu seulement une fois la chaîne finie : c'est le seul état où le compte de
  // la journée tient compte de ce dépôt.
  const duJour = etat === "pret" ? await lireChargeDuJour(utilisateur.id) : null;
  const depose = depot.rawContent.trim() || depot.extractedText || "";
  /*
    Ce qu'on montre, c'est ce sur quoi on sera questionné.

    Une consigne qui écarte une partie du dépôt — « ignore la barre latérale »,
    « garde seulement ce qui concerne la syntaxe » — laissait quand même le
    texte entier à l'écran, juste au-dessus des concepts tirés d'autre chose.
    On y relit un passage dont rien ne sera jamais reposé, en croyant qu'il
    compte.

    Le dépôt, lui, n'a pas bougé d'un caractère : `rawContent` reste ce qui a
    été posé, c'est lui qui repartirait au modèle, et la mention sous la carte
    dit qu'une partie n'est pas montrée. Voir `lib/domain/texte-retenu.ts` pour
    ce que la vue a dû prouver pour être gardée.
  */
  const texte = depot.texteRetenu ?? depose;
  // Les concepts que le modèle a marqués douteux, dans l'ordre de la liste :
  // c'est le premier qui porte l'ancre, et c'est vers lui que le chapeau mène.
  const aVerifier = depot.concepts.filter((concept) => concept.uncertain);

  return (
    <PileDePanneaux sol="ombre">
      <Panneau surface="papier" mesure="colonne">
        {/* Le chapeau se centre sur une colonne, comme celui des deux autres
            écrans du produit. En dessous, le texte déposé et les concepts sont
            de la lecture au long : eux restent au fer à gauche, sur tous les
            écrans, et c'est ce qui distingue une ouverture d'un contenu. */}
        <div className="text-center md:text-left">
          <Link
            href={ROUTES.depots}
            className="text-petit rounded-galet text-stone-500 underline decoration-stone-300 underline-offset-4 transition-colors hover:text-stone-900"
          >
            Retour aux dépôts
          </Link>

          <h1 className="mt-pas-3 text-h1-app leading-tight font-bold">
            {compte(depot.concepts.length, "concept", "concepts")}
          </h1>

          <p className="mt-pas-2 gap-pas-3 text-mono flex flex-wrap items-center justify-center text-stone-500 md:justify-start">
            {etat === "pret" ? null : (
              // Une panne est la seule chose qui mérite la couleur d'alerte. Un
              // dépôt sans matière n'a rien cassé, et le peindre en rouge
              // annonçait une avarie du produit à qui avait collé une URL nue.
              <Badge variant={etat === "echec" ? "alerte" : "pose"}>
                {/* Le point dit que ça tourne là où le libellé, seul, ne dit que
                    l'étape — voir `PointDeTravail`. */}
                {travailEnCours(etat) ? <PointDeTravail /> : null}
                {libelleEtat(etat)}
              </Badge>
            )}
            <span>Déposé {anciennete(depot.createdAt, new Date(), fuseau)}</span>
          </p>

          <ConceptsAVerifier nombre={aVerifier.length} />

          {/* Tant qu'un travail tourne, l'écran se recharge tout seul quand il
              aboutit. Monté seulement dans ce cas : sur un dépôt prêt, rejeté ou
              en échec, il n'y a plus rien à attendre et l'interrogation serait
              une boucle sans fin sur une page qui ne bougera plus. Une demande
              qui attend sa date n'en est pas non plus — voir `travailEnCours`. */}
          {travailEnCours(etat) ? (
            <SuivreLAvancement inputId={depot.id} etat={etat} concepts={depot.concepts.length} />
          ) : null}

          {/* Ce que ce dépôt vient de changer à la journée, et la porte qui va
              avec. Seulement quand la chaîne a fini : l'annoncer pendant qu'elle
              tourne ferait compter des concepts qui n'ont pas encore leurs
              questions. */}
          {duJour ? <EntreeDansLaSerie charge={duJour.charge} /> : null}
        </div>

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
                reste du texte, on ne cherche pas à reconnaître du code.

                **`whitespace-pre-wrap` a fait place à `TexteRiche`.** Il gardait
                *tous* les retours à la ligne, y compris ceux qu'aucun humain
                n'avait voulus : un texte collé depuis un éditeur qui enroule à
                soixante-cinq signes s'affichait sur une colonne de soixante-cinq
                signes au milieu d'une carte deux fois plus large. Et il ne
                connaissait pas les barrières de code, si bien qu'un extrait de
                trois lignes se rendait en une pluie de jetons sans rapport. */}
            <div className="mt-pas-3 p-pas-4 text-petit rounded-carte bg-surface-ombre text-stone-700">
              <TexteRiche>{texte}</TexteRiche>
            </div>
            {depot.texteRetenu ? (
              <p className="mt-pas-2 text-petit text-stone-500">
                Ta consigne écartait une partie de ce dépôt : elle n&apos;est pas montrée ici. Le
                texte d&apos;origine, lui, est conservé tel que tu l&apos;as posé.
              </p>
            ) : null}

            {depot.texteTronque ? (
              <p className="mt-pas-2 text-petit text-stone-500">
                La capture portait plus de texte qu&apos;un dépôt n&apos;en accepte. La lecture
                s&apos;arrête à {CARACTERES_MAXIMUM.toLocaleString("fr-FR")} caractères.
              </p>
            ) : null}

            {/* La consigne se lit **sous** le dépôt, et non au-dessus : c'est ce
                qu'on a dit du texte, pas le texte. Sans titre à elle, qui en
                ferait une troisième section de même poids que les deux vraies
                — ce qu'on a déposé, ce qu'on en a tiré. Elle explique ce qui
                manque dans la liste, et c'est le seul service qu'on lui
                demande. */}
            {depot.instruction ? (
              <p className="mt-pas-3 text-petit text-stone-500">
                Ta consigne : «&nbsp;{depot.instruction}&nbsp;»
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
          /*
            La borne est la nôtre : le message dit ce qui s'est passé et ouvre une
            porte, sans conseiller de déposer moins ni reprocher la longueur.

            **Il annonçait « les plus importants », et c'était faux.** Les concepts
            sortent dans l'ordre du texte, pas par importance : mesuré le 04/09/2026
            sur le seul dépôt tronqué de la production, dix-huit des vingt concepts
            gardés se suivaient dans l'ordre exact du texte, et le dernier tombait à
            87 % de sa longueur. La coupe emportait donc la fin — qui n'est pas la
            partie la moins utile, juste la dernière.

            Une consigne de prompt demandait ce classement. C'est la cinquième
            propriété de distribution que ce projet aurait tenue par de la prose, et
            comme les quatre autres elle ne tenait pas. Elle a été retirée plutôt
            que renforcée : le modèle rend maintenant l'ordre du texte, que la liste
            affiche, et le message dit où la lecture s'est arrêtée. « Dépose la
            suite » demandait à l'utilisateur de deviner où couper ; le dernier
            concept de la liste le lui montre.
          */
          <p className="mt-pas-2 text-petit text-stone-500">
            Ce texte en portait plus de {PLAFOND_CONCEPTS_PAR_DEPOT}. On l&apos;a suivi dans
            l&apos;ordre et on s&apos;est arrêté au dernier concept de cette liste — dépose la fin
            du texte pour avoir le reste.
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
