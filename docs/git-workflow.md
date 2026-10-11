# Git workflow

How changes reach `main` in this repository. Short on purpose.

## Why not commit on `main`

`main` is the production branch: whatever lands there is deployed. Work happens on a
**branch** instead, and reaches `main` through a **Pull Request**.

## The four words

| Word             | Meaning                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------ |
| **Commit**       | A snapshot of the project with a message. One commit, one intention.                             |
| **Branch**       | A parallel line of commits. Work there never touches `main`.                                     |
| **Pull Request** | A request on GitHub: "integrate this branch into `main`". It is a GitHub feature, not a git one. |
| **Merge**        | Accepting the request: the branch's commits join `main`.                                         |

## The loop

```
main ──●────────────────────●──  (production)
        \                  /
         ●──●──●  branch  ●     PR opened, checks pass, merged
```

1. **Update `main`**: `git switch main && git pull`
2. **Create a branch**: `git switch -c type/short-name`
3. **Work, then commit** (several small commits are fine)
4. **Send the branch**: `git push -u origin type/short-name`
5. **Open the PR**: `gh pr create`
6. **Wait for the checks**, then merge on GitHub
7. **Clean up**: `git switch main && git pull && git branch -d type/short-name`

## Commit messages

Format: `type: short description`, in English, imperative, lowercase.

| Type       | Use for                                  |
| ---------- | ---------------------------------------- |
| `feat`     | a user-visible feature                   |
| `fix`      | a bug fix                                |
| `refactor` | restructuring without changing behaviour |
| `docs`     | documentation only                       |
| `test`     | adding or fixing tests                   |
| `chore`    | tooling, dependencies, housekeeping      |
| `style`    | formatting only                          |
| `ci`       | CI configuration                         |
| `perf`     | performance                              |

Branches use the same prefixes: `feat/…`, `fix/…`, `chore/…`, `docs/…`.

## Automatic guardrails

Installed by husky when you run `npm install`.

| When         | What runs                                             |
| ------------ | ----------------------------------------------------- |
| `git commit` | ESLint and Prettier on the staged files (lint-staged) |
| `git commit` | the message is validated (commitlint)                 |
| `git push`   | typecheck and the test suite                          |

They can be skipped with `--no-verify`. Don't: the CI runs the same checks and cannot be skipped.

## Staging, the usual trap

`git add` puts files in the **staging area**; `git commit` takes **everything** staged, not
only what you just added. Check with `git status` before committing.

## Useful commands

| Command                   | What it does                                        |
| ------------------------- | --------------------------------------------------- |
| `git status`              | what changed, what is staged                        |
| `git diff`                | the exact changes not yet staged                    |
| `git log --oneline -10`   | the last 10 commits                                 |
| `git switch <branch>`     | move to another branch                              |
| `git reset --soft HEAD~1` | undo the last commit, keep the work (unpushed only) |

Never rewrite history that is already pushed.
