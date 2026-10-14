# La campagne — comparer les modèles sur l'instrument

Répondre à une question et une seule : **peut-on payer moins pour le même résultat, et sur quelle
tâche ?**

Référence : le figé `2026-08-20-11h58` et son rapport de mesures, produits par Claude Sonnet 5
sous les prompts A1 + B1 + B2. Cette colonne est **déjà payée** — c'est la confirmation d'hier.

---

## Le principe : deux campagnes, jamais une

Extraction et génération de questions sont deux prompts, deux appels, deux compétences. Les
mélanger donnerait un classement moyen inexploitable et interdirait le routage par tâche — qui
est précisément le gain qu'on cherche.

**Campagne 1 — l'extraction.** Le challenger découpe les 27 dépôts. Mesures : manque, invention,
doublon, attendus. **Aucune question n'est générée** — ces quatre signaux n'en ont pas besoin.
C'est ce qui rend cette campagne bon marché.

**Campagne 2 — les questions.** Le challenger écrit les questions **sur les concepts figés du
11h58**, les mêmes pour tous. Mesures : fidélité, radotage, distribution des formats, obéissance
à la cible vrai/faux. Isolation parfaite, comme au chantier A1.

**En entonnoir** : les quatre challengers passent la campagne 1 ; seuls les **deux meilleurs**
passent la campagne 2. Inutile de payer la génération de questions d'un modèle qui découpe mal.

---

## §1 · La passerelle

**OpenRouter.** Un seul solde en dollars alimente tous les modèles : <cite index="56-1">on
n'achète pas un bloc de crédits GPT et un autre bloc Claude, le coût applicable est déduit du même
solde après chaque requête.</cite> Un seul compte, une seule clé, un seul adaptateur au lieu de
quatre.

Il expose les sorties structurées par `response_format: json_schema`, ce que `schema-de-sortie.ts`
sait déjà produire.

**Trois pièges à traiter dans l'implémentation :**

- **tous les modèles ne supportent pas les sorties structurées** — <cite index="55-1">la requête
  échoue avec une erreur signalant l'absence de support.</cite> Vérifier chaque modèle retenu dans
  le listing OpenRouter **avant** de lancer quoi que ce soit, et échouer proprement au démarrage
  plutôt qu'au milieu d'un passage
- **le cache de prompt ne traverse pas les fournisseurs** — <cite index="55-1">les moteurs doivent
  stocker un instantané du prompt traité, qui n'est pas partagé entre fournisseurs.</cite> Les
  challengers paient donc leur entrée **plein tarif**, alors que la colonne Sonnet tournait à 92 %
  de lecture au cache. Les coûts par colonne ci-dessous en tiennent compte ; ne pas comparer les
  factures brutes entre colonnes, seulement les prix catalogue
- **les crédits peuvent expirer au bout d'un an** — ne pas charger plus que nécessaire

Le client OpenRouter est un module du **banc uniquement**. Il ne touche ni `lib/ai/client.ts`, ni
la production, ni les compteurs de plafond. Le portage propre du gagnant vers la production est un
chantier séparé, à faire une fois seulement, quand on saura qui a gagné.

## §2 · Les challengers

Quatre, choisis pour couvrir trois lignées et deux paliers de prix. Référence : Sonnet 5 à
3 $ / 15 $ le million.

| Modèle                 | Prix in/out     | Ce qu'il teste                       |
| ---------------------- | --------------- | ------------------------------------ |
| **Gemini 3.1 Pro**     | 2 $ / 12 $      | moins cher **et** peut-être meilleur |
| **GPT-5.6 Terra**      | 2 $ / 12 $      | même palier, autre lignée            |
| **Gemini 3.6 Flash**   | 1,50 $ / 7,50 $ | le milieu de gamme suffit-il         |
| **Mistral Medium 3.5** | 1,50 $ / 7,50 $ | hébergement UE, français natif       |

Le français compte : le produit est francophone et le corpus l'est à 26 dépôts sur 27. Mistral est
là pour ça autant que pour son prix.

**Une seconde vague, seulement si le milieu de gamme tient** : un modèle à ~0,50 $ / 1,50 $ diviserait
la facture par six. On ne le teste pas d'emblée — si Flash et Medium s'effondrent, le palier
inférieur est hors sujet et on aura économisé le passage.

## §3 · Le juge

**Contrainte de conception : le juge ne doit appartenir à aucune lignée en compétition** — ni
Anthropic (c'est la référence), ni Google, ni OpenAI, ni Mistral (ce sont les challengers). Un juge
qui note sa propre famille fausse le classement dans le seul sens qu'on ne peut pas corriger.

**Retenu : un modèle léger d'une cinquième lignée** (DeepSeek, Qwen ou MiniMax — trancher sur le
listing OpenRouter au moment de l'implémentation, en prenant le moins cher qui supporte les
sorties structurées et le français).

Ce sont des décisions binaires locales sur des textes courts : la tâche est à la portée d'un petit
modèle, et le coût devient négligeable.

**Validation obligatoire avant la campagne, ~0,15 $ :** faire tourner le juge candidat sur le figé
`11h58` existant et comparer aux verdicts Haiku sur les six témoins connus (`05`, `09`, les deux
paires de `11`, `15`, `16`). Attendu : il reproduit le motif à 5/6 ou mieux. **S'il diverge
franchement, on change de juge candidat avant, pas pendant.** Un juge non validé rend toute la
campagne illisible.

Un seul juge, figé, pour toutes les colonnes des deux campagnes. Son nom figure dans chaque
rapport.

## §4 · Ce qui ne bouge sous aucun prétexte

Le corpus, les trois prompts, les schémas, les cinq planchers, le modèle d'embeddings, le juge, et
les attendus. **Un seul facteur change par colonne : le modèle testé.**

Si un challenger échoue sur le schéma, c'est un résultat — pas une raison d'adapter le prompt pour
lui. On le consigne et il perd des points là-dessus : un modèle qui ne tient pas les sorties
structurées ne peut pas servir en production.

## §5 · La règle de décision — écrite avant de voir les chiffres

C'est le point le plus important de la fiche. Sans règle préalable, on lit les résultats et on
justifie après coup le choix qui arrange.

**Un challenger remplace Sonnet sur une tâche si les trois conditions sont réunies :**

1. **son prix catalogue est inférieur d'au moins 33 %** sur la tâche concernée
2. **aucune mesure ne se dégrade de plus de 20 % en relatif** par rapport à la colonne de référence
3. **aucun plancher absolu n'est franchi** : fidélité ≤ 10 % des questions, manques ≤ à la
   référence sur le corpus, aucun dépôt ne perd d'attendu déjà couvert par la référence

_Amendement du 2026-08-24 (arrêt 2 de la campagne 1) : le plancher manques passe de « ≤ 8 » à
« ≤ à la référence ». La borne fixée à 8 datait du passage 11h58 où la référence Sonnet avait 6
manques ; poser un chiffre absolu figeait un état qui bougerait au prochain figé. La règle scale
désormais avec la référence — on demande simplement de ne pas faire pire que Sonnet. S'applique
aux deux campagnes, y compris rétroactivement à la lecture du rapport aveuglé de la campagne 1._

**En cas d'égalité sur les trois** : le moins cher gagne.

**Si aucun challenger ne passe** : c'est un résultat, et un bon — on garde Sonnet en sachant
pourquoi, au lieu de le supposer.

Les valeurs de référence exactes se lisent dans le rapport du figé `11h58` et se recopient en tête
du rapport de campagne, pour que la comparaison soit lisible sans ouvrir deux fichiers.

## §6 · Le rapport de campagne

Un tableau, une colonne par modèle, une ligne par mesure. Plus, par colonne : le coût réel, le
nombre d'appels, les échecs de schéma, et le prix catalogue par million.

**Et l'aveuglement** : un fichier annexe qui sort, pour chaque mesure, les concepts et questions
produits, étiquetés `A`, `B`, `C`, `D`, `E` — **sans les noms des modèles**, la correspondance dans
un fichier séparé. C'est ce fichier-là qui me sera transmis pour la lecture qualitative. C'est le
protocole de la seule comparaison publique sérieuse sur ce sujet, et il évite de confirmer ce
qu'on espérait.

## §7 · Budget et ordre

| Étape                                                    | Où         | Coût estimé |
| -------------------------------------------------------- | ---------- | ----------- |
| Validation du juge sur le figé existant                  | OpenRouter | ~0,15 $     |
| Campagne 1 — 4 challengers, extraction seule             | OpenRouter | ~2,50 $     |
| Campagne 2 — les 2 meilleurs, questions à concepts figés | OpenRouter | ~3,00 $     |
| Colonne de référence Sonnet                              | déjà payée | 0 $         |
| **Total**                                                |            | **~6 $**    |

Charger **10 $** sur OpenRouter couvre la campagne avec de la marge pour une seconde vague ou un
challenger de plus. Rien de plus ne part sur le compte Anthropic.

**Ordre d'exécution, avec deux arrêts :**

1. Le module OpenRouter et la vérification du support des sorties structurées pour les cinq
   modèles retenus
2. La validation du juge — **arrêt 1** : ses verdicts sur les six témoins me sont montrés avant
   toute campagne
3. Campagne 1, les quatre colonnes
4. **Arrêt 2** : le tableau de la campagne 1 plus le fichier aveuglé. On désigne ensemble les deux
   finalistes selon la règle du §5
5. Campagne 2 sur les deux finalistes
6. Rapport final, révélation des étiquettes, décision

## §8 · Après la campagne — noté, pas fait

- **le portage en production** du ou des modèles retenus, proprement, dans `lib/ai/` — un seul
  chantier, une seule fois, quand on saura qui a gagné
- **les principes d'écriture de prompts** dans le prompt des questions (le prompt dit quoi produire,
  jamais comment bien l'écrire — c'est un levier gratuit documenté)
- **un cinquième juge, la plausibilité des distracteurs** : le point faible documenté des QCM
  générés, et la seule dimension du produit qu'aucune mesure ne couvre. Un juge qui répond au QCM
  **sans le concept**, juste les options : s'il dépasse le hasard, les distracteurs fuient
