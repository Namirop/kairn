# Décisions — Réécriture du skill `anti-ai-design-patterns`

> Doc de travail. Capture les décisions prises pendant la lecture/révision du fichier
> `anti-ai-design-patterns.md`, avec les nuances (pas seulement le verdict terse).
> Sert de brief de réécriture une fois la lecture terminée.
> Maintenu au fil de la conversation.

---

## 0. Architecture & méta-décisions

### Format final = skill avec progressive disclosure
- Le doc devient un **skill** : dossier `anti-ai-design-patterns/`.
- Structure en 3 niveaux (mécanique officielle des skills) :
  1. **`description` du frontmatter** (toujours en contexte, ~100 mots) → SEUL texte lu pour décider de déclencher. Critique. Doit être concise + "pushy".
  2. **Corps du `SKILL.md`** (chargé quand le skill se déclenche) → idéalement < 500 lignes. Contient : principes directeurs + checklist (§10) + déclencheurs + pointeurs vers references.
  3. **`references/`** (chargés à la demande, illimité) → un fichier par domaine.
- Découpage references prévu (le doc est déjà sectionné, donc quasi mécanique) :
  `structure.md` (§2), `typographie.md` (§3), `espacement.md` (§4), `couleur.md` (§5),
  `decoration.md` (§6), `formulaires.md` (§7), `donnees.md` (§8).
- Le doc actuel fait 667 lignes → au-dessus de l'idéal des 500, d'où le découpage.

### Pourquoi un skill + un pointeur CLAUDE.md (et pas l'un ou l'autre)
- **Problème central** : Claude/CC **sous-déclenchent** les skills, surtout sur les tâches qu'ils croient pouvoir gérer seuls. Le design EST exactement ce type de tâche → risque n°1 de sous-déclenchement. C'est pourquoi le fichier était appliqué "à moitié" quand Romain le référençait juste.
- **Skill seul** = déclenché sur jugement de pertinence → pas fiable pour le design.
- **CLAUDE.md** = injecté à chaque session, sans condition. Mais on n'y met PAS les règles design (sinon ça les force hors design, ce que Romain ne veut pas).
- **Solution** : pointeur court dans `CLAUDE.md` = assurance de déclenchement. Il ne duplique pas le contenu, il dit juste : "dès que tu crées/modifies une UI, consulte le skill `anti-ai-design-patterns` avant de finaliser ; ne traite pas le design comme une tâche faisable seul".
- Romain NE veut PAS que les règles s'appliquent hors design → confirmé, le CLAUDE.md ne porte qu'un déclencheur, pas les règles.

### Concis vs détaillé
- Ni l'un ni l'autre : **description chirurgicale** (le déclencheur), **corps détaillé mais en couches**. C'est de l'architecture, pas un arbitrage.

### Ordre de travail
1. Figer le contenu (lecture + questions). ← **on en est là**
2. Restructurer en SKILL.md + references.
3. Écrire la `description` (pushy) + le pointeur CLAUDE.md.
4. Tester le déclenchement quantitativement via `run_loop.py` du skill-creator (tourne dans CC, pas en conversationnel).

---

## 1. Règles transversales d'écriture du doc

- **T1 — Format de chaque pattern** : ❌ ce que fait l'IA → ✅ ce que fait un designer à la place → 1 ligne de "pourquoi" → exemple concret. Exemples **baked in** dans le doc pour que Romain ne ré-explique plus rien dans ses prompts.
- **T2 — Voix** : "pro designer qui corrige du vibe-code". Boîte à réflexes actionnables, zéro théorie longue. Romain ne veut pas comprendre la théorie, juste avoir le geste de correction.
- **T3 — Format de sortie de CC** : quand CC audite ou explique du design, sortie **scannable**, **priorisée (🔴/🟡/🟢)**, essentiel only, jamais un pavé. Résout le problème "je lis pas les outputs verbeux/trop techniques". Règle transversale, vaut pour tout le doc (pas que les audits).

---

## 2. Chantiers structurels

- **FUSION §1 ↔ §9** : "Principes directeurs" (§1) et "Règles transversales" (§9) sont quasi le **même contenu en double**. Mapping observé :
  - §1.A (forme suit fonction) ≈ §9.C (contenu avant container)
  - §1.B (accent = signalisation) ≈ §9.E (connaître son accent)
  - §1.D (type porte le design) ≈ §9.B (type-driven design)
  - §1.E (casser pattern métier) ≈ §9.F (même titre)
  - §1.F (inspiration hors SaaS) ≈ §9.G (même idée)
  - §1.G (audit avant ménage) ≈ §9.A (même titre)
  - §9.D (espacement en unité visuelle) = pas de jumeau évident dans §1
  → Décider d'UNE seule section de principes. Gros nettoyage.

---

## 3. Décisions par section

### §1.B — L'accent est une signalisation, pas une décoration
- **Garder** : très pertinent (c'est ce que Romain a fait sur l'audit doré de Plarya). C'est un truc que la génération auto rate (colle l'accent partout).
- **Corriger** : énoncé trop abstrait, sans exemple. CC l'appliquerait mollement.
  - Définir **"couleur brand"** inline (= couleur d'accent/signature : rouge DevisRapide, doré Plarya).
  - Définir **"occurrence"** inline (= chaque apparition de cette couleur à l'écran).
  - Ajouter un exemple ❌/✅ concret (ex : tout doré ❌ vs doré réservé au seul CTA ✅).
- Ne pas redire la *méthode* d'audit ici (déjà en §1.G/§9.A) — ce principe pose juste le "pourquoi".

### Nouveau principe — La couleur brand n'est pas obligatoire
- À écrire explicitement : un produit n'a PAS forcément besoin d'une couleur d'accent.
- Le **quasi-monochrome** (noir/blanc/gris, accent quasi nul) est une **option premium valide**, pas un manque (cf. luxe, éditorial).
- But : empêcher CC de croire qu'il FAUT coller de la couleur quelque part.

### §1.E — Casser le pattern par un élément métier unique
- **Scoper au type de projet** : public/marketing/identité = oui ; interne/admin/CRUD utilitaire = NON (saute, ça serait du bruit / temps perdu).
- **Doser** : UN seul élément signature, sur l'écran le plus vu (home ou écran principal). Pas dix, pas sur chaque page.
- **Reformuler "choisis et adapte dans une liste"** et NON "invente". → C'est la partie que CC exécute le PLUS MAL : "invente un truc original froid" = le saut créatif où CC échoue (soit ignore, soit pond du générique déguisé en original). CC est bon pour *choisir/adapter dans un menu*, pas pour *inventer ex nihilo*.
- Pour les projets où Romain veut du fort : input de sa sœur (UX/UI) ou le sien > CC.
- **Fusionner avec le pattern §2 "absence de pattern spécifique au métier"** = doublon exact, mêmes exemples (publication → preview navigateur, fitness → timeline BD, etc.).

### §1.F — Inspirer hors du SaaS mainstream
- **Constat assumé** : Claude/CC retombent sur les mêmes noms (Linear/Vercel/Stripe/Notion) et les mêmes types ("editorial" en boucle). Pas d'œil, juste une distribution statistique → tend vers le mainstream par construction. L'œil de Romain > le panel de Claude pour dénicher du différent.
- **Remplacer les "types" de sites par de vraies références concrètes**, chacune avec **"à voler : X"** (la technique précise à extraire, pas l'URL seule). Une URL nue → CC en tire rien.
- **Garde-fous** :
  - Pas d'URLs périssables sans plan de maintenance (les sites se refont/tombent).
  - PAS de sites-trophées type Awwwards → poussent au show sur-animé (scroll-jacking, WebGL), mauvais modèle pour du fonctionnel.
- **Section peu actionnable pour CC** (CC ne regarde pas, ne ressent pas) → l'**alléger dans le skill** et la transformer en **référentiel que Romain enrichit** dans le temps.
- **Méthode pour Romain** : à chaque site qui plaît (en naviguant, pas en cherchant "best websites"), screenshot + noter UNE chose précise à voler. Construction par accumulation.
- **Références concrètes = à fournir par Romain.** (Voir Open Items : recherche ciblée possible côté Claude, galeries de niche type godly.website / portfolios indé, PAS "best sites 2026".)

### §1.G — Audit avant ménage
- **Restreindre l'audit aux SEULS changements systémiques** : couleur / police / token d'espacement touchant *plein d'endroits* (cf. Plarya 121 occurrences / 37 fichiers — bulk replace aurait cassé les usages légitimes).
- **Fix local** (un écran, un composant, ajustement ponctuel) = **pas d'audit**, correction directe.
- Rendre la **condition de déclenchement explicite et étroite** dans le doc. Effet visé : si CC présente un audit, c'est qu'il était justifié → Romain sait que ça vaut la lecture.
- Couplé à **T3** (format de sortie scannable/priorisé) pour que les audits, quand ils ont lieu, soient lisibles.
- **Fusionner avec §9.A** (doublon "Audit avant ménage").

---

## 4. Open items / à traiter plus tard

- **Point dédié recherche références (§1.F)** une fois la lecture finie. Décider : Romain gère seul OU Claude lance une recherche ciblée (galeries de niche, pas "best sites 2026"). Romain a dit : OK pour l'aide à la recherche, mais à voir après la lecture.
- **Recherches de fraîcheur au moment de réécrire** les sections sensibles à l'année : tailles de titres premium actuelles, polices à la mode vs cramées, pratiques des bons studios 2026 (surtout §3 typo). À faire au moment T, pas maintenant.
- **Brief de réécriture complet** : avant de toucher au fichier, Claude relit le fil entier + produit un brief détaillé (pas juste ce doc terse) que Romain valide.

---

## Sections déjà lues / vues
- §1.A — pas encore discutée en détail (mentionnée dans mapping fusion §1↔§9).
- §1.B — ✅ traitée.
- §1.C — pas encore.
- §1.D — pas encore (mentionnée dans mapping).
- §1.E — ✅ traitée.
- §1.F — ✅ traitée.
- §1.G — ✅ traitée.
- §2 à §10 — pas encore lues en détail par Romain.
