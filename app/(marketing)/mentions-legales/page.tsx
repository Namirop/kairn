import type { Metadata } from "next";
import { PageLegale, type RubriqueLegale } from "@/components/site/page-legale";

export const metadata: Metadata = { title: "Mentions légales" };

/**
 * Qui opère Kairn, et sur quoi il tourne.
 *
 * Les rubriques d'identification sont laissées vides à dessein : une raison
 * sociale ou un numéro d'entreprise inventés seraient une fausse déclaration, et
 * dans des mentions légales une fausse déclaration a l'air d'un engagement.
 */
const RUBRIQUES: RubriqueLegale[] = [
  {
    titre: "Éditeur du service",
    aRemplir: [
      "nom et prénom, ou raison sociale",
      "statut juridique (micro-entrepreneur)",
      "numéro SIREN ou SIRET",
      "adresse du siège ou du domicile professionnel",
      "adresse email de contact",
      "numéro de TVA intracommunautaire, s'il y en a un",
    ],
  },
  {
    titre: "Directeur de la publication",
    aRemplir: ["nom et prénom du responsable de la publication"],
  },
  {
    titre: "Hébergement",
    corps: [
      "L'application est hébergée par Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis. Les fonctions serveur sont exécutées depuis une région européenne.",
      "Les données sont stockées par Neon Inc. sur une infrastructure située à Francfort, en Allemagne.",
      "Les emails transactionnels sont acheminés par Resend, Inc.",
    ],
  },
  {
    titre: "Traitement du contenu déposé",
    corps: [
      "Le texte et les images déposés sont transmis à Anthropic PBC pour être découpés en concepts et transformés en questions. Ce traitement est le service lui-même : sans lui, l'application ne fait rien.",
    ],
  },
  {
    titre: "Propriété intellectuelle",
    corps: [
      "Le contenu que tu déposes reste le tien. Kairn ne s'en attribue aucun droit et ne le réutilise pas pour autre chose que te le reposer.",
    ],
    aRemplir: ["mention de propriété sur le code, la marque et l'identité visuelle du service"],
  },
  {
    titre: "Signaler un contenu ou un problème",
    aRemplir: ["adresse email à laquelle adresser un signalement, et délai de réponse annoncé"],
  },
];

export default function PageMentionsLegales() {
  return (
    <PageLegale
      titre="Mentions légales"
      chapeau="Qui édite Kairn, où le service est hébergé, et à qui s'adresser."
      rubriques={RUBRIQUES}
      misAJour="Ces mentions doivent être complétées avant l'ouverture publique du service."
    />
  );
}
