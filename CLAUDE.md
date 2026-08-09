# Cairn

## Le produit

Cairn aide à retenir ce qu'on apprend. L'utilisateur dépose une information sous n'importe quelle
forme (une phrase, un pavé, un copier-coller, une capture d'écran). L'application la découpe en
concepts, en fabrique des questions, et les lui repose au bon moment via un algorithme de
répétition espacée.

Un cairn est un empilement de pierres qui marque un sentier de montagne : chaque passant en ajoute
une, et l'ensemble finit par baliser le chemin. C'est la métaphore du produit et elle gouverne les
décisions de design comme de vocabulaire.

**Public cible** : développeurs et personnes en apprentissage technique continu, qui consomment
beaucoup d'information (docs, articles, réponses d'IA) et n'en retiennent presque rien.

**Ce que le produit n'est pas** : une app de flashcards, un outil de prise de notes, un assistant
de conversation. Ne propose jamais de fonctionnalité qui pousse dans ces directions.

---

## Vocabulaire du domaine

Ces termes sont contractuels. Ils apparaissent tels quels dans le code, la base, l'interface et les
commits. N'introduis pas de synonyme.

| Terme | Sens |
|---|---|
| **Input** | Ce que l'utilisateur dépose, brut, tel qu'il l'a écrit ou uploadé. Jamais modifié. |
| **Atom** | Un concept unitaire extrait d'un Input. C'est l'unité que la répétition espacée planifie. Un Input produit 1 à N Atoms. |
| **Variant** | Une formulation de question portant sur un Atom. Un Atom porte 3 à 4 Variants de formats différents. |
| **Review** | Un passage de l'utilisateur sur un Variant, avec sa notation et son temps de réponse. |
| **Session** | Une série de Reviews, l'unité d'usage quotidien. |
| **State** | L'état de maîtrise d'un Atom : `LEARNING`, `REVIEWING`, `CONSOLIDATED`, `ARCHIVED`. |

Règle centrale : **la planification porte sur l'Atom, jamais sur le Variant.** Les Variants tournent
pour éviter que l'utilisateur mémorise une formulation plutôt qu'un concept. Toute logique qui
attache un intervalle, une difficulté ou une échéance à un Variant est un bug d'architecture.

---

## Stack

- **Next.js 15** (App Router) + **TypeScript** en mode `strict`
- **PostgreSQL** (Neon) via **Prisma**
- **better-auth** pour l'authentification
- **ts-fsrs** pour la répétition espacée — ne réimplémente jamais l'algorithme à la main
- **SDK Anthropic**, modèle Sonnet 5, sorties structurées par tool use
- **Zod** pour toute validation d'entrée, y compris les réponses du modèle
- **Tailwind v4** + **shadcn/ui** comme primitives, retokenisées (voir Design)
- **Motion** pour les micro-interactions
- **Resend** pour les emails

N'ajoute aucune dépendance sans la justifier dans le message de commit. Pas de librairie de state
management : les Server Components et l'URL suffisent à ce projet.

---

## Architecture

```
app/                    Routes. Server Components par défaut.
  (marketing)/          Landing publique
  (app)/                Application authentifiée
  api/                  Route handlers
components/
  ui/                   Primitives shadcn retokenisées. Aucune logique métier.
  <domain>/             Composants de présentation par domaine
lib/
  domain/               Logique métier pure. Zéro import Next, zéro import Prisma.
  db/                   Accès données. Le seul endroit qui importe le client Prisma.
  ai/                   Wrapper d'appel modèle, prompts, schémas, fixtures.
  auth/
  email/
prisma/
.claude/skills/         Skills du projet, dont anti-ai-design
```

**Le sens des dépendances est strict** : `app/` → `lib/db/` → `lib/domain/`. Jamais l'inverse.

- `lib/domain/` contient des fonctions pures : mêmes entrées, mêmes sorties, aucun effet de bord.
  Tout ce qui est intéressant dans ce produit y vit — sélection des Atoms d'une session, rotation
  des Variants, transitions de State, calcul de streak et d'XP. C'est ce qui rend la logique
  testable sans base ni réseau.
- Aucun composant React n'appelle Prisma ni le SDK Anthropic directement.
- Aucun `fetch` vers l'API Anthropic hors de `lib/ai/client.ts`.

---

## Règles de code

**Taille et découpe**
- Un fichier dépasse 200 lignes : c'est le signal qu'il fait deux choses. Découpe.
- Un composant dépasse 120 lignes : extrais les sous-composants ou les hooks.
- Une fonction dépasse 40 lignes ou porte plus de trois niveaux d'indentation : extrais.
- Un fichier, un rôle. Nomme le fichier d'après ce rôle, jamais `utils.ts` ni `helpers.ts`.

**TypeScript**
- `any` est interdit. `unknown` puis un parsing Zod si le type est vraiment inconnu.
- Pas de `as` pour forcer un type. Si tu en as besoin, le modèle de données est faux.
- Types dérivés du schéma Prisma plutôt que redéclarés à la main.
- Les fonctions exportées de `lib/domain/` ont un type de retour explicite.

**Conventions**
- Fichiers en `kebab-case`, composants React en `PascalCase`, fonctions en `camelCase`.
- Les enums et states en `SCREAMING_SNAKE_CASE`, alignés sur le schéma Prisma.
- Les dates sont des `Date` en base et en logique, formatées uniquement au rendu.
- Toute date d'échéance est calculée en UTC ; le fuseau de l'utilisateur ne sert qu'à l'affichage
  et au déclenchement des notifications.

**Erreurs**
- Pas de `catch` silencieux. Une erreur est loguée avec son contexte ou remontée.
- Pas de retry automatique sur les appels au modèle. Un échec est un échec, il est enregistré.
- Les états vides et les erreurs sont des écrans conçus, pas des `null` ni des messages bruts.

---

## Règles sur les appels au modèle

Ces règles existent pour empêcher qu'un bug vide la balance API. Elles ne sont pas négociables.

1. **Un seul point d'entrée** : `lib/ai/client.ts`, fonction `callAI()`. Aucun autre fichier
   n'importe le SDK Anthropic. Aucune exception, y compris pour un test rapide.
2. **Mode mock par défaut en développement**. `MOCK_AI=true` renvoie des fixtures depuis
   `lib/ai/fixtures/`. Toute l'interface, le pipeline et le moteur de révision doivent être
   développables et testables sans un seul appel réel.
3. **`max_tokens` explicite** sur chaque appel, jamais laissé par défaut.
4. **Plafond journalier** : `callAI()` vérifie un compteur en base avant d'émettre et refuse
   au-delà de `AI_DAILY_CALL_CAP`. Le refus est une erreur claire, pas un silence.
5. **Interrupteur** : si `AI_ENABLED=false`, `callAI()` lève immédiatement.
6. **Traçabilité** : chaque appel écrit une ligne dans `AiCall` — modèle, tokens entrée et sortie,
   coût calculé, latence, succès, appelant.
7. **Sortie structurée par tool use**, jamais par consigne « réponds en JSON ». La réponse est
   ensuite validée par un schéma Zod. Une sortie invalide marque le job en échec, elle n'est pas
   rattrapée par de la réparation de chaîne.
8. **Génération asynchrone** : l'utilisateur ne doit jamais attendre un appel modèle dans une
   requête HTTP. L'ingestion écrit un `GenerationJob` et rend la main.

---

## Design

Dès que tu crées, modifies ou revois une interface (écran, composant, landing, dashboard,
formulaire, refonte), consulte le skill `.claude/skills/anti-ai-design/` **avant** de finaliser. Ne
traite pas le design comme une tâche faisable seul : ce skill existe pour contrer ce réflexe, et il
est prioritaire sur tes réflexes par défaut.

Avant de considérer un écran « terminé », passe sa checklist de fin d'écran.

La direction est calme, texturée, minérale. Elle doit évoquer un sentier de montagne, pas un outil
scolaire ni un dashboard SaaS.

**Interdits visuels** (ce sont les tells d'une interface générée) :
- Le rendu shadcn par défaut : palette zinc, `rounded-lg` partout, cartes à bordure grise fine.
- Inter comme police principale.
- Les dégradés violet-bleu, les emojis en icônes, les ombres portées diffuses.
- Le fond crème avec accent terracotta et display serif à fort contraste.
- Les marqueurs numérotés `01 / 02 / 03` sur du contenu qui n'est pas une séquence.

**Tokens** — définis une fois dans `app/globals.css`, jamais de valeur en dur dans un composant :

```
--stone-50   #F2F2EF   surface haute, gris papier froid
--stone-100  #E4E4DF
--stone-300  #BFC0BA
--stone-500  #6E7370   gris lichen, texte secondaire
--stone-800  #2A2E2C
--stone-900  #16191A   encre granit, texte principal
--lichen     #7A8B4F   accent unique, vert lichen désaturé
--ember      #B4552F   réservé strictement au streak
```

Un seul accent porte l'interface. `--ember` n'apparaît que sur le streak, nulle part ailleurs.

**Typographie** — trois rôles, jamais plus :
- Display : **Bricolage Grotesque**, réservée aux titres et aux grands nombres, utilisée avec
  parcimonie.
- Texte : **Satoshi**.
- Données : **Geist Mono**, pour les intervalles, compteurs, tags et libellés techniques.

**Grain** : un overlay de bruit très léger sur les surfaces, en `opacity` basse. C'est la texture
minérale, elle doit se sentir sans se voir.

**Élément signature** : le cairn lui-même. Sur le tableau de bord, un empilement de pierres qui
grandit d'une pierre à chaque Atom passé en `CONSOLIDATED`. Les pierres ont des formes et des
rotations légèrement irrégulières, dérivées de manière déterministe de l'id de l'Atom, pour que
l'empilement de chacun soit unique et stable dans le temps. C'est la seule audace visuelle du
produit : tout le reste reste discipliné autour d'elle.

**Mobile et desktop ont le même niveau d'exigence.** Aucune vue n'est une version dégradée de
l'autre. Développe en mobile-first et vérifie les deux à chaque écran livré.

**Plancher de qualité**, sans le commenter : navigation clavier avec focus visible, contrastes
AA, `prefers-reduced-motion` respecté, aucune animation qui bloque une interaction.

---

## Écriture d'interface

Le registre est calme, direct, en phrase capitalisée. Pas de point d'exclamation, pas
d'encouragement creux, pas d'emoji.

- Nomme les choses du point de vue de l'utilisateur, pas du système. « Ce que tu as déposé », pas
  « Inputs ».
- Un bouton dit ce qu'il fait et garde le même mot dans tout le flux.
- Un écran vide est une invitation à agir, pas une illustration.
- Une erreur explique ce qui s'est passé et comment continuer. Elle ne s'excuse pas.
- Ne félicite jamais l'utilisateur pour une bonne réponse. La récompense est la progression
  affichée, pas un compliment.

---

## Sécurité

- Toute route et toute Server Action vérifie la session **et** la propriété de la ressource. Un
  `userId` ne vient jamais du client.
- Validation Zod sur chaque entrée avant tout usage.
- Aucun secret dans le code ni dans un composant client. Uniquement en variable d'environnement.
- Limitation de débit par utilisateur sur l'ingestion et sur toute route déclenchant un job.
- Uploads d'images : type et taille vérifiés côté serveur, redimensionnement avant envoi au modèle.
- Pas de log de contenu utilisateur en production. Les logs portent des identifiants, pas du texte.

---

## Opérations interdites

Ne les exécute jamais, même si elles semblent résoudre le problème. Signale et attends.

- `prisma migrate reset`, `prisma db push --force-reset`, tout `DROP` ou `TRUNCATE`
- Toute écriture ou suppression hors du dossier du projet
- `git push --force`, réécriture d'historique, commit sur `main` sans branche
- Désactiver le mode mock ou émettre un appel modèle réel sans demande explicite
- Ajouter un service tiers payant, ou une intégration de paiement

Tout le reste — installer des paquets, créer des fichiers, lancer des migrations en avant, exécuter
les tests, démarrer le serveur — se fait en autonomie, sans demander confirmation.

---

## Travail et livraison

- Une phase à la fois. Ne prends pas d'avance sur une phase suivante, même si c'est tentant.
- Une branche par phase, des commits petits et lisibles, en français, à l'impératif.
- À la fin d'une phase : un récapitulatif court de ce qui est fait, de ce qui ne l'est pas, et des
  décisions prises qui ne figuraient pas dans la consigne.
- Signale les désaccords. Si une consigne te paraît produire un mauvais résultat, dis-le avant de
  l'exécuter plutôt que de l'appliquer en silence.
