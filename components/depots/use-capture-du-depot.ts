"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { reprendreLePartage } from "@/components/depots/partage-recu";
import { reduireLaCapture } from "@/lib/images/reduire-la-capture";

/**
 * Un partage rangé par le service worker est repris au montage sans partir seul :
 * on relit avant de déposer. Toute capture est réduite avant d'entrer dans
 * l'état : le refus de poids et l'envoi ne voient que l'image qui part.
 */
export function useCaptureDuDepot({
  setTexte,
  setLienSeul,
}: {
  setTexte: Dispatch<SetStateAction<string>>;
  setLienSeul: Dispatch<SetStateAction<boolean>>;
}): {
  capture: File | null;
  preparation: boolean;
  choisirLaCapture: (fichier: File | null) => Promise<void>;
} {
  const [capture, setCapture] = useState<File | null>(null);
  const [preparation, setPreparation] = useState(false);

  // La réduction prend du temps : sans rang, une première capture pourrait
  // s'installer après la seconde. Une réduction dépassée est jetée.
  const rang = useRef(0);

  const choisirLaCapture = useCallback(async (fichier: File | null) => {
    const moi = (rang.current += 1);

    if (!fichier) {
      setCapture(null);
      setPreparation(false);
      return;
    }

    setPreparation(true);

    const reduite = await reduireLaCapture(fichier);

    if (rang.current !== moi) return;

    setCapture(reduite);
    setPreparation(false);
  }, []);

  // Lu une fois, puis effacé de l'appareil.
  useEffect(() => {
    let monte = true;

    void reprendreLePartage().then((partage) => {
      if (!monte || !partage) return;

      setTexte(partage.texte);
      setLienSeul(partage.lienSeul);
      void choisirLaCapture(partage.capture);
    });

    return () => {
      monte = false;
    };
  }, [choisirLaCapture, setTexte, setLienSeul]);

  return { capture, preparation, choisirLaCapture };
}
