import Link from "next/link";
import { CairnRenversable } from "@/components/cairn/cairn-renversable";
import { Panneau } from "@/components/coquille/panneau";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/auth/routes";

/**
 * L'ouverture. Le titre porte la composition à lui seul : pas de dégradé, pas
 * de halo, pas d'illustration pour compenser. L'empilement de pierres à côté
 * est l'élément signature, et il est le même que celui du tableau de bord.
 *
 * Il est posé dans un cartouche d'ombre plutôt que de flotter sur le fond : sur
 * un écran large, le cairn seul au milieu du vide était exactement le défaut
 * qu'on corrige — une colonne à gauche, un désert à droite.
 */
export function Hero() {
  return (
    <Panneau
      surface="papier"
      aere
      className="gap-pas-12 grid items-center md:grid-cols-[1.4fr_1fr]"
    >
      <div>
        <h1 className="font-display text-h1-site leading-[0.95] font-bold tracking-[-0.03em] text-balance">
          Tu lis beaucoup.
          <br />
          Tu retiens peu.
        </h1>

        <p className="mt-pas-6 max-w-md text-stone-500">
          Un article, une réponse qu&apos;on t&apos;a donnée, une page de manuel, ce qu&apos;un
          collègue vient de t&apos;expliquer. Kairn le découpe en concepts et te les repose juste
          avant que tu les oublies.
        </p>

        <div className="mt-pas-8 gap-pas-3 flex flex-col sm:flex-row">
          <Button asChild size="lg">
            <Link href={ROUTES.inscription}>Créer un compte</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href={ROUTES.connexion}>Se connecter</Link>
          </Button>
        </div>
      </div>

      <div className="bg-surface-ombre rounded-carte p-pas-8 flex justify-center">
        <div className="h-64 w-40 md:h-80 md:w-full">
          <CairnRenversable nombre={7} />
        </div>
      </div>
    </Panneau>
  );
}
