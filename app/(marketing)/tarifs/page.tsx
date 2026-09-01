import type { Metadata } from "next";
import Link from "next/link";
import { Panneau } from "@/components/coquille/panneau";
import { PileDePanneaux } from "@/components/coquille/pile-de-panneaux";
import { Strates } from "@/components/coquille/strates";
import { Offres } from "@/components/site/offres";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/auth/routes";
import { getCurrentUser } from "@/lib/auth/session";
import { PLAFOND_GRATUIT } from "@/lib/domain/plafond-du-plan";

export const metadata: Metadata = {
  title: "Ce que ça coûte",
  description:
    "Trente concepts par mois gratuitement, trois cents pour sept euros. Ce qui change entre les deux, et ce qui ne change pas.",
};

/**
 * Le prix, sur une page à soi.
 *
 * Une page et non une fenêtre : un prix se partage par lien, se relit sans être
 * connecté, se référence depuis des conditions de vente. Une popup ne fait aucun
 * des trois, et disparaît au moment où l'on veut la montrer à quelqu'un.
 *
 * **Elle informe, elle n'encaisse pas encore.** Le geste d'achat vivra dans les
 * réglages, avec le reste de ce qui touche au compte ; ici on décide, là-bas on
 * paie. Tant que le paiement n'est pas branché, cette page dit le vrai — deux
 * offres, un prix, ce qui les sépare — sans proposer un bouton qui ne mènerait
 * nulle part.
 *
 * Le registre est celui de la landing : surfaces pleine largeur, strates aux
 * jointures, display sur les nombres. C'est une page publique, elle a le droit
 * d'être expressive — mais l'accent reste unique et fonctionnel, sur la seule
 * colonne qu'on vend.
 */
export default async function PageTarifs() {
  const connecte = (await getCurrentUser()) !== null;

  return (
    <PileDePanneaux sol="papier">
      <Panneau surface="papier" aere mesure="colonne">
        <h1 className="font-display text-h1-site leading-[1] font-bold tracking-[-0.02em]">
          Ce que ça coûte.
        </h1>
        <p className="mt-pas-6 text-corps max-w-prose text-stone-500">
          Un concept, c&apos;est une idée que Kairn a découpée dans ce que tu déposes, et qu&apos;il
          te repose au bon moment. Tu en gardes {PLAFOND_GRATUIT} par mois sans payer.
        </p>
      </Panneau>

      <Strates de="papier" vers="ombre" graine="tarifs-offres" />

      <Panneau surface="ombre" aere mesure="colonne">
        <Offres />
      </Panneau>

      <Strates de="ombre" vers="papier" graine="tarifs-precisions" />

      <Panneau surface="papier" aere mesure="colonne" remplit>
        <h2 className="font-display text-h2-site leading-[1] font-bold tracking-[-0.02em]">
          Ce que le prix ne change pas.
        </h2>

        {/* Ce qui suit doit rester vrai du code. Aucune de ces phrases n'est un
            argument : chacune répond à une question qu'on se pose devant un
            paiement, et chacune se vérifie dans le produit. */}
        <div className="mt-pas-8 gap-pas-6 grid">
          <Precision titre="Tout le reste est identique">
            Les révisions, l&apos;entraînement, les formats de questions, le cairn : rien de tout ça
            ne regarde ton offre. Le seul chiffre qui change est le nombre de concepts que tu peux
            garder dans le mois.
          </Precision>

          <Precision titre="Le mois part de ton inscription">
            Pas du premier du mois. Si tu t&apos;inscris un 12, ton compteur repart le 12. Ce qui
            n&apos;a pas servi ne se reporte pas au mois suivant.
          </Precision>

          <Precision titre="Arrêter ne te retire rien">
            Tes concepts restent, tes révisions continuent. Tu retournes simplement à{" "}
            {PLAFOND_GRATUIT} nouveaux concepts par mois. Rien n&apos;est supprimé, jamais.
          </Precision>

          <Precision titre="Tu arrêtes quand tu veux">
            L&apos;abonnement court jusqu&apos;au terme déjà payé, puis s&apos;arrête. Il n&apos;y a
            pas d&apos;engagement, et rien à demander à personne.
          </Precision>
        </div>

        <div className="mt-pas-12 gap-pas-4 flex flex-wrap items-center">
          <Button asChild size="lg">
            <Link href={connecte ? ROUTES.depots : ROUTES.inscription}>
              {connecte ? "Déposer" : "Commencer gratuitement"}
            </Link>
          </Button>
          {/* Rien à ajouter pour quelqu'un de connecté tant que l'écran de
              l'offre n'existe pas : l'y envoyer serait l'envoyer nulle part. */}
          {connecte ? null : (
            <p className="text-petit text-stone-500">Sans carte, sans engagement.</p>
          )}
        </div>
      </Panneau>
    </PileDePanneaux>
  );
}

function Precision({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-corps font-semibold text-stone-900">{titre}</h3>
      <p className="mt-pas-1 text-petit max-w-prose text-stone-500">{children}</p>
    </div>
  );
}
