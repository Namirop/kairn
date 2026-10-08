import type { Messages } from "../../fr";

/**
 * La version anglaise dit les mêmes engagements, ni plus ni moins. Les mentions
 * de droit français (« entrepreneur individuel », la CNIL) gardent leur nom
 * d'origine à côté de leur traduction : c'est sous ce nom qu'elles existent.
 */
export const confidentialite: Messages["legal"]["confidentialite"] = {
  titre: "Privacy",
  chapeau:
    "What Kairn collects, who it's shared with, how long it's kept, and how to get it all back or erase it all.",
  misAJour: "Processors' commitments last checked: {verifieLe}.",
  responsable: {
    titre: "Data controller",
    p1: "{nom} — sole proprietor (entrepreneur individuel, EI), {adresse}, SIREN {siren}.",
    p2: "For any question or request about your data: {email}.",
  },
  collecte: {
    titre: "What is collected",
    p1: "Your email address and your name, to run your account and send you the reminders you agreed to.",
    p2: "Your time zone, detected by your browser. It's used for exactly two things: knowing what day it is where you are, and what time to write to you.",
    p3: "What you drop in — text and screenshots — along with the concepts, questions and reviews that come from it.",
    p4: "Usage counters: number of drops and concepts in your current period, number of reviews, current streak. They're used for the service's limits and for your progress.",
    p5: "Screenshots are deleted as soon as their text has been extracted. There is no route that serves them, and they don't survive a failed read either.",
    p6: "A fingerprint of your IP address, if you try the service without an account from the home page. It's a salted fingerprint, never the address itself: it's used to count how many trials come from the same place, and for nothing else. It's still personal data — hashing pseudonymizes, it doesn't anonymize — and it disappears with the visit, after seven days.",
  },
  cookies: {
    titre: "Cookies",
    p1: "Two cookies, both strictly necessary for the service: so there's no banner to accept, and nothing you could refuse without breaking how it works.",
    p2: "The session cookies, prefixed “better-auth.”, keep you signed in. One month, renewed on every visit.",
    p3: "“kairn_visite” remembers the trial you do without an account, long enough for you to recover it by creating an account. Seven days, the same lifetime as what it points to.",
    p4: "No advertising trackers, no audience measurement cookies, no sharing with third parties beyond the technical processors listed below.",
    p5: "There is audience measurement — how many visits, on which pages, from which country — but it sets no cookie and doesn't follow you from one site to another. It's described just below.",
    p6: "What you drop in never appears in the server logs: they carry only identifiers.",
  },
  audience: {
    titre: "Audience measurement",
    p1: "Knowing how many people come by and which pages they stop on is what tells us what to fix. It's done without cookies and without a profile: Vercel's measurement stores nothing on your device and builds no identifier that follows you from one site to another.",
    p2: "What gets reported: the page visited, the page you came from, the country, the type of device and browser. Nothing you drop in, nothing from your account, no IP address kept — it's used to derive a visit number that changes every day, then discarded.",
    p3: "That's why there's no banner: with no cookie, no persistent identifier and no cross-site matching, there's nothing to ask you to accept.",
  },
  sousTraitants: {
    titre: "Processors",
    p1: "OpenRouter, Inc. (New York, United States) breaks drops into concepts and writes the questions. What you drop in is sent to it for this processing, which is the service itself. OpenRouter relies on a sub-processor, OpenAI, L.L.C. (San Francisco, United States), which actually runs the models.",
    p2: "We have turned off, on our OpenRouter account, every option that would allow training on the data sent. OpenRouter doesn't keep the content of requests, only technical metadata (timestamp, model, token volume). OpenAI, as a sub-processor, keeps data for up to 30 days for abuse monitoring, then deletes it.",
    p3: "Anthropic Ireland, Limited (Dublin, Ireland), for the same processing, as an automatic fallback when OpenRouter is unavailable. Its commercial terms prohibit training models on its customers' content, and its call logs are deleted within thirty days.",
    p4: "Neon, LLC — a company of the Databricks, Inc. group — for hosting the database, on infrastructure located in Frankfurt, Germany.",
    p5: "Vercel Inc., for hosting the application, running in a European region, and for the audience measurement described above.",
    p6: "Plus Five Five, Inc. (Resend), for delivering emails.",
    p7: "Their contractual commitments were reviewed on {verifieLe}. This check is redone once a year.",
  },
  transferts: {
    titre: "Transfers outside the European Union",
    p1: "There are some, and it's better to say so plainly. The database is in Frankfurt and the application runs in Europe, but the companies that operate them are American, and what you drop in is processed outside the Union — by OpenRouter and its sub-processor OpenAI, with Anthropic in Ireland as the fallback.",
    p2: "Databricks (for Neon), Vercel and Resend are certified under the EU–U.S. Data Privacy Framework, and additionally rely on the European Commission's standard contractual clauses.",
    p3: "OpenRouter and Anthropic are not certified under this framework: their transfers rest on standard contractual clauses alone. OpenRouter is the processor that receives what you drop in (and passes it to OpenAI as a sub-processor), Anthropic receives it as the fallback — these are the two points to know if standard contractual clauses alone don't satisfy you.",
  },
  duree: {
    titre: "How long",
    p1: "Your data is kept as long as your account exists. You can delete it at any time from Settings: the account, your drops, your concepts, their questions and all your reviews are erased immediately.",
    p2: "A trial done without an account, and that nobody claimed by creating an account, is erased after seven days along with everything that came from it.",
    p3: "The database history allows a restore up to six hours back. A deletion therefore takes effect immediately in the service, and is final six hours later at most.",
    p4: "Two traces remain, detached from you and with nothing that identifies you: the accounting of model calls, because money already spent can't be erased, and reports of faulty questions, which carry the text of a question to fix and not your identity.",
  },
  bases: {
    titre: "Legal bases",
    p1: "Each purpose rests on one basis, and only one.",
    p2: "The daily reminder is on from the moment the account is created, and that's deliberate: bringing back what you dropped in at the right moment is the service itself, not a communication added on top of it. It turns off in one click, from Settings or from the link in every email.",
    contrat: "Contract",
    interetLegitime: "Legitimate interest",
    compte: "Creating and managing your account, signing you in",
    depots: "Receiving your drops, breaking them into concepts, producing the questions",
    revisions: "Scheduling your reviews and recording your answers",
    connexion: "Sending you sign-in and confirmation emails",
    rappel: "Sending you the daily review reminder",
    serie: "Sending you the evening streak alert",
    plafonds: "Counting your drops and concepts to apply the limits",
    abus: "Limiting abuse and automated drops",
    signalements: "Handling your reports on questions",
    usage: "Measuring overall use of the service",
  },
  droits: {
    titre: "Your rights",
    p1: "You can take your data with you at any time from Settings: a file containing your drops, your concepts, their questions, your reviews and your progress.",
    p2: "You can delete your account from the same screen, without having to write to anyone.",
    p3: "You can turn off emails in one click, from Settings or from the link in each of them. Once they're off, nothing is sent except the sign-in code — without it, no one could get into their account anymore.",
    p4: "You also have the right to rectification, to object and to restriction. For those, write to {email}, or by post to {nom}, {adresse}. Post is the way to go if you need to enclose proof of identity.",
  },
  autorite: {
    titre: "Supervisory authority",
    p1: "If you believe the processing of your data is not compliant, you can lodge a complaint with the French data protection authority, the Commission nationale de l'informatique et des libertés (CNIL).",
    p2: "{autoriteAdresse} — {autoriteTelephone} — {autoriteSite}",
  },
};
