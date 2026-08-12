import type { Metadata } from "next";
import Link from "next/link";
import { Panneau } from "@/components/coquille/panneau";
import { PileDePanneaux } from "@/components/coquille/pile-de-panneaux";
import { ROUTES } from "@/lib/auth/routes";

export const metadata: Metadata = { title: "Comment ça marche" };

/**
 * Le fonctionnement en entier, pour la minorité qui veut le lire.
 *
 * Elle existe pour ne pas charger le reste de l'interface : sans elle, chaque
 * écran serait tenté d'expliquer un bout du principe à qui ne l'a pas demandé.
 * Ceux qui n'ouvrent jamais cette page doivent comprendre le produit sans elle,
 * et c'est le travail des exemples de dépôt et des deux explications ponctuelles.
 *
 * Du texte, en une colonne de lecture. Pas d'illustration, pas de schéma : ce
 * qui se dit en trois phrases n'a pas besoin d'un diagramme.
 */

const SECTIONS = [
  {
    titre: "On revoit juste avant d'oublier",
    corps: [
      "Relire dix fois d'affilée ne fait rien tenir. Ce qui fait tenir, c'est de retrouver une chose au moment où elle est sur le point de s'effacer — l'effort de rappel est ce qui la réinstalle.",
      "Chaque concept que tu retrouves s'éloigne : deux jours, puis une semaine, puis un mois. Chaque concept que tu rates se rapproche. C'est pour ça qu'une session s'arrête, et c'est pour ça qu'elle ne repose pas ce que tu viens de voir.",
    ],
  },
  {
    titre: "Un dépôt donne des concepts, un concept donne des questions",
    corps: [
      "Ce que tu déposes n'est jamais modifié. Il est découpé en concepts — une idée par concept — et chaque concept reçoit quatre questions.",
      "Les quatre ne se ressemblent pas : reconnaître de quoi il s'agit, expliquer pourquoi ça marche, dire ce que ce n'est pas, s'en servir ailleurs. C'est l'angle qui change, pas l'habillage.",
    ],
  },
  {
    titre: "La question tourne, le planning ne suit que le concept",
    corps: [
      "Tu ne revois jamais deux fois de suite le même angle. Sans ça, on finit par mémoriser une formulation plutôt qu'une idée, et la question suivante ne mesure plus rien.",
      "L'échéance, elle, appartient au concept. Changer de question ne rapproche ni n'éloigne rien.",
    ],
  },
  {
    titre: "« Je maîtrise ça » repousse, ne supprime pas",
    corps: [
      "Le bouton sort le concept du cycle et le repose dans trois mois. Il ne l'efface pas : toute la thèse du produit est qu'on croit savoir et qu'on oublie, et te prendre au mot serait la contredire.",
      "Tu peux le remettre en cycle à tout moment depuis son dépôt.",
    ],
  },
  {
    titre: "L'entraînement ne compte pas",
    corps: [
      "Il repose d'autres questions sur les mêmes concepts, autant que tu veux. Il ne déplace aucune échéance, ne donne aucun point, et ne tient pas ta série.",
      "C'est volontaire : cinq passages dans l'heure sur un même concept, c'est de la mémoire de travail. Les laisser allonger l'intervalle serait exactement ce que ce produit existe pour empêcher.",
    ],
  },
  {
    titre: "Ce qui est compté",
    corps: [
      "Un point par question passée en session, un de plus quand tu retrouves un concept que tu avais raté au passage précédent. La justesse n'entre pas dans le calcul.",
      "C'est délibéré : tomber sur ce que tu rates est le moment où l'apprentissage se produit. Un score qui punit l'échec pousse à éviter les sujets durs et à s'auto-noter généreusement.",
    ],
  },
];

export default function PageCommentCaMarche() {
  return (
    <PileDePanneaux sol="papier">
      <Panneau surface="papier" mesure="texte" remplit className="md:py-pas-16">
        <h1 className="text-h1-app leading-tight font-bold text-stone-900">Comment ça marche</h1>
        <p className="mt-pas-4 text-corps max-w-prose leading-relaxed text-stone-500">
          Tu n&apos;as pas besoin de cette page pour te servir de Kairn. Elle est là pour ceux qui
          préfèrent savoir ce qui se passe derrière.
        </p>

        {SECTIONS.map((section) => (
          <section key={section.titre} className="mt-pas-12">
            <h2 className="text-h2-app leading-snug font-bold text-stone-900">{section.titre}</h2>
            {section.corps.map((paragraphe) => (
              <p
                key={paragraphe}
                className="mt-pas-3 text-corps max-w-prose leading-relaxed text-stone-800"
              >
                {paragraphe}
              </p>
            ))}
          </section>
        ))}

        <div className="mt-pas-16">
          <Link
            href={ROUTES.reglages}
            className="rounded-galet text-petit text-stone-500 underline-offset-4 hover:underline focus-visible:underline"
          >
            Retour aux réglages
          </Link>
        </div>
      </Panneau>
    </PileDePanneaux>
  );
}
