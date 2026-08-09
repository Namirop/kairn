import { Hero } from "@/components/site/hero";
import { PasCeci } from "@/components/site/pas-ceci";
import { Sentier } from "@/components/site/sentier";

export default function PageAccueil() {
  return (
    <>
      <Hero />
      <Sentier />
      <PasCeci />
    </>
  );
}
