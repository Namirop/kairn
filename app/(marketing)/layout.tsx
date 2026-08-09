import Link from "next/link";
import { Marque } from "@/components/coquille/marque";
import { ROUTES } from "@/lib/auth/routes";

export default function CoquilleSite({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="px-pas-4 md:px-pas-8 mx-auto flex h-16 w-full max-w-5xl items-center justify-between">
        <Link href={ROUTES.accueil} className="rounded-xs">
          <Marque />
        </Link>
        <Link
          href={ROUTES.connexion}
          className="text-petit rounded-xs text-stone-500 underline decoration-stone-300 underline-offset-4 transition-colors hover:text-stone-900"
        >
          Se connecter
        </Link>
      </header>

      <main className="px-pas-4 md:px-pas-8 mx-auto w-full max-w-5xl">{children}</main>

      <footer className="px-pas-4 py-pas-8 md:px-pas-8 mx-auto w-full max-w-5xl border-t border-stone-100">
        <p className="text-mono text-stone-500">
          Cairn — un cairn balise un sentier, une pierre à la fois.
        </p>
      </footer>
    </div>
  );
}
