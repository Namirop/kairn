"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { EtapeDeLAttente } from "@/lib/domain/catalogue-dattente";
import { phraseDattente, RELEVE_MS } from "@/lib/domain/phrases-dattente";
import { useLangue } from "@/lib/i18n/use-langue";
import { cn } from "@/lib/fusion-des-classes";

/**
 * La voix des deux attentes de l'essai : une phrase qui change à chaque relève
 * et dont le ton descend avec le temps. Catalogue et paliers :
 * `lib/domain/phrases-dattente.ts`.
 */

/**
 * La phrase du moment. Le temps compté est celui passé devant l'écran, pas celui
 * du serveur : après un rechargement, le ton repart du début. Le tirage, fixé au
 * montage, varie la séquence d'un dépôt à l'autre. Le minuteur bat à la relève,
 * jamais plus vite, pour qu'un changement de palier ne remplace pas une phrase
 * une seconde après son apparition.
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
 * La phrase, dans une place réservée (deux lignes sur téléphone, une au-delà)
 * pour ne pas pousser ce qui suit. Le fondu vient du remontage par la clé.
 *
 * Masquée aux lecteurs d'écran : relue à chaque relève, elle harcèlerait. À
 * l'écran qui la porte d'annoncer une fois ce qu'il faut savoir.
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
