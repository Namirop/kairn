"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { EtapeDeLAttente } from "@/lib/domain/catalogue-dattente";
import { phraseDattente, RELEVE_MS } from "@/lib/domain/phrases-dattente";
import { useLangue } from "@/lib/i18n/use-langue";
import { cn } from "@/lib/utils";

/**
 * La voix de l'attente : une phrase qui change à chaque relève (`RELEVE_MS`), et
 * dont le ton descend avec le temps. Elle sert aux deux attentes de l'essai, le
 * découpage et l'écriture des questions. Le catalogue et les paliers sont dans
 * `lib/domain/phrases-dattente.ts`.
 */

/**
 * La phrase du moment.
 *
 * Le temps compté est celui passé devant cet écran, pas celui du travail côté
 * serveur : après un rechargement, on vient d'arriver, et le ton repart du
 * début.
 *
 * Le tirage est fixé au montage : deux dépôts de même durée ne racontent pas la
 * même séquence. Le minuteur bat à la relève exactement, jamais plus vite : un
 * changement de palier attend la relève suivante, sans quoi une phrase pourrait
 * être remplacée une seconde après être apparue.
 */
export function usePhraseQuiTourne(etape: EtapeDeLAttente): string {
  const langue = useLangue();
  const [tirage] = useState(() => Math.random());
  const [ecoule, setEcoule] = useState(0);

  useEffect(() => {
    const battement = setInterval(() => setEcoule((passe) => passe + RELEVE_MS), RELEVE_MS);

    return () => clearInterval(battement);
  }, []);

  return phraseDattente(etape, ecoule, tirage, langue);
}

/**
 * La phrase, dans une place qui ne bouge pas.
 *
 * Deux lignes réservées sur téléphone, une sur écran large : une phrase qui
 * passe de une à deux lignes ne pousse pas ce qui la suit.
 *
 * Le fondu vient du remontage (la clé change avec la phrase) : ni
 * `AnimatePresence` ni position absolue. Sous `prefers-reduced-motion`, la
 * phrase se remplace sans transition.
 *
 * Elle est masquée aux lecteurs d'écran : lue à chaque relève, elle deviendrait
 * du harcèlement. C'est à l'écran qui la porte d'annoncer, une fois, ce qu'il y
 * a à savoir.
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
