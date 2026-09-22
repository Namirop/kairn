"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { phraseDattente, RELEVE_MS } from "@/lib/domain/phrases-dattente";
import { cn } from "@/lib/utils";

/**
 * La voix de l'attente : une phrase qui change toutes les trois secondes et
 * demie, et dont le ton descend avec le temps.
 *
 * C'est ce qui a remplacé le jeu d'empilement dans l'essai de la landing. Le jeu
 * demandait au visiteur de faire l'effort à la place du produit, au moment
 * précis où le produit doit faire ses preuves, et il coûtait un panneau latéral.
 * Une phrase ne demande rien, se lit sans effort, et prouve la même chose —
 * qu'il y a quelqu'un derrière.
 *
 * **Elle sert aux deux attentes de l'essai**, et c'est pour ça qu'elle vit dans
 * son propre fichier : le découpage dure six secondes de médiane, l'écriture des
 * questions une vingtaine, et ce sont deux écrans différents qui les rendent.
 * Le catalogue et les paliers sont dans `phrases-dattente.ts`.
 */

/**
 * La phrase du moment, et le temps qu'il faut pour la faire tourner.
 *
 * Le temps compté est celui **passé devant cet écran**, et non celui du travail
 * côté serveur : le compteur repart de zéro à chaque montage. Quelqu'un qui
 * recharge la page sur une extraction déjà vieille d'une minute vient, lui,
 * d'arriver — et lui servir d'emblée « on ne promet plus de date » n'aurait
 * aucun sens.
 *
 * Le tirage est fixé une fois pour toutes au montage, comme l'invite du champ :
 * deux dépôts de même durée ne racontent pas la même séquence.
 *
 * Le minuteur bat à la relève exactement, jamais plus vite. C'est ce qui fait
 * qu'une phrase n'est jamais remplacée une seconde après être apparue quand le
 * temps franchit une borne de palier — le changement de ton attend la relève
 * suivante, et le clignotement n'existe pas.
 */
export function usePhraseQuiTourne(): string {
  const [tirage] = useState(() => Math.random());
  const [ecoule, setEcoule] = useState(0);

  useEffect(() => {
    const battement = setInterval(() => setEcoule((passe) => passe + RELEVE_MS), RELEVE_MS);

    return () => clearInterval(battement);
  }, []);

  return phraseDattente(ecoule, tirage);
}

/**
 * La phrase, dans une place qui ne bouge pas.
 *
 * Deux lignes réservées sur téléphone, une sur écran large : sans ça, une phrase
 * qui passe de une à deux lignes pousse vers le bas ce qui la suit au milieu
 * d'une attente, ce qui se lit comme un défaut d'affichage.
 *
 * Le fondu vient du remontage — la clé change avec la phrase —, donc il n'y a ni
 * `AnimatePresence`, ni position absolue, ni trou entre deux phrases. Sous
 * `prefers-reduced-motion`, la phrase se remplace sans transition : un
 * changement de texte toutes les trois secondes et demie est déjà un mouvement,
 * et l'adoucir n'en fait pas une animation qu'on a demandée.
 *
 * **Elle est masquée aux lecteurs d'écran.** Une ligne qui change toutes les
 * trois secondes dans une région `aria-live` se ferait lire à voix haute toutes
 * les trois secondes : on transformerait une attente en harcèlement. C'est à
 * l'écran qui la porte d'annoncer, une fois, ce qu'il y a à savoir.
 */
export function PhraseQuiTourne({ phrase, className }: { phrase: string; className?: string }) {
  const immobile = useReducedMotion() ?? false;
  const place = cn("text-h2-app min-h-[3.5rem] max-w-xl md:min-h-[2rem]", className);

  if (immobile) {
    return (
      <p className={place} aria-hidden>
        {phrase}
      </p>
    );
  }

  return (
    <motion.p
      key={phrase}
      className={place}
      aria-hidden
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {phrase}
    </motion.p>
  );
}
