# Contribuer à Kairn

Comment le code arrive sur `main`, et les règles qui le gardent lisible. Le `README` dit ce qu'est
le projet ; ce document dit comment on y travaille.

## Le cycle

`main` est la branche de production : ce qui y est fusionné part en ligne. Elle est protégée, on n'y
pousse jamais directement.

```bash
git switch main && git pull
git switch -c fix/sujet          # une branche courte, une intention
# … commits …
git push -u origin fix/sujet
gh pr create                     # la demande de fusion, décrite en français
```

Une PR fait une seule chose et se fusionne seule. Elle n'entre dans `main` que si la CI est verte.
Une fois fusionnée, sa branche est supprimée automatiquement.

| Préfixe de branche | Pour                                               |
| ------------------ | -------------------------------------------------- |
| `feat/`            | une fonctionnalité                                 |
| `fix/`             | un bug                                             |
| `refactor/`        | une réorganisation sans changement de comportement |
| `docs/`            | la documentation, les commentaires                 |
| `chore/`, `ci/`    | l'outillage, la CI, les dépendances                |

## Les commits

Au format [Conventional Commits](https://www.conventionalcommits.org/), en anglais :

```
fix: refuse anonymous calls when their daily cap is zero

The WHERE clause of the upsert only guards the DO UPDATE branch, so the
first anonymous reservation of the day was inserted without being
checked against the cap.
```

La première ligne dit ce qui change ; le corps dit **pourquoi**, avec le contexte qui ne tient pas
dans le code. C'est là que vit l'histoire d'une décision, pas dans les commentaires.

## Ce qui vérifie, et quand

| Moment         | Vérification                                        | Où                         |
| -------------- | --------------------------------------------------- | -------------------------- |
| Commit         | ESLint et Prettier sur les fichiers modifiés        | `.husky/pre-commit`        |
| Commit         | Le message suit Conventional Commits                | `.husky/commit-msg`        |
| Push           | Types et tests                                      | `.husky/pre-push`          |
| PR             | Lint, types, format, tests, code mort (knip), build | `.github/workflows/ci.yml` |
| Chaque semaine | Mises à jour des dépendances proposées en PR        | Dependabot                 |

Les hooks donnent un retour immédiat sur la machine ; la CI est l'autorité, sur une machine vierge,
et ne se contourne pas. Un hook qui échoue se corrige, il ne se saute pas.

## Les règles du code

Elles sont détaillées dans les conventions du projet. Les principales :

- **Architecture.** Les dépendances vont dans un sens, `app/` → `lib/db/` → `lib/domain/`, et
  ESLint le vérifie. `lib/domain/` est pur : ni Next, ni Prisma, ni réseau.
- **Un fichier, un rôle**, nommé d'après ce rôle. Les tailles (~200 lignes de code par fichier,
  ~40 par fonction) sont des signaux, pas des quotas : on découpe ce qui fait deux choses.
- **Langue.** Le code est en français, sauf le vocabulaire du domaine (`Atom`, `Variant`…), ce
  qu'imposent les outils et quelques fichiers d'infrastructure (`client.ts`, `config.ts`…).
- **TypeScript strict**, sans `any` ni `as`. Toute entrée passe par Zod.
- **Commentaires.** Un commentaire dit pourquoi le code est comme il est aujourd'hui : une
  contrainte invisible, un choix qui paraîtrait faux, l'origine d'un seuil. Il ne paraphrase pas le
  code et ne raconte pas l'histoire.
- **Tests.** Toute fonction ajoutée à `lib/domain/` arrive avec ses tests, dans le même commit.
  Une règle vraie pour toute entrée s'écrit en propriété fast-check. Un test ne dépend ni de
  l'horloge, ni du fuseau, ni du réseau.
- **Appels au modèle.** Uniquement par `callAI()`, en mode mock par défaut en développement.

## La documentation suit le code

Chaque doc déclare le code qu'elle décrit dans `scripts/docs/carte-des-docs.ts`. Quand ce code
change dans une PR, `npm run docs:check` nomme la doc à relire : elle se corrige dans la même PR. Une
nouvelle doc, ou un nouveau dossier qu'une doc décrit, s'ajoute à la carte.
