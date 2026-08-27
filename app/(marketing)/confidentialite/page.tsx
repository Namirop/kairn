import type { Metadata } from "next";
import { PageLegale, type RubriqueLegale } from "@/components/site/page-legale";
import { AUTORITE, CONTACT, EDITEUR } from "@/lib/site/editeur";

export const metadata: Metadata = { title: "Confidentialité" };

/**
 * Ce que Kairn collecte, et ce qu'on peut en faire.
 *
 * Tout ce qui décrit le fonctionnement réel est écrit, et ces phrases-là sont
 * vérifiables dans le code : les sept jours d'une visite sans compte sont
 * `JOURS_AVANT_OUBLI`, les six heures de restauration sont la fenêtre configurée
 * sur la base de production. Un chiffre inventé ici serait un mensonge daté.
 *
 * Deux choses que la version précédente taisait, et qui sont exactement celles
 * qu'on vient chercher : **les cookies** — il y en a, ils sont strictement
 * nécessaires, et le dire est plus honnête que d'annoncer l'absence de traceurs
 * publicitaires ; et **l'empreinte d'adresse IP**, qui reste une donnée
 * personnelle même hachée, puisque hacher pseudonymise et n'anonymise pas.
 *
 * **La base du rappel quotidien est le contrat, pas le consentement**, et c'est un
 * choix qui suit le code : `dailyReminderEnabled` vaut vrai à la création du
 * compte. Un consentement pré-coché n'est pas un consentement — écrire
 * « consentement » ici, avec ce défaut-là, serait la seule ligne fausse de la
 * page. Le raisonnement tient parce que Kairn est un produit dont l'objet **est**
 * de reposer au bon moment : le rappel n'est pas une communication ajoutée au
 * service, il est le service. Basculer le défaut à faux ferait de la base un
 * consentement et retirerait toute discussion — c'est une décision de produit, pas
 * de page légale.
 */
const RUBRIQUES: RubriqueLegale[] = [
  {
    titre: "Responsable du traitement",
    corps: [
      `${EDITEUR.nom} — ${EDITEUR.mentionEI}, ${EDITEUR.adresse}, SIREN ${EDITEUR.siren}.`,
      `Pour toute question ou demande relative à tes données : ${CONTACT.email}.`,
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
      "Une empreinte de ton adresse IP, si tu essaies le service sans compte depuis la page d'accueil. C'est une empreinte salée, jamais l'adresse : elle sert à compter combien d'essais viennent du même endroit, et à rien d'autre. Elle reste une donnée personnelle — hacher pseudonymise, ça n'anonymise pas — et elle disparaît avec la visite, au bout de sept jours.",
    ],
  },
  {
    titre: "Cookies",
    corps: [
      "Deux cookies, tous les deux strictement nécessaires au service : il n'y a donc pas de bandeau à accepter, et il n'y a rien à refuser sans casser le fonctionnement.",
      "Les cookies de session, préfixés « better-auth. », te maintiennent connecté. Un mois, renouvelé à chaque visite.",
      "« kairn_visite » retient l'essai que tu fais sans compte, le temps de te permettre de le récupérer en créant un compte. Sept jours, la même durée que ce qu'il désigne.",
      "Aucun traceur publicitaire, aucun cookie de mesure d'audience, aucun partage à des tiers en dehors des sous-traitants techniques listés plus bas.",
      "Le contenu que tu déposes n'apparaît jamais dans les journaux du serveur : ils ne portent que des identifiants.",
    ],
  },
  {
    titre: "Sous-traitants",
    corps: [
      "OpenRouter, Inc. (New York, États-Unis) découpe les dépôts en concepts et écrit les questions. Le contenu déposé lui est transmis pour ce traitement, qui est le service lui-même. OpenRouter s'appuie sur un sous-traitant ultérieur, OpenAI, L.L.C. (San Francisco, États-Unis), qui exécute réellement les modèles.",
      "Nous avons désactivé sur notre compte OpenRouter toute option autorisant l'entraînement sur les données transmises. OpenRouter ne conserve pas le contenu des requêtes, mais des métadonnées techniques (horodatage, modèle, volume de tokens). OpenAI, sous-traitant ultérieur, conserve les données jusqu'à 30 jours pour la surveillance des abus, puis les supprime.",
      "Anthropic Ireland, Limited (Dublin, Irlande), pour le même traitement, en repli automatique quand OpenRouter est indisponible. Ses conditions commerciales interdisent l'entraînement de modèles sur le contenu de ses clients, et ses journaux d'appels sont supprimés sous trente jours.",
      "Neon, LLC — société du groupe Databricks, Inc. —, pour l'hébergement de la base de données, sur une infrastructure située à Francfort, en Allemagne.",
      "Vercel Inc., pour l'hébergement de l'application, avec une exécution en région européenne.",
      "Plus Five Five, Inc. (Resend), pour l'acheminement des emails.",
      `Leurs engagements contractuels ont été relus le ${EDITEUR.verifieLe}. Cette vérification est refaite une fois par an.`,
    ],
  },
  {
    titre: "Transferts hors Union européenne",
    corps: [
      "Il y en a, et il vaut mieux le dire clairement. La base est à Francfort et l'exécution en Europe, mais les sociétés qui les opèrent sont américaines, et le contenu déposé est traité hors de l'Union — chez OpenRouter et son sous-traitant OpenAI, avec Anthropic en Irlande comme repli.",
      "Databricks (pour Neon), Vercel et Resend sont certifiés au titre du cadre de protection des données UE–États-Unis, et s'appuient en complément sur les clauses contractuelles types de la Commission européenne.",
      "OpenRouter et Anthropic ne sont pas certifiés à ce cadre : leurs transferts reposent sur les seules clauses contractuelles types. OpenRouter est le sous-traitant qui reçoit ce que tu déposes (et l'achemine à OpenAI comme sous-traitant ultérieur), Anthropic le reçoit en repli — ce sont les deux points à connaître si le seul mécanisme des clauses contractuelles types ne te convient pas.",
    ],
  },
  {
    titre: "Combien de temps",
    corps: [
      "Tes données sont conservées tant que ton compte existe. Tu peux le supprimer à tout moment depuis les réglages : le compte, tes dépôts, tes concepts, leurs questions et tous tes passages sont effacés immédiatement.",
      "Un essai fait sans compte, et que personne n'a réclamé en créant un compte, est effacé au bout de sept jours avec tout ce qui en découle.",
      "L'historique de la base autorise une restauration jusqu'à six heures en arrière. Une suppression est donc effective immédiatement dans le service, et définitive au plus tard six heures après.",
      "Deux traces survivent, détachées de toi et sans rien qui te désigne : la comptabilité des appels au modèle, parce qu'une dépense engagée ne s'efface pas, et les signalements de questions défectueuses, qui portent le texte d'une question à corriger et non ton identité.",
    ],
  },
  {
    titre: "Bases légales",
    corps: [
      "Chaque finalité repose sur une base et une seule.",
      "Le rappel quotidien est actif dès la création du compte, et c'est assumé : reposer ce que tu as déposé au bon moment est le service lui-même, pas une communication qui s'y ajoute. Il se coupe d'un clic, depuis les réglages comme depuis le lien présent dans chaque email.",
    ],
    couples: [
      { terme: "Créer et gérer ton compte, t'authentifier", valeur: "Contrat" },
      {
        terme: "Recevoir tes dépôts, les découper en concepts, produire les questions",
        valeur: "Contrat",
      },
      { terme: "Planifier tes révisions et enregistrer tes réponses", valeur: "Contrat" },
      { terme: "T'envoyer les emails de connexion et de confirmation", valeur: "Contrat" },
      { terme: "T'envoyer le rappel quotidien de révision", valeur: "Contrat" },
      { terme: "T'envoyer l'alerte de série du soir", valeur: "Intérêt légitime" },
      {
        terme: "Compter tes dépôts et tes concepts pour appliquer les plafonds",
        valeur: "Intérêt légitime",
      },
      { terme: "Limiter les abus et les dépôts automatisés", valeur: "Intérêt légitime" },
      { terme: "Traiter tes signalements de questions", valeur: "Intérêt légitime" },
      { terme: "Mesurer l'usage global du service", valeur: "Intérêt légitime" },
    ],
  },
  {
    titre: "Tes droits",
    corps: [
      "Tu peux emporter tes données à tout moment depuis les réglages : un fichier contenant tes dépôts, tes concepts, leurs questions, tes passages et ta progression.",
      "Tu peux supprimer ton compte depuis le même écran, sans avoir à écrire à qui que ce soit.",
      "Tu peux couper les emails d'un clic, depuis les réglages comme depuis le lien présent dans chacun d'eux. Coupés, plus rien ne part sauf le code de connexion — sans lui, personne ne pourrait plus entrer dans son compte.",
      "Tu disposes également d'un droit de rectification, d'opposition et de limitation. Pour ceux-là, écris à " +
        `${CONTACT.email}, ou par courrier à ${EDITEUR.nom}, ${EDITEUR.adresse}. La voie postale est celle à prendre s'il faut joindre une pièce d'identité.`,
    ],
  },
  {
    titre: "Autorité de contrôle",
    corps: [
      `Si tu estimes que le traitement de tes données n'est pas conforme, tu peux introduire une réclamation auprès de la ${AUTORITE.nom}.`,
      `${AUTORITE.adresse} — ${AUTORITE.telephone} — ${AUTORITE.site}`,
    ],
  },
];

export default function PageConfidentialite() {
  return (
    <PageLegale
      titre="Confidentialité"
      chapeau="Ce que Kairn collecte, à qui c'est transmis, combien de temps c'est gardé, et comment tout récupérer ou tout effacer."
      rubriques={RUBRIQUES}
      misAJour={`Dernière vérification des engagements des sous-traitants : ${EDITEUR.verifieLe}.`}
    />
  );
}
