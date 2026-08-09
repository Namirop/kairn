# Cairn — Phase 0 : fondations

Tu démarres un nouveau projet. Lis d'abord `CLAUDE.md` à la racine : il contient le vocabulaire du
domaine, l'architecture, les règles de code et la direction visuelle. Tout ce qui suit s'y ajoute
sans le contredire.

Cette phase ne contient **aucune fonctionnalité métier**. Pas d'ingestion, pas de génération de
questions, pas de session de révision. Elle pose le socle sur lequel les quatre phases suivantes
viendront s'appuyer, et elle livre l'identité visuelle. Si tu te surprends à écrire de la logique
de révision ou d'appel au modèle pour de vrai, tu es sorti du périmètre.

---

## 1. Initialisation

Next.js 15, App Router, TypeScript strict, Tailwind v4, ESLint et Prettier configurés.

Ajoute : `prisma`, `@prisma/client`, `better-auth`, `ts-fsrs`, `@anthropic-ai/sdk`, `zod`,
`motion`, `resend`, et shadcn/ui initialisé.

Mets en place `.env.example` avec toutes les variables, commentées :

```
DATABASE_URL=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=
ANTHROPIC_API_KEY=
RESEND_API_KEY=
CRON_SECRET=

# Garde-fous IA — voir lib/ai/client.ts
MOCK_AI=true              # true en développement, toujours
AI_ENABLED=true           # false coupe tout appel modèle
AI_DAILY_CALL_CAP=50      # plafond global d'appels réels par jour
AI_MODEL=claude-sonnet-5
AI_MAX_TOKENS=3000
```

Copie le dossier du skill de design dans `.claude/skills/anti-ai-design/` (je le place moi-même,
vérifie juste qu'il est présent et lis-le avant de commencer la partie visuelle).

---

## 2. Schéma de données

Écris le schéma Prisma complet, y compris pour les phases à venir. Le modèle de données est figé
maintenant pour éviter les migrations douloureuses plus tard.

Les modèles de better-auth (`User`, `Session`, `Account`, `Verification`) sont générés par la
librairie ; ajoute les champs applicatifs sur `User` ou sur un modèle `UserSettings` séparé, à ton
choix, en le justifiant.

**Modèles à créer :**

`UserSettings` — `userId`, `timezone`, `dailyReminderEnabled`, `dailyReminderHour`,
`streakAlertEnabled`, `emailOptOutAt`

`UserStats` — `userId`, `xp`, `level`, `currentStreak`, `longestStreak`, `lastReviewedOn` (date
locale de l'utilisateur, pas un timestamp), `atomsConsolidated`

`Input` — `id`, `userId`, `rawContent` (Text), `sourceType` (`TEXT` | `IMAGE`), `imageUrl`
nullable, `extractedText` nullable (le texte tiré d'une image), `status` (`PENDING` | `PROCESSING`
| `READY` | `FAILED`), `createdAt`. Le `rawContent` n'est jamais modifié après création.

`Atom` — `id`, `inputId`, `userId`, `concept` (Text), `tags` (String[]), `state` (`LEARNING` |
`REVIEWING` | `CONSOLIDATED` | `ARCHIVED`), `archivedAt` nullable, `archivedByUser` (Boolean),
`createdAt`, plus les champs que `ts-fsrs` attend : `due`, `stability`, `difficulty`,
`elapsedDays`, `scheduledDays`, `reps`, `lapses`, `fsrsState`, `lastReview`.

Index sur `(userId, due)` : c'est la requête chaude de toute l'application.

`Variant` — `id`, `atomId`, `format` (`MCQ` | `TRUE_FALSE` | `SHORT_ANSWER` | `CODE` | `EXPLAIN`),
`question` (Text), `answerKey` (Text), `payload` (Json nullable, pour les options d'un QCM par
exemple), `seenCount`, `lastSeenAt` nullable, `retiredAt` nullable, `createdAt`

`Review` — `id`, `atomId`, `variantId`, `userId`, `rating` (`AGAIN` | `HARD` | `GOOD` | `EASY`),
`responseTimeMs`, `selfMastered` (Boolean, l'utilisateur a déclaré maîtriser), `stabilityBefore`,
`stabilityAfter`, `reviewedAt`

`GenerationJob` — `id`, `inputId`, `kind` (`ATOMS` | `VARIANTS` | `OCR`), `status` (`QUEUED` |
`RUNNING` | `DONE` | `FAILED`), `attempts`, `lastError` nullable, `createdAt`, `startedAt`,
`finishedAt`

`AiCall` — `id`, `userId` nullable, `jobId` nullable, `purpose`, `model`, `inputTokens`,
`outputTokens`, `costUsd` (Decimal), `latencyMs`, `success`, `errorCode` nullable, `createdAt`

`DailyUsage` — `userId`, `day` (Date), `generations`, `reviews`, contrainte d'unicité sur
`(userId, day)`. Sert aux quotas.

Ajoute les relations, les `onDelete` cohérents (supprimer un `Input` supprime ses `Atom`, qui
suppriment leurs `Variant`), et une migration initiale qui passe.

**Seed** : un script `prisma/seed.ts` qui crée un utilisateur de test avec une dizaine d'Atoms
répartis sur les quatre `state`, des échéances étalées (certaines dépassées, certaines à venir),
leurs Variants et un historique de Reviews réaliste. Ce seed est ce qui permettra de développer et
regarder toute l'interface sans jamais appeler le modèle — soigne-le.

---

## 3. Authentification

better-auth avec email/mot de passe et Google. Routes protégées par middleware sur le groupe
`(app)`. Une session absente redirige vers la connexion.

Un helper serveur `requireUser()` qui renvoie l'utilisateur ou lève. Toute lecture ou écriture
passe par un `userId` issu de la session, jamais d'un paramètre client.

À la création d'un compte : `UserSettings` et `UserStats` sont créés dans la même transaction, avec
le fuseau horaire détecté côté client et envoyé une seule fois.

---

## 4. Le wrapper d'appel modèle

C'est la pièce la plus importante de cette phase. Elle protège le budget.

`lib/ai/client.ts` expose une unique fonction :

```ts
callAI<T>(params: {
  purpose: string;
  schema: ZodSchema<T>;
  system: string;
  messages: MessageParam[];
  maxTokens?: number;
  userId?: string;
  jobId?: string;
}): Promise<T>
```

Comportement, dans cet ordre :

1. Si `AI_ENABLED` vaut `false` → lève `AIDisabledError`.
2. Si `MOCK_AI` vaut `true` → charge la fixture correspondant à `purpose` depuis
   `lib/ai/fixtures/`, la valide contre `schema`, la renvoie après un délai simulé de 300 ms.
   **Aucun appel réseau.**
3. Compte les appels réels du jour dans `AiCall`. Si le plafond `AI_DAILY_CALL_CAP` est atteint →
   lève `AIQuotaError`. Cette vérification précède l'émission, jamais après.
4. Émet l'appel avec `max_tokens` explicite et la sortie structurée par tool use dérivée du schéma
   Zod. Pas de consigne « réponds en JSON » dans le prompt système.
5. Valide la réponse avec `schema`. Une sortie invalide lève, elle n'est pas réparée.
6. Dans tous les cas, succès comme échec, écrit une ligne dans `AiCall` avec les tokens, le coût
   calculé et la latence.
7. **Aucun retry.**

Le coût se calcule à partir d'une table de tarifs en constante, exprimée en dollars par million de
tokens, avec entrée et sortie séparées.

Crée les fixtures pour les trois `purpose` des phases suivantes — `extract_atoms`,
`generate_variants`, `ocr_extract` — avec un contenu réaliste et varié, y compris un cas d'une
seule phrase produisant un seul Atom et un cas de pavé produisant six Atoms. Ces fixtures seront la
base de développement des phases 2 et 3.

Écris les schémas Zod de ces trois sorties dans `lib/ai/schemas.ts`. Les prompts système restent
vides pour l'instant, je les fournirai en phase 1.

---

## 5. Jobs asynchrones

`lib/jobs/` avec :

- une fonction pour créer un `GenerationJob`
- un exécuteur qui prend un job `QUEUED`, le passe en `RUNNING`, appelle le traitement adéquat,
  et le termine en `DONE` ou `FAILED` avec l'erreur enregistrée
- un déclenchement immédiat après la requête d'ingestion via `after()` de Next
- une route cron protégée par `CRON_SECRET` qui reprend les jobs restés `QUEUED` ou bloqués en
  `RUNNING` depuis plus de dix minutes, avec un maximum de trois tentatives

Les traitements eux-mêmes sont des stubs en phase 0 : ils marquent le job terminé sans rien
produire. La mécanique doit fonctionner, pas le contenu.

---

## 6. Notifications

Uniquement la plomberie. Un seul canal, l'email, via Resend.

`lib/email/` avec une fonction `sendNotification(userId, type, payload)`, le type étant une union
qui ne contient pour l'instant que `DAILY_REMINDER`. Un gabarit d'email sobre, cohérent avec la
direction visuelle, avec lien de désinscription fonctionnel écrivant `emailOptOutAt`.

Une route cron horaire qui sélectionne les utilisateurs dont l'heure locale correspond à leur
`dailyReminderHour` et qui n'ont pas encore été notifiés aujourd'hui. En phase 0, elle calcule la
sélection et logue — elle n'envoie pas.

---

## 7. Identité visuelle et coquille

C'est la partie que je veux voir. Consulte le skill de design avant de commencer.

**Avant d'écrire du CSS**, propose-moi en une réponse courte : la palette avec ses hex nommés, les
trois rôles typographiques avec leurs graisses et leur échelle, un wireframe ASCII du tableau de
bord, et ta proposition pour l'empilement de pierres. Les tokens de départ sont dans `CLAUDE.md` —
tu peux les ajuster si tu le justifies, pas les remplacer par des valeurs par défaut.

Puis construis :

- `app/globals.css` avec tous les tokens, l'échelle typographique, l'échelle d'espacement et de
  rayons. Aucune valeur en dur ailleurs dans le projet.
- Les polices chargées correctement via `next/font`.
- Les primitives shadcn dont on aura besoin — bouton, champ, carte, dialogue, badge, info-bulle —
  **retokenisées**, pas dans leur rendu par défaut.
- La coquille de l'application authentifiée : navigation, en-tête, conteneur. Elle doit être bonne
  en mobile comme en desktop, avec deux traitements pensés, pas un menu écrasé.
- **Le composant `Cairn`** : l'empilement de pierres, alimenté par un simple nombre. Formes et
  rotations dérivées de manière déterministe d'une graine, pour que l'empilement soit stable dans
  le temps. Anime l'ajout d'une pierre. C'est l'élément signature du produit, c'est là que passe
  l'effort.
- Un tableau de bord **statique branché sur le seed** : le cairn, le streak, le nombre d'Atoms dus
  aujourd'hui, les états vides. Aucun bouton n'est fonctionnel, c'est une maquette vivante.
- Les états vides et les écrans d'erreur, écrits selon les règles d'écriture du `CLAUDE.md`.
- La landing publique : une seule page, la thèse du produit, sans section de tarifs et sans
  formulaire de paiement.
- Le manifeste PWA et l'invite d'installation, avec la mention discrète qu'une application mobile
  native suivra.

---

## 8. Vérification avant de me rendre la main

Passe cette liste toi-même et dis-moi ce qui échoue :

- [ ] `npm run build` passe, `tsc --noEmit` passe, ESLint ne remonte rien
- [ ] La migration s'applique sur une base vierge et le seed la remplit
- [ ] Aucun `any`, aucun `as` de confort dans le code écrit
- [ ] `grep` sur `@anthropic-ai/sdk` ne remonte que `lib/ai/client.ts`
- [ ] `grep` sur `@prisma/client` ne remonte que `lib/db/`
- [ ] Avec `MOCK_AI=true`, aucune requête ne sort vers l'API : vérifie-le, ne le suppose pas
- [ ] `AI_ENABLED=false` fait échouer proprement tout appel
- [ ] Aucun fichier au-delà de 200 lignes
- [ ] Le tableau de bord et la landing sont corrects à 375 px et à 1440 px
- [ ] Navigation au clavier possible partout, focus visible
- [ ] Aucune couleur ni taille de police en dur hors de `globals.css`

Termine par un récapitulatif court : ce qui est fait, ce qui ne l'est pas, et les décisions que tu
as prises et qui ne figuraient pas dans cette consigne.

Ne commence aucune phase suivante.
