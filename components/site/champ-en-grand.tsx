"use client";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

/**
 * Le champ de dépôt, en grand.
 *
 * **Le champ de la bande a une hauteur fixe, et c'est un choix qu'on garde.**
 * S'il grandissait avec son contenu, coller un article pousserait le bouton hors
 * de l'écran et la page entière se réorganiserait à chaque paragraphe. Mais la
 * conséquence est qu'un long dépôt ne se relit pas : on en voit quatre lignes
 * par une meurtrière, et c'est le seul endroit du site où l'on écrit vraiment.
 *
 * D'où cette fenêtre : la **même** zone, posée au milieu de l'écran, assez haute
 * pour qu'un texte collé se relise d'un coup d'œil. Elle ne duplique pas l'état —
 * les deux champs lisent et écrivent la même valeur —, donc fermer ne valide rien
 * et n'annule rien. Il n'y a rien à perdre en l'ouvrant, et c'est ce qui permet
 * de n'y mettre aucun bouton de confirmation.
 *
 * **Le champ de la bande reste monté pendant ce temps.** C'est lui qui porte le
 * `name` du formulaire ; la fenêtre vit dans un portail, hors du `form`, et rien
 * de ce qu'elle contient ne part à l'envoi. Deux champs, une valeur, un seul qui
 * compte au moment d'envoyer.
 *
 * **Elle s'ouvre sur le début du texte, et le curseur y reste.** C'est Radix qui
 * donne le focus au premier élément tabulable — la zone elle-même —, et on ne le
 * déplace pas : on vient de demander à **voir** ce qu'on a déposé, pas à écrire
 * la suite. Un curseur envoyé en fin de texte ferait défiler la zone jusqu'au
 * dernier mot au moment même où l'on cherche à relire le premier.
 */
export function ChampEnGrand({
  ouvert,
  surFermeture,
  invite,
  texte,
  surTexte,
}: {
  ouvert: boolean;
  surFermeture: () => void;
  invite: string;
  texte: string;
  surTexte: (valeur: string) => void;
}) {
  return (
    <Dialog
      open={ouvert}
      onOpenChange={(reste) => {
        if (!reste) surFermeture();
      }}
    >
      <DialogContent className="gap-pas-3 max-w-3xl">
        <DialogTitle className="text-mono pr-pas-8 font-mono tracking-[0.14em] text-stone-500 uppercase">
          Ce que tu veux retenir
        </DialogTitle>

        <DialogDescription className="sr-only">
          La même zone de dépôt, en plus grand. Ce que tu écris ici se retrouve dans le formulaire.
        </DialogDescription>

        {/* Le creux de la bande, aux mêmes mesures : c'est la même zone, et elle
            doit se reconnaître. Seule la hauteur change, puisque c'est la seule
            chose qu'on est venu chercher. */}
        <div className="rounded-t-champ bg-surface-ombre p-pas-4 md:p-pas-6 focus-within:border-accent-profond border-b-2 border-stone-300 transition-colors">
          <textarea
            id="essai-en-grand"
            value={texte}
            onChange={(evenement) => surTexte(evenement.target.value)}
            placeholder={invite}
            className="text-enonce ascenseur-discret h-[clamp(16rem,52svh,34rem)] w-full resize-none overflow-y-auto border-0 bg-transparent leading-[1.35] text-stone-900 outline-none placeholder:text-stone-500 focus-visible:outline-none"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
