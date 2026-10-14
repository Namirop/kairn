// i18n-ignore-fichier — outil de l'administrateur, qui reste en français.
import { Mesure, Section } from "@/components/administration/section";
import { nombre } from "@/components/administration/formats";
import type { BlocComptes as Chiffres } from "@/lib/db/administration";

/**
 * Qui a un compte, et qui s'en sert, côte à côte : l'écart entre inscriptions
 * et comptes actifs est le signal le plus précoce. Le total et les actifs sur
 * sept jours sont dans le bandeau, pas ici.
 */
export function BlocComptes({ chiffres }: { chiffres: Chiffres }) {
  return (
    <Section
      intitule="Comptes et activité"
      contexte="Est actif un compte qui a fait au moins un passage dans la fenêtre — ouvrir l'écran ne compte pas."
    >
      <dl>
        <Mesure intitule="Inscriptions sur 7 jours" valeur={nombre(chiffres.nouveaux7j)} />
        <Mesure intitule="Inscriptions sur 30 jours" valeur={nombre(chiffres.nouveaux30j)} />
        <Mesure intitule="Actifs sur 30 jours" valeur={nombre(chiffres.actifs30j)} />
        <Mesure intitule="Séries en cours" valeur={nombre(chiffres.seriesEnCours)} />
        <Mesure
          intitule="Plus longue série en cours"
          valeur={nombre(chiffres.plusLongueSerieEnCours)}
        />
      </dl>
    </Section>
  );
}
