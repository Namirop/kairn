import type { ReactNode } from "react";

/**
 * Les champs d'un réglage surchargeable.
 *
 * Chacun montre la valeur d'environnement à côté du sien, et c'est ce qui rend
 * le champ vide lisible : sans elle, « vide » ne dit pas quelle valeur
 * s'applique, seulement qu'on n'en a pas posé.
 */

const CHAMP =
  "rounded-champ border border-stone-300 bg-surface-papier px-pas-3 py-pas-1 text-petit font-mono tabular-nums";

function Rangee({
  intitule,
  environnement,
  children,
}: {
  intitule: string;
  environnement?: string;
  children: ReactNode;
}) {
  return (
    <label className="gap-pas-4 pb-pas-3 flex flex-wrap items-center justify-between border-b border-stone-300">
      <span className="text-petit">
        {intitule}
        <span className="text-mono ml-pas-2 font-mono text-stone-500">
          env : {environnement ?? "—"}
        </span>
      </span>
      {children}
    </label>
  );
}

export function Interrupteur({
  nom,
  intitule,
  defaut,
  environnement,
  actif,
  coupe,
}: {
  nom: string;
  intitule: string;
  defaut: boolean | null;
  environnement?: string;
  actif: string;
  coupe: string;
}) {
  return (
    <Rangee intitule={intitule} environnement={environnement}>
      <select name={nom} defaultValue={defaut === null ? "" : String(defaut)} className={CHAMP}>
        <option value="">valeur d&apos;environnement</option>
        <option value="true">{actif}</option>
        <option value="false">{coupe}</option>
      </select>
    </Rangee>
  );
}

export function Champ({
  nom,
  intitule,
  defaut,
  environnement,
  texte = false,
}: {
  nom: string;
  intitule: string;
  defaut: number | string | null;
  environnement?: string;
  texte?: boolean;
}) {
  return (
    <Rangee intitule={intitule} environnement={environnement}>
      <input
        name={nom}
        type={texte ? "text" : "number"}
        min={texte ? undefined : 1}
        defaultValue={defaut === null ? "" : String(defaut)}
        placeholder="valeur d'environnement"
        className={`${CHAMP} w-56`}
      />
    </Rangee>
  );
}
