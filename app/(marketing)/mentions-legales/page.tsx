import type { Metadata } from "next";
import type { MessageKeys, NestedKeyOf } from "next-intl";
import { getTranslations } from "next-intl/server";
import { PageLegale } from "@/components/site/page-legale";
import { langueDeLaRequete } from "@/lib/i18n/langue-de-la-requete";
import { ETIQUETTE_INTL } from "@/lib/i18n/langues";
import type { Messages } from "@/lib/i18n/messages";
import { CONTACT, dateDeVerification, EDITEUR } from "@/lib/site/editeur";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal.mentionsLegales");

  return { title: t("titre") };
}

/**
 * Les sous-traitants se citent d'après leurs propres documents juridiques, pas
 * d'un annuaire : les agrégateurs se trompent, et ici une erreur engage.
 */
type Espace = Messages["legal"]["mentionsLegales"];
type Cle = MessageKeys<Espace, NestedKeyOf<Espace>>;

const RUBRIQUES: { titre: Cle; corps: Cle[] }[] = [
  {
    titre: "editeur.titre",
    corps: ["editeur.p1", "editeur.p2", "editeur.p3", "editeur.p4", "editeur.p5", "editeur.p6"],
  },
  { titre: "directeur.titre", corps: ["directeur.p1"] },
  { titre: "hebergement.titre", corps: ["hebergement.p1", "hebergement.p2", "hebergement.p3"] },
  { titre: "traitement.titre", corps: ["traitement.p1", "traitement.p2"] },
  { titre: "propriete.titre", corps: ["propriete.p1", "propriete.p2", "propriete.p3"] },
  { titre: "signaler.titre", corps: ["signaler.p1", "signaler.p2"] },
];

export default async function PageMentionsLegales() {
  const t = await getTranslations("legal.mentionsLegales");
  const langue = await langueDeLaRequete();
  const valeurs = {
    nom: EDITEUR.nom,
    mentionEI: EDITEUR.mentionEI,
    statut: EDITEUR.statut,
    adresse: EDITEUR.adresse,
    siren: EDITEUR.siren,
    tva: EDITEUR.tva,
    telephone: EDITEUR.telephone,
    email: CONTACT.email,
    verifieLe: dateDeVerification(ETIQUETTE_INTL[langue]),
  };
  const dire = (cle: Cle) => t(cle, valeurs);

  return (
    <PageLegale
      titre={t("titre")}
      chapeau={t("chapeau")}
      rubriques={RUBRIQUES.map(({ titre, corps }) => ({
        titre: dire(titre),
        corps: corps.map(dire),
      }))}
      misAJour={t("misAJour", valeurs)}
    />
  );
}
