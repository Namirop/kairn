import type { Langue } from "@/lib/db/types";

/**
 * Les consignes restent en français, où chaque règle a été mesurée ; seuls
 * varient les passages qui nomment la langue, sans condition, car laisser le
 * modèle la choisir le faisait se tromper.
 *
 * Les passages français ne bougent pas d'un octet : leur empreinte porte le cache
 * du fournisseur et la traçabilité des questions écrites. Les passages anglais
 * n'ont pas encore été passés au banc.
 */

export interface LangueDExtraction {
  /** Le nom de la langue, tel qu'il se glisse dans une phrase : « en {nom} ». */
  nom: string;
  sortie: string;
  rejet: string;
}

export interface LangueDesQuestions {
  nom: string;
  sortie: string;
}

export const LANGUES_D_EXTRACTION: Record<Langue, LangueDExtraction> = {
  FR: {
    nom: "français",
    sortie: `Tu écris toujours en français, quelle que soit la langue du dépôt. Un article en
anglais, une note en espagnol, une liste de vocabulaire : les concepts qui en sortent
sont en français. Il n'y a pas de langue à choisir ici — c'est celle dans laquelle la
personne révisera, et la seule que l'application lui parle.

Ce que le dépôt **cite** garde sa langue : un mot, une expression, une phrase
d'exemple, un terme technique, un nom propre. Tu les recopies tels quels, entre
guillemets, sans les traduire ni les translittérer. C'est souvent eux qu'il y a à
retenir, et les traduire effacerait exactement ce qu'on voulait apprendre.

Un dépôt qui dit « El verbo ser se usa para expresar la identidad » rend un concept
qui dit : Le verbe espagnol « ser » exprime l'identité, l'origine et la profession —
« soy francés », « es médico ».

Quand le sens d'un terme cité fait partie de ce qu'il y a à retenir, le concept porte
les deux : la forme dans sa langue, le sens en français.`,
    rejet: `Écris \`rejected\` en tutoyant — « tu », « te », « ton » ; jamais « vous » —, sans
reproche, en disant ce qui manquerait pour que ce soit exploitable.`,
  },
  EN: {
    nom: "anglais",
    sortie: `Tu écris toujours en anglais, quelle que soit la langue du dépôt. Un article en
français, une note en espagnol, une liste de vocabulaire : les concepts qui en sortent
sont en anglais. Il n'y a pas de langue à choisir ici — c'est celle dans laquelle la
personne révisera, et la seule que l'application lui parle. Les exemples de cette
consigne sont écrits en français ; ce que tu rends ne l'est jamais, sauf ce que le
dépôt cite.

Ce que le dépôt **cite** garde sa langue : un mot, une expression, une phrase
d'exemple, un terme technique, un nom propre. Tu les recopies tels quels, entre
guillemets, sans les traduire ni les translittérer. C'est souvent eux qu'il y a à
retenir, et les traduire effacerait exactement ce qu'on voulait apprendre.

Un dépôt qui dit « El verbo ser se usa para expresar la identidad » rend un concept
qui dit : The Spanish verb "ser" expresses identity, origin and profession —
"soy francés", "es médico".

Quand le sens d'un terme cité fait partie de ce qu'il y a à retenir, le concept porte
les deux : la forme dans sa langue, le sens en anglais.`,
    rejet: `Écris \`rejected\` en anglais, en t'adressant à la personne — « you » —, sans
reproche, en disant ce qui manquerait pour que ce soit exploitable.`,
  },
};

export const LANGUES_DES_QUESTIONS: Record<Langue, LangueDesQuestions> = {
  FR: {
    nom: "français",
    sortie: `Tu écris en français : l'énoncé, les options, la réponse-étalon. Toujours, quelle que
soit la langue du concept. Il n'y a pas de langue à choisir ici.

Ce que le concept cite — un mot, une expression, une phrase d'exemple, un terme
technique — se recopie dans sa langue, sans traduction ni translittération. C'est le
texte qui **porte** la question qui est en français, pas ce sur quoi elle porte : une
option de QCM peut donc être une forme étrangère, et un texte à trou peut masquer un
mot dans la phrase d'exemple citée telle quelle.

Une question qui s'adresse au lecteur le tutoie : « Explique », jamais « Expliquez ».`,
  },
  EN: {
    nom: "anglais",
    sortie: `Tu écris en anglais : l'énoncé, les options, la réponse-étalon. Toujours, quelle que
soit la langue du concept. Il n'y a pas de langue à choisir ici.

Les exemples de cette consigne sont écrits en français ; ce que tu rends ne l'est
jamais, sauf ce que le concept cite. Les tournures qu'elle interdit valent pour leurs
équivalents anglais : une étiquette de tête comme « The expected term is » ou
« Answer: », un verdict d'ouverture comme « Correct », « True » ou « False », une
prescription comme « you should have mentioned ».

Ce que le concept cite — un mot, une expression, une phrase d'exemple, un terme
technique — se recopie dans sa langue, sans traduction ni translittération. C'est le
texte qui **porte** la question qui est en anglais, pas ce sur quoi elle porte : une
option de QCM peut donc être une forme étrangère, et un texte à trou peut masquer un
mot dans la phrase d'exemple citée telle quelle.

Une question qui s'adresse au lecteur le fait à la deuxième personne : « Explain
why », jamais « The learner should explain ».`,
  },
};
