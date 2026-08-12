import Link from "next/link";
import { CairnRenversable } from "@/components/cairn/cairn-renversable";
import { Panneau } from "@/components/coquille/panneau";
import { EssaiDeDepot } from "@/components/site/essai-de-depot";
import { ROUTES } from "@/lib/auth/routes";

/**
 * L'ouverture. Le titre porte la composition à lui seul : pas de dégradé, pas
 * de halo, pas d'illustration pour compenser. L'empilement de pierres à côté
 * est l'élément signature, et il est le même que celui du tableau de bord.
 *
 * Il n'a plus de cartouche. Le cadre d'ombre tenait la colonne de droite, mais
 * il enfermait aussi ce qui doit pouvoir en sortir : les pierres traversent
 * maintenant la composition quand on coupe l'empilement. C'est la taille du
 * cairn qui occupe la colonne désormais — il monte à toute la hauteur du
 * panneau plutôt que de flotter au milieu d'un rectangle.
 */
export function Hero({ invite }: { invite: string }) {
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

        {/* Le champ, et pas un bouton vers une inscription : c'est le
            découpage qui convainc, et le montrer coûte une extraction. Demander
            un compte avant d'avoir rien montré était la friction la plus chère
            du produit. */}
        <div className="mt-pas-8">
          <EssaiDeDepot invite={invite} />
        </div>

        <p className="mt-pas-6 text-petit text-stone-500">
          Déjà un compte ?{" "}
          <Link
            href={ROUTES.connexion}
            className="rounded-xs text-stone-900 underline decoration-stone-300 underline-offset-4 hover:decoration-stone-900"
          >
            Se connecter
          </Link>
        </p>
      </div>

      <div className="flex justify-center">
        <div className="h-72 w-44 md:h-[30rem] md:w-full">
          <CairnRenversable nombre={7} />
        </div>
      </div>
    </Panneau>
  );
}
