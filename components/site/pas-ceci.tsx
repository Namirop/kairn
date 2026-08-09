import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/auth/routes";

/**
 * Dire ce que le produit n'est pas vaut mieux qu'une liste de fonctionnalités :
 * c'est ce qui permet à quelqu'un de décider en dix secondes que ce n'est pas
 * pour lui, et de partir sans rancune.
 */
export function PasCeci() {
  return (
    <section className="py-pas-16 md:py-pas-24 border-t border-stone-100">
      <div className="gap-pas-8 md:gap-pas-16 grid md:grid-cols-[1fr_1.2fr]">
        <h2 className="font-display text-h2-site leading-[1] font-bold tracking-[-0.02em]">
          Ce que ce n&apos;est pas.
        </h2>

        <div className="max-w-xl text-stone-500">
          <p>
            Ce n&apos;est pas une application de fiches à écrire soi-même : personne ne tient un jeu
            de cartes plus de trois semaines. Ce n&apos;est pas un outil de prise de notes — tu en
            as déjà un, et ce n&apos;est pas là que le savoir se fixe. Ce n&apos;est pas un
            assistant à qui parler.
          </p>
          <p className="mt-pas-4">
            C&apos;est une seule chose : ce que tu as lu revient au bon moment, jusqu&apos;à ce que
            ce soit à toi.
          </p>

          <Button asChild size="lg" className="mt-pas-8">
            <Link href={ROUTES.inscription}>Créer un compte</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
