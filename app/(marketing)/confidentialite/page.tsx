import type { Metadata } from "next";
import { PageLegale, type RubriqueLegale } from "@/components/site/page-legale";

export const metadata: Metadata = { title: "Confidentialité" };

/**
 * Ce que Kairn collecte, et ce qu'on peut en faire.
 *
 * Tout ce qui décrit le fonctionnement réel est écrit : ces phrases-là ne sont
 * pas des promesses à tenir plus tard, elles décrivent le code d'aujourd'hui, et
 * elles sont vérifiables. Ne restent vides que les rubriques qui demandent une
 * identité d'entreprise ou une décision qui n'a pas encore été prise.
 */
const RUBRIQUES: RubriqueLegale[] = [
  {
    titre: "Responsable du traitement",
    aRemplir: [
      "identité du responsable de traitement (la même que l'éditeur)",
      "adresse email dédiée aux demandes relatives aux données",
    ],
  },
  {
    titre: "Ce qui est collecté",
    corps: [
      "Ton adresse email et ton nom, pour tenir ton compte et t'envoyer les rappels que tu as acceptés.",
      "Ton fuseau horaire, détecté par le navigateur. Il ne sert qu'à deux choses : savoir quel jour il est chez toi, et à quelle heure t'écrire.",
      "Ce que tu déposes — textes et captures — ainsi que les concepts, les questions et les passages qui en découlent.",
      "Des compteurs d'usage : nombre de dépôts et de concepts sur ta période, nombre de révisions, série en cours. Ils servent aux limites du service et à ta progression.",
      "Les captures d'écran sont effacées dès que leur texte est extrait. Il n'existe aucune route pour les servir, et elles ne survivent pas non plus à un échec de lecture.",
    ],
  },
  {
    titre: "Ce qui n'est pas collecté",
    corps: [
      "Aucun traceur publicitaire, aucun cookie de mesure d'audience, aucun partage à des tiers en dehors des sous-traitants techniques listés plus bas.",
      "Le contenu que tu déposes n'apparaît jamais dans les journaux du serveur : ils ne portent que des identifiants.",
    ],
  },
  {
    titre: "Sous-traitants",
    corps: [
      "Anthropic PBC, pour découper les dépôts en concepts et écrire les questions. Le contenu déposé lui est transmis pour ce traitement.",
      "Neon Inc., pour l'hébergement de la base de données, sur une infrastructure située à Francfort, en Allemagne.",
      "Vercel Inc., pour l'hébergement de l'application, avec une exécution en région européenne.",
      "Resend, Inc., pour l'acheminement des emails.",
    ],
    aRemplir: [
      "date de la dernière vérification des engagements de chaque sous-traitant",
      "mention des transferts hors UE et de leur encadrement, le cas échéant",
    ],
  },
  {
    titre: "Combien de temps",
    corps: [
      "Tes données sont conservées tant que ton compte existe. Tu peux le supprimer à tout moment depuis les réglages : le compte, tes dépôts, tes concepts, leurs questions et tous tes passages sont effacés immédiatement.",
      "Deux traces survivent, détachées de toi et sans rien qui te désigne : la comptabilité des appels au modèle, parce qu'une dépense engagée ne s'efface pas, et les signalements de questions défectueuses, qui portent le texte d'une question à corriger et non ton identité.",
    ],
    aRemplir: ["durée de conservation des sauvegardes de la base, et délai avant leur rotation"],
  },
  {
    titre: "Tes droits",
    corps: [
      "Tu peux emporter tes données à tout moment depuis les réglages : un fichier contenant tes dépôts, tes concepts, leurs questions, tes passages et ta progression.",
      "Tu peux supprimer ton compte depuis le même écran, sans avoir à écrire à qui que ce soit.",
      "Tu peux couper les emails d'un clic, depuis le lien présent dans chacun d'eux.",
      "Tu disposes également d'un droit de rectification et d'opposition, et du droit d'introduire une réclamation auprès d'une autorité de contrôle.",
    ],
    aRemplir: [
      "adresse à laquelle exercer les droits qui ne sont pas automatisés",
      "autorité de contrôle compétente et ses coordonnées",
    ],
  },
  {
    titre: "Base légale",
    aRemplir: [
      "base légale retenue pour chaque finalité (exécution du contrat, intérêt légitime, consentement pour les rappels)",
    ],
  },
];

export default function PageConfidentialite() {
  return (
    <PageLegale
      titre="Confidentialité"
      chapeau="Ce que Kairn collecte, à qui c'est transmis, combien de temps c'est gardé, et comment tout récupérer ou tout effacer."
      rubriques={RUBRIQUES}
      misAJour="Cette politique doit être complétée avant l'ouverture publique du service."
    />
  );
}
