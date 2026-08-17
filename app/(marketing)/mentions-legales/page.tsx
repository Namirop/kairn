import type { Metadata } from "next";
import { PageLegale, type RubriqueLegale } from "@/components/site/page-legale";
import { CONTACT, EDITEUR } from "@/lib/site/editeur";

export const metadata: Metadata = { title: "Mentions légales" };

/**
 * Qui opère Kairn, et sur quoi il tourne.
 *
 * Tout ce qui est écrit ici est vérifié. Les identités et adresses des
 * sous-traitants viennent de leurs propres documents juridiques et non d'un
 * annuaire d'entreprises : une adresse recopiée d'un agrégateur est fausse une
 * fois sur trois, et dans des mentions légales une information fausse a l'air d'un
 * engagement.
 *
 * Il n'y reste plus de trou.
 */
const RUBRIQUES: RubriqueLegale[] = [
  {
    titre: "Éditeur du service",
    corps: [
      `${EDITEUR.nom} — ${EDITEUR.mentionEI}.`,
      `${EDITEUR.statut}.`,
      `Siège : ${EDITEUR.adresse}.`,
      `SIREN : ${EDITEUR.siren}.`,
      `${EDITEUR.tva}`,
      `Contact : ${CONTACT.email} — ${EDITEUR.telephone}.`,
    ],
  },
  {
    titre: "Directeur de la publication",
    corps: [`${EDITEUR.nom}, joignable à ${CONTACT.email}.`],
  },
  {
    titre: "Hébergement",
    corps: [
      "L'application est hébergée par Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis, joignable à legalnotices@vercel.com. Vercel ne publie pas de numéro de téléphone. Les fonctions serveur sont exécutées depuis une région européenne.",
      "La base de données est opérée par Neon, LLC, société du groupe Databricks, Inc., 160 Spear Street, Suite 1300, San Francisco, CA 94105, États-Unis. L'infrastructure qui la porte est située à Francfort, en Allemagne.",
      "Les emails transactionnels sont acheminés par Plus Five Five, Inc. (Resend), 2261 Market Street #5039, San Francisco, CA 94114, États-Unis.",
    ],
  },
  {
    titre: "Traitement du contenu déposé",
    corps: [
      "Le texte et les images déposés sont transmis à Anthropic Ireland, Limited — 6th Floor, South Bank House, Barrow Street, Dublin 4, D04 TR29, Irlande — pour être découpés en concepts et transformés en questions. Ce traitement est le service lui-même : sans lui, l'application ne fait rien.",
    ],
  },
  {
    titre: "Propriété intellectuelle",
    corps: [
      `Le code source de Kairn, le nom « Kairn », le logo, l'identité visuelle et l'ensemble des éléments composant le service sont la propriété de ${EDITEUR.nom} et sont protégés par le droit d'auteur. Toute reproduction ou représentation, totale ou partielle, sans autorisation écrite préalable est interdite.`,
      "Le contenu que tu déposes reste le tien. Kairn n'acquiert aucun droit dessus, hormis celui strictement nécessaire à son traitement pour te fournir le service : le découper en concepts, en produire des questions et te les reposer.",
      "Il n'est ni réutilisé à d'autres fins, ni cédé à des tiers, ni utilisé pour entraîner un modèle. Ce dernier point n'est pas une intention mais une clause : les conditions commerciales d'Anthropic interdisent l'entraînement sur le contenu de ses clients.",
    ],
  },
  {
    titre: "Signaler un contenu ou un problème",
    corps: [
      `Écris à ${CONTACT.email}. Nous accusons réception de tout signalement sous cinq jours ouvrés et y donnons suite dans les meilleurs délais.`,
      "Les dépôts sont privés et ne sont jamais diffusés publiquement : Kairn n'est pas une plateforme de contenus publics. Ce canal existe pour les questions défectueuses et les problèmes de service, et il double le signalement présent sous chaque question.",
    ],
  },
];

export default function PageMentionsLegales() {
  return (
    <PageLegale
      titre="Mentions légales"
      chapeau="Qui édite Kairn, où le service est hébergé, et à qui s'adresser."
      rubriques={RUBRIQUES}
      misAJour={`Dernière vérification des informations d'hébergement et de sous-traitance : ${EDITEUR.verifieLe}.`}
    />
  );
}
