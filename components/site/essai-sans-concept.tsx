import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/auth/routes";
import { CARACTERES_MAXIMUM, longueurEnClair } from "@/lib/depots/bornes-du-depot";
import type { AvancementDeLEssai } from "@/lib/depots/essai-en-cours";

/**
 * L'essai n'a rien donné. **Quatre** situations, et elles ne se confondent pas.
 *
 * Deux causes qui ne s'imputent pas à la même personne, croisées avec le fait
 * qu'il reste ou non de quoi retenter. La fonction n'en couvrait que trois, et
 * la manquante était la plus contradictoire de toutes : « cet essai ne t'est pas
 * compté » sous un bouton qui referme la visite. On annonçait la gratuité et on
 * fermait la porte dans la même phrase.
 *
 * **Panne, avec une reprise.** Rien à demander à quelqu'un qui n'y est pour
 * rien : on dit que ça vient de nous, et surtout pas de changer son texte — il
 * n'y avait rien à y changer.
 *
 * **Panne, et plus de reprise.** Les pannes tolérées sont épuisées. Ce n'est
 * toujours pas sa faute, et le dire reste la première chose à faire ; ce qui
 * change, c'est qu'on ne peut plus rien lui proposer ici. Le compte devient la
 * seule suite honnête, et il est offert pour ce qu'il permettra vraiment —
 * reprendre plus tard —, pas pour garder des concepts qui n'existent pas.
 *
 * **Rejet, avec un essai qui reste.** Le motif du modèle dit ce qui manquait ;
 * c'est la seule chose de valeur qu'un rejet produise, et c'est elle qui apprend
 * à mieux déposer.
 *
 * **Rejet, et plus d'essai.** On garde le motif à l'écran — il reste la raison,
 * et elle est valable — et on propose le compte sans prétendre qu'il y a quoi
 * que ce soit à récupérer.
 *
 * **Le titre est à nous, le constat est au modèle.** Depuis que le résultat
 * occupe le panneau entier, cet écran doit porter un titre comme les autres — et
 * y poser `motifDechec` serait poser une phrase écrite par un modèle, de
 * longueur inconnue, dans un display de soixante pixels. Quatre mots fixes
 * titrent ; la phrase du modèle garde le corps, où sa longueur ne casse rien.
 */
type Situation = { titre: string; constat: string; explication: string };

const VIENT_DE_NOUS = "Ça vient de nous.";

function situationDeLEchec(
  panne: boolean,
  peutRedeposer: boolean,
  motifDechec: string | null,
): Situation {
  if (panne && peutRedeposer) {
    return {
      titre: VIENT_DE_NOUS,
      constat: "Le découpage n'a pas abouti, et ça ne vient pas de ton texte.",
      explication: "Cet essai ne t'est pas compté. Relance-le, ou reviens dans un moment.",
    };
  }

  if (panne) {
    return {
      titre: VIENT_DE_NOUS,
      constat: "Le découpage ne répond pas en ce moment.",
      explication:
        "Ça ne vient pas de ton texte, et rien ne t'a été compté. Avec un compte, tu pourras reprendre dès que ce sera rétabli.",
    };
  }

  const constat = motifDechec ?? "Ce texte n'a rien donné à retenir.";

  if (peutRedeposer) {
    return {
      titre: "Rien à retenir là-dedans.",
      constat,
      explication:
        "Retente avec une explication, une règle, un mécanisme — quelque chose que tu voudrais savoir dans un mois.",
    };
  }

  return {
    titre: "Rien à retenir là-dedans.",
    constat,
    explication: `Un compte accepte ${longueurEnClair(CARACTERES_MAXIMUM)}, garde ce qu'il en tire, et te le repose au bon moment.`,
  };
}

export function EssaiSansConcept({
  avancement,
  setRecommence,
}: {
  avancement: AvancementDeLEssai;
  setRecommence: (valeur: boolean) => void;
}) {
  const { panne, peutRedeposer, motifDechec } = avancement;
  const situation = situationDeLEchec(panne, peutRedeposer, motifDechec);

  return (
    <div className="gap-pas-4 flex flex-col" role="status">
      <h2 className="font-display text-h2-site leading-[1] font-bold tracking-[-0.02em] text-stone-900">
        {situation.titre}
      </h2>

      <p className="text-corps max-w-xl text-stone-900">{situation.constat}</p>

      <p className="text-petit max-w-xl text-stone-500">{situation.explication}</p>

      <div className="mt-pas-2">
        {peutRedeposer ? (
          <Button type="button" size="lg" variant="outline" onClick={() => setRecommence(true)}>
            Réessayer
          </Button>
        ) : (
          <Button asChild size="lg">
            <Link href={ROUTES.connexion}>Créer un compte</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
