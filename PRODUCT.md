# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Toute personne qui reçoit une information qu'elle veut retenir et sait
qu'elle risque de l'oublier. **Kairn ne segmente pas son audience par domaine
ni par métier — il segmente par le geste** : recevoir une info, vouloir la
garder, la déposer.

Le spectre est large :

- **En apprentissage continu**, quelqu'un qui alimente régulièrement un même
  domaine (documentation technique, articles, réponses d'IA, cours en ligne,
  lectures professionnelles, notes de collègues).
- **En rencontre ponctuelle**, quelqu'un qui capte une info qui lui a plu dans
  une conversation, une émission, un livre (une recommandation de vin, une
  anecdote historique, un mécanisme vu passer) et veut la garder au lieu de
  l'oublier vendredi.

Contexte d'usage commun : deux à cinq minutes par jour, pas en immersion.
C'est un rituel court, pas une session de travail longue.

## Product Purpose

Kairn aide à retenir ce qu'on apprend. L'utilisateur dépose une information
sous n'importe quelle forme (une phrase, un pavé, un copier-coller, une
capture d'écran). L'application la découpe automatiquement en concepts
unitaires, en fabrique des questions, et les lui repose au bon moment via un
algorithme de répétition espacée.

**Succès observable pour une personne** : elle fait sa session quotidienne de
cinq minutes sans qu'on ait besoin de lui rappeler. Le rituel s'auto-porte.
C'est la stabilisation du geste qui compte — pas la taille du corpus, pas le
nombre d'Atoms consolidés, pas les partages.

## Positioning

**L'extraction automatique d'Atoms depuis un input brut, plus la rotation des
Variants.** L'utilisateur ne crée jamais ses cartes : il colle ce qu'il lit ou
ce qu'on lui explique, Kairn en tire les concepts unitaires et fabrique des
formulations qui tournent. C'est la promesse qu'un utilisateur d'Anki,
RemNote, Notion AI ou app de flashcards reconnaîtrait comme non-copiable par
son outil actuel : ces outils demandent qu'on écrive les cartes ; Kairn les
extrait.

Kairn n'est pas :

- une app de flashcards (l'utilisateur ne crée pas ses cartes),
- un outil de prise de notes (rien n'est indexé pour la recherche),
- un assistant de conversation (le modèle sert au découpage, pas au dialogue).

Ne propose jamais de fonctionnalité qui pousse dans ces directions.

## Operating Context

Session quotidienne courte (quelques minutes), initiée depuis le tableau de
bord « Aujourd'hui ». Un rappel par email si la session du jour n'a pas été
faite ; les push notifications viendront en plus, après l'adoption de
l'installation PWA. Les inputs arrivent par copier-coller ou upload d'image —
jamais par intégration à un outil tiers.

Un mode « Entraînement » existe en marge : illimité, sans conséquence sur la
planification. Il n'entre pas dans la navigation principale et ne se propose
que là où la session n'a rien à donner ce jour-là — sinon, il la remplacerait.

## Capabilities and Constraints

- Extraction Atoms + Variants via **OpenRouter en primaire**, avec **repli
  automatique sur Sonnet** (`anthropic/claude-sonnet-5`), par la même route, si
  l'appel tombe (réseau, 5xx, sortie invalide ou tronquée). Mêmes prompts, même
  schéma, deux campagnes ont validé qu'ils tiennent le même contrat. Bascule
  tracée dans `AiCall.basculee` ; alerte email au-delà de cinq bascules par
  jour. Sortie structurée par tool use, plafonds journaliers durs sur le coût.
- Répétition espacée via `ts-fsrs` — la planification porte sur l'Atom,
  jamais sur le Variant. Les Variants tournent pour éviter la mémorisation par
  formulation.
- States d'un Atom : `LEARNING`, `REVIEWING`, `CONSOLIDATED`, `ARCHIVED`.
- Mode mock par défaut en développement, aucun appel modèle silencieux,
  plafond journalier et interrupteur global.

**Modèle économique** — chantier ouvert le 01/09/2026, pas encore en production :

- **Freemium, et l'unité est le concept, pas le dépôt.** Un compte gratuit
  retient **30 concepts par période**, la période étant le mois glissant depuis
  la date d'inscription. Ce qui n'a pas servi dans la période est perdu : rien ne
  se reporte. Un second rideau borne les dépôts à 60, parce qu'une extraction se
  paie même quand elle ne rend aucun concept.
- **Un plan payant unique**, décliné mensuel et annuel : **7 € par mois ou 70 €
  par an** — deux mois offerts —, qui porte le plafond à **300 concepts par
  période**. Un seul plan tant que le produit n'a pas de quoi en distinguer deux.
- **Encaissement par Stripe**, Checkout et portail client hébergés : aucune donnée
  de carte ne touche le produit.
- **La limite gratuite est commerciale, et il faut l'assumer comme telle.** Elle
  a été technique : au tarif Sonnet, une période saturée coûtait près d'un
  demi-dollar. Depuis le passage à Luna, un dépôt complet — extraction et ses
  quatre questions — coûte 0,004 $, et une période gratuite saturée quelques
  centimes. Écrire encore que cette limite « tient le coût des appels au modèle »
  serait faux. Le plafond gratuit pourra monter : ce sera une décision de prix,
  jamais une contrainte de coût.

**Conditionnelles au succès du produit** :

- **Version anglaise** — aujourd'hui français uniquement ; prévue si le
  produit trouve son public.
- **App native** — aujourd'hui PWA uniquement ; prévue si le produit trouve
  son public.

## Brand Commitments

- **Nom** : Kairn. Écriture minuscule dans le corps de texte.
- **Domaine** : kairn.me.
- **Vocabulaire contractuel (non-négociable)** : Input, Atom, Variant, Review,
  Session, State, Entraînement. Ces termes apparaissent tels quels dans le
  code, la base, l'interface et les commits. Pas de synonyme, jamais.
- **Signature visuelle (non-négociable)** : le cairn — un empilement de
  pierres dessiné à la main en SVG, qui grandit d'une pierre à chaque Atom
  passé en `CONSOLIDATED`. Chaque page importante en porte trace.
- **Voix (non-négociable)** : tutoiement français, phrase capitalisée, pas de
  point d'exclamation, pas d'encouragement creux, pas d'emoji. Pas de version
  anglaise à ce stade. Nomme les choses du point de vue de l'utilisateur
  (« Ce que tu as déposé », pas « Inputs »).

## Evidence on Hand

Landing publique en production sur kairn.me, avec un essai anonyme sans compte :
on colle un texte, on voit les concepts qui en sortent, et on lit une vraie
question écrite sur l'un d'eux. Pas de session — l'essai montre la matière que
le produit fabrique, il ne rejoue pas le geste quotidien, qui suppose un
historique. C'est la preuve unique montrée en amont de l'inscription.

Aucun témoignage utilisateur, aucune étude de cas, aucun benchmark public à ce
stade — le produit ne les fabrique pas pour combler l'absence.

## Product Principles

1. **Retenir prime sur ingérer.** Toute fonctionnalité qui gonfle le corpus
   sans améliorer la mémorisation est écartée.
2. **La planification porte sur l'Atom.** Les Variants tournent pour éviter la
   mémorisation par formulation. Toute logique qui attache un intervalle, une
   difficulté ou une échéance à un Variant est un bug d'architecture.
3. **L'entraînement ne se propose que là où la session n'a rien à donner.**
   Il n'entre pas dans la navigation. Il est illimité et sans conséquence —
   donc plus confortable que la session, et il la remplacerait si on le
   mettait en avant.
4. **Le vocabulaire est contractuel.** Pas de synonymes qui divergent avec le
   temps.
5. **Le rituel est court.** Aucun écran n'invite à rester au-delà de la
   session du jour.

## Accessibility & Inclusion

Plancher AA : navigation clavier avec focus visible, contrastes AA,
`prefers-reduced-motion` respecté, aucune animation qui bloque une
interaction. Mobile et desktop ont le même niveau d'exigence — développement
mobile-first, vérification systématique en largeur mobile (390 px).
