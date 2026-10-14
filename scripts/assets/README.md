# Banque d'assets

Génère les captures et enregistrements de Kairn pour les contenus sociaux :
d'abord un compte de démonstration alimenté par le vrai pipeline, puis des
captures fixes aux deux viewports et des vidéos en viewport mobile.

## Règle d'honnêteté

Une capture ne montre que des états que le produit **produit réellement**. Les
concepts et les questions sortent du vrai pipeline, jamais écrits à la main.
L'historique de révisions est simulé, mais **sur le seul compte de démo** et
rejoué par ts-fsrs : chaque état d'Atom est dérivé par la vraie fonction du
domaine. On ne fabrique ni compteur, ni série, ni question.

## Chaîne, dans l'ordre

```bash
# 1. Extraire les vrais concepts/questions des sujets → figé versionné (LA dépense).
#    Réservé : MOCK_AI=false et un plafond. Lancé une fois, mis en cache ensuite.
BANC_DAILY_CALL_CAP=60 MOCK_AI=false AI_ENABLED=true npm run assets:figer -- --emettre

# 2. Semer le compte de démo depuis le figé (aucune dépense).
npm run assets:seed

# 3. Lancer le serveur dev avec la vitrine, puis capturer (aucune dépense).
ASSETS_PREVIEW=1 npm run dev            # un terminal
npm run assets:captures                 # un autre

# 4. Vidéos. Le dépôt garde la vraie génération, donc serveur en MOCK_AI=false.
MOCK_AI=false AI_ENABLED=true ASSETS_PREVIEW=1 npm run dev
npm run assets:videos                   # ou : -- session   pour une seule scène
```

`assets:figer` ne réextrait que les sujets absents du figé ; `-- --refaire` les
reprend tous. `assets:videos` accepte un filtre par nom de scène.

`assets:captures` prend deux options. `--langue en` capture l'interface anglaise
sur les seuls dépôts anglais (un sujet dont le fichier porte `.en.`) : le compte
de démo passe en anglais le temps des captures puis reprend sa langue, et les
fichiers prennent `.en` avant l'extension. `--seulement` ne tire que les
fichiers nommés, en `<viewport>/<ecran>/<sujet>` :

```bash
npm run assets:captures -- --langue en --seulement mobile/depot-colle/cours-biologie,mobile/question/mcq-faux
```

## Sortie

Les fichiers sont écrits **hors du dépôt**, dans `../contenu/commun/assets/`
(réglable par `ASSETS_OUT_DIR`), rangés en
`<mobile|bureau>/<ecran>/<sujet>[.en].png|.mp4`. Un `manifest.json` à la racine décrit
chaque fichier (écran, sujet, format de question, viewport, langue, date, dépôt source) —
c'est lui que le studio interroge. Les PNG et MP4 ne sont pas versionnés ; le
manifeste, si.

Le figé, lui, est versionné ici (`fige/demo.json`) : il rend le compte de démo
reproductible sans repayer.

## La vitrine `app/(apercu)/`

Pour capturer chaque format de question en juste/faux et le cairn à des hauteurs
choisies, une route monte les vrais composants dans un état figé. Elle est inerte
hors développement : `notFound()` si `NODE_ENV=production` ou sans
`ASSETS_PREVIEW=1`. `next.config.ts` éteint aussi l'indicateur de dev de Next
sous ce même drapeau, pour qu'il ne se glisse pas dans les captures.

## Fichiers

| Fichier                                                                                   | Rôle                                                         |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `config.ts`                                                                               | Racine de sortie, viewports, chemins.                        |
| `manifeste.ts`                                                                            | Schéma et écriture du manifeste.                             |
| `session.ts`                                                                              | Cookie de session (better-auth `testUtils`) pour Playwright. |
| `sujets.ts` / `sujets/`                                                                   | Les textes déposés, un par sujet.                            |
| `fige.ts` / `figer-les-sujets.ts`                                                         | Figé d'assets sans perte, et son extraction réelle.          |
| `fige-vers-seed.ts` / `stats-de-demo.ts` / `seed-demo.ts`                                 | Compte de démo depuis le figé + historique simulé.           |
| `navigateur.ts` / `cibles-de-capture.ts` / `scenarios.ts` / `captures.ts` / `capturer.ts` | Captures fixes.                                              |
| `enregistreur.ts` / `enregistrer.ts`                                                      | Vidéos mobiles + montage ffmpeg.                             |

## Prérequis

`ffmpeg` sur le `PATH` (montage vidéo), et le navigateur Playwright
(`npx playwright install chromium`) — ou, à défaut, `ASSETS_NAVIGATEUR=chrome`
pour piloter le Chrome installé. Le serveur dev et le seed doivent viser la
même base.
