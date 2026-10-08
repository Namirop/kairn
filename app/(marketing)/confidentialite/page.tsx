import type { Metadata } from "next";
import type { MessageKeys, NestedKeyOf } from "next-intl";
import { getTranslations } from "next-intl/server";
import { PageLegale } from "@/components/site/page-legale";
import { langueDeLaRequete } from "@/lib/i18n/langue-de-la-requete";
import { ETIQUETTE_INTL } from "@/lib/i18n/langues";
import type { Messages } from "@/lib/i18n/messages";
import { AUTORITE, CONTACT, dateDeVerification, EDITEUR } from "@/lib/site/editeur";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal.confidentialite");

  return { title: t("titre") };
}

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
 * **La mesure d'audience a sa propre rubrique depuis le 04/09/2026**, parce que
 * la page disait « aucun cookie de mesure d'audience » et que cette phrase, seule,
 * se lit comme « aucune mesure ». Elle reste vraie — la mesure de Vercel ne dépose
 * rien et ne recoupe rien d'un site à l'autre, et c'est ce qui dispense de
 * bandeau —, mais une vérité qui laisse croire autre chose ne vaut pas mieux
 * qu'une omission. Ce qui remonte est donc écrit, ligne par ligne.
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
type Espace = Messages["legal"]["confidentialite"];
type Cle = MessageKeys<Espace, NestedKeyOf<Espace>>;

type Rubrique = { titre: Cle; corps: Cle[]; couples?: { terme: Cle; valeur: Cle }[] };

const RUBRIQUES: Rubrique[] = [
  { titre: "responsable.titre", corps: ["responsable.p1", "responsable.p2"] },
  {
    titre: "collecte.titre",
    corps: [
      "collecte.p1",
      "collecte.p2",
      "collecte.p3",
      "collecte.p4",
      "collecte.p5",
      "collecte.p6",
    ],
  },
  {
    titre: "cookies.titre",
    corps: ["cookies.p1", "cookies.p2", "cookies.p3", "cookies.p4", "cookies.p5", "cookies.p6"],
  },
  { titre: "audience.titre", corps: ["audience.p1", "audience.p2", "audience.p3"] },
  {
    titre: "sousTraitants.titre",
    corps: [
      "sousTraitants.p1",
      "sousTraitants.p2",
      "sousTraitants.p3",
      "sousTraitants.p4",
      "sousTraitants.p5",
      "sousTraitants.p6",
      "sousTraitants.p7",
    ],
  },
  { titre: "transferts.titre", corps: ["transferts.p1", "transferts.p2", "transferts.p3"] },
  { titre: "duree.titre", corps: ["duree.p1", "duree.p2", "duree.p3", "duree.p4"] },
  {
    titre: "bases.titre",
    corps: ["bases.p1", "bases.p2"],
    couples: [
      { terme: "bases.compte", valeur: "bases.contrat" },
      { terme: "bases.depots", valeur: "bases.contrat" },
      { terme: "bases.revisions", valeur: "bases.contrat" },
      { terme: "bases.connexion", valeur: "bases.contrat" },
      { terme: "bases.rappel", valeur: "bases.contrat" },
      { terme: "bases.serie", valeur: "bases.interetLegitime" },
      { terme: "bases.plafonds", valeur: "bases.interetLegitime" },
      { terme: "bases.abus", valeur: "bases.interetLegitime" },
      { terme: "bases.signalements", valeur: "bases.interetLegitime" },
      { terme: "bases.usage", valeur: "bases.interetLegitime" },
    ],
  },
  { titre: "droits.titre", corps: ["droits.p1", "droits.p2", "droits.p3", "droits.p4"] },
  { titre: "autorite.titre", corps: ["autorite.p1", "autorite.p2"] },
];

export default async function PageConfidentialite() {
  const t = await getTranslations("legal.confidentialite");
  const langue = await langueDeLaRequete();
  const valeurs = {
    nom: EDITEUR.nom,
    mentionEI: EDITEUR.mentionEI,
    adresse: EDITEUR.adresse,
    siren: EDITEUR.siren,
    email: CONTACT.email,
    verifieLe: dateDeVerification(ETIQUETTE_INTL[langue]),
    autorite: AUTORITE.nom,
    autoriteAdresse: AUTORITE.adresse,
    autoriteTelephone: AUTORITE.telephone,
    autoriteSite: AUTORITE.site,
  };
  const dire = (cle: Cle) => t(cle, valeurs);

  return (
    <PageLegale
      titre={t("titre")}
      chapeau={t("chapeau")}
      rubriques={RUBRIQUES.map(({ titre, corps, couples }) => ({
        titre: dire(titre),
        corps: corps.map(dire),
        couples: couples?.map(({ terme, valeur }) => ({
          terme: dire(terme),
          valeur: dire(valeur),
        })),
      }))}
      misAJour={t("misAJour", valeurs)}
    />
  );
}
