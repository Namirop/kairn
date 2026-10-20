import type { Messages } from "../../fr";

/** L'éditeur reste français : les mentions gardent leur intitulé d'origine, les faits ne changent pas. */
export const mentionsLegales: Messages["legal"]["mentionsLegales"] = {
  titre: "Legal notice",
  chapeau: "Who publishes Kairn, where the service is hosted, and who to contact.",
  misAJour: "Hosting and processor information last checked: {verifieLe}.",
  editeur: {
    titre: "Publisher of the service",
    p1: "{nom} — sole proprietor (entrepreneur individuel, EI).",
    p2: "Sole proprietor under the French micro-enterprise scheme (régime de la micro-entreprise).",
    p3: "Registered address: {adresse}.",
    p4: "SIREN: {siren}.",
    p5: "VAT not applicable, article 293 B of the French General Tax Code (Code général des impôts).",
    p6: "Contact: {email} — {telephone}.",
  },
  directeur: {
    titre: "Publication director",
    p1: "{nom}, reachable at {email}.",
  },
  hebergement: {
    titre: "Hosting",
    p1: "The application is hosted by Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, United States, reachable at legalnotices@vercel.com. Vercel does not publish a phone number. Server functions run from a European region.",
    p2: "The database is operated by Neon, LLC, a company of the Databricks, Inc. group, 160 Spear Street, Suite 1300, San Francisco, CA 94105, United States. The infrastructure it runs on is located in Frankfurt, Germany.",
    p3: "Transactional emails are delivered by Plus Five Five, Inc. (Resend), 2261 Market Street #5039, San Francisco, CA 94114, United States.",
  },
  traitement: {
    titre: "Processing of what you drop in",
    p1: "The text and images you drop in are sent to OpenRouter, Inc. — 169 Madison Avenue, New York, NY 10016, United States — to be broken into concepts and turned into questions. OpenRouter uses OpenAI, L.L.C. — 1455 Third Street, San Francisco, CA 94158, United States — as a sub-processor to run the models. This processing is the service itself: without it, the application does nothing.",
    p2: "If OpenRouter is unavailable, processing automatically switches to Anthropic Ireland, Limited — 6th Floor, South Bank House, Barrow Street, Dublin 4, D04 TR29, Ireland — under the same rules.",
  },
  propriete: {
    titre: "Intellectual property",
    p1: "Kairn's source code, the name “Kairn”, the logo, the visual identity and all the elements that make up the service are the property of {nom} and are protected by copyright. Any reproduction or representation, in whole or in part, without prior written permission is prohibited.",
    p2: "What you drop in remains yours. Kairn acquires no rights over it, except those strictly necessary to process it in order to provide you the service: breaking it into concepts, producing questions from it and asking them again.",
    p3: "It is not reused for any other purpose, not transferred to third parties, and not used to train a model. That last point is not an intention but a clause: the OpenRouter account is set to prohibit training on our data on the routed models' side, and the commercial terms of Anthropic (the fallback processor) prohibit training on their customers' content.",
  },
  signaler: {
    titre: "Report content or a problem",
    p1: "Write to {email}. We acknowledge every report within five business days and follow up as soon as possible.",
    p2: "Drops are private and are never published: Kairn is not a platform for public content. This channel exists for faulty questions and service problems, and it backs up the report option found under every question.",
  },
};
