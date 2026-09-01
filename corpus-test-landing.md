# Corpus de test — dépôt sans compte (landing Kairn)

**Ce que ce test mesure — et ce qu'il ne mesure pas.**

Il vérifie **le chemin public** : que la page répond, en combien de temps, que les refus refusent,
que les bornes tiennent, que le plafond anonyme coupe proprement. C'est la tuyauterie que le banc
n'a jamais empruntée.

Il ne mesure **pas la qualité** du découpage ni des questions. Celle-là est mesurée par le banc
sur 27 dépôts et cinq axes ; la refaire ici serait payer deux fois la même réponse.

Conséquence directe : **les nombres de concepts ci-dessous sont des ordres de grandeur, pas des
attendus.** Les prompts B1/B2 fusionnent les conséquences dans leur concept parent — sur les
témoins du banc, ça a réduit les comptes de 25 à 50 %. Un texte qui rend moins que le chiffre
annoncé n'est pas un défaut : c'est le comportement voulu. Ce qui se juge ici, c'est que ça rende,
pas combien.

État de référence : figé `2026-08-20-11h58`, prompts A1 + B1 + B2, `openai/gpt-5.6-luna` en
production via OpenRouter.

Bornes : min 40 caractères, max 4000 caractères. Plafond produit : 20 concepts par dépôt, appliqué
par découpe côté serveur.

---

## À vérifier avant de commencer

- **`ESSAI_ANONYME_SANS_LIMITE` doit être à `false`** en production. Le drapeau servait pendant la
  campagne ; ouvert en prod, c'est la porte grande ouverte. À contrôler explicitement, pas à
  supposer
- **Le chrono tourne sur chaque essai : la latence est le chiffre le plus important de ce test.**
  Personne ne l'a mesurée sur Luna — la campagne portait sur la qualité et le prix. Une landing
  qui met vingt secondes ne convertit pas, même avec des questions parfaites
- Après chaque essai, relever dans `AiCall` : le fournisseur et le modèle réellement servis, et si
  une bascule vers Sonnet a eu lieu

---

## A — Bornes basses

### A1 · Sous le minimum → refus Zod, aucun appel modèle

_(31 caractères)_

```
Les lichens poussent lentement.
```

**Attendu** : message Zod « Colle un peu plus de matière… ». Aucun essai consommé, aucun coût, et
**aucune ligne `AiCall`** — c'est vérifiable à la ligne près.

---

### A2 · Juste au-dessus du minimum → ça rend

_(113 caractères)_

```
Un lichen n'est pas une plante mais l'association d'un champignon et d'une algue, chacun incapable de vivre seul.
```

**Ordre de grandeur** : ~1 concept. Le prompt appelle explicitement ce cas « un bon résultat, pas
un échec ». Ce qui compte : que ça rende quelque chose et que l'écran l'affiche correctement.

---

## B — Formats courts, domaines variés

### B3 · Cuisine — une phrase dense

_(242 caractères)_

```
La réaction de Maillard n'est pas une caramélisation : elle fait réagir un sucre avec un acide aminé, pas un sucre avec lui-même. Elle démarre vers 140 °C, ce qui explique pourquoi une viande jetée dans une poêle trop froide ne brunit jamais.
```

**Ordre de grandeur** : 1 à 2 concepts. La règle de fusion peut légitimement rattacher le seuil de
température au concept de la distinction Maillard/caramélisation.

---

### B4 · Droit du travail — fait sec

_(196 caractères)_

```
En France, la période d'essai d'un CDI cadre est de quatre mois maximum, renouvellement compris elle ne peut pas dépasser huit mois. Le renouvellement doit être prévu par la convention collective.
```

**Ordre de grandeur** : 1 à 2 concepts. Contrôle qui reste valable quel que soit le compte : le
modèle ne doit pas fabriquer de contexte juridique absent du texte.

---

### B5 · Sport / physiologie — vocabulaire courant

_(344 caractères)_

```
Les courbatures ne viennent pas de l'acide lactique. Le lactate est évacué en une heure ou deux après l'effort, alors que les courbatures apparaissent douze à quarante-huit heures plus tard. Ce sont des micro-déchirures des fibres musculaires, provoquées surtout par la phase excentrique du mouvement — celle où le muscle s'allonge sous charge.
```

**Ordre de grandeur** : 2 à 3 concepts. Le vrai contrôle ici est binaire : le texte contient une
idée fausse répandue **corrigée**, donc le modèle ne doit **pas** poser `uncertain`.

---

## C — Formats moyens

### C6 · Finance personnelle — explication propre

_(739 caractères)_

```
Le taux de rendement interne et le rendement annualisé ne mesurent pas la même chose. Le rendement annualisé regarde le point de départ et le point d'arrivée d'un capital, et déduit un taux moyen ; il ignore complètement les versements faits entre les deux. Le TRI, lui, tient compte de la date de chaque versement, ce qui le rend beaucoup plus juste quand on investit régulièrement plutôt qu'en une fois.

La conséquence pratique est contre-intuitive : deux personnes qui finissent avec la même somme sur le même support peuvent avoir des TRI très différents, simplement parce que l'une a versé tôt et l'autre tard. C'est pour ça qu'un rendement annoncé par un fonds ne dit presque rien de ce qu'un investisseur donné a réellement obtenu.
```

**Ordre de grandeur** : 2 à 3 concepts.

---

### C7 · Explication maladroite, à l'oral — le prompt doit reformuler

_(555 caractères)_

```
alors en gros la franchise c'est le truc que toi tu payes avant que l'assurance paye. genre t'as 300 balles de franchise, ta bagnole elle en a pour 1000 de réparation, ben t'en sors 300 et eux ils mettent les 700. et du coup si le truc coûte moins que la franchise ben en fait ça sert à rien de déclarer, t'as tout à payer quand même et en plus ça peut te faire monter ta cotisation l'année d'après. après y'a des franchises fixes et des franchises en pourcentage, genre 10% du montant, et là plus le sinistre est gros plus tu raques, c'est un peu vicieux
```

**Ordre de grandeur** : 2 à 3 concepts, reformulés dans une langue nette. Contrôle binaire : le
modèle ne doit inventer ni plafond légal ni information absente du texte.

---

### C8 · Notes décousues, en puces

_(607 caractères)_

```
Réunion urbanisme mardi — notes

- ZAN = zéro artificialisation nette, objectif 2050
- palier intermédiaire : diviser par 2 le rythme d'artificialisation d'ici 2031, référence = décennie 2011-2021
- ce n'est PAS interdiction de construire, c'est compensation : ce qu'on artificialise doit être renaturé ailleurs
- la renaturation coûte 5 à 10x plus cher que l'artificialisation évitée, d'où l'intérêt de densifier
- friches industrielles = angle mort, leur réhabilitation ne compte pas comme artificialisation
- les petites communes rurales sont les plus touchées parce qu'elles partaient d'un rythme faible
```

**Ordre de grandeur** : 3 à 5 concepts. Cas important, et son contrôle est binaire, pas un compte :
le prompt rejette les notes d'**organisation**, mais ceci est une note **de contenu**. Si c'est
rejeté, le prompt confond les deux.

---

## D — Cas de contrôle

### D9 · Affirmation factuellement fausse → `uncertain: true`

_(220 caractères)_

```
La Grande Muraille de Chine est la seule construction humaine visible à l'œil nu depuis la Lune. Elle mesure environ 21 000 kilomètres et a été construite d'un seul tenant sous la dynastie Qin, en une trentaine d'années.
```

**Attendu, binaire** : concepts extraits **tels quels**, marqués `uncertain`. Le modèle ne doit ni
corriger, ni ajouter la version juste. Vérifier ensuite qu'aucune question n'est écrite dessus.

---

### D10 · Anglais → sortie en anglais

_(360 caractères)_

```
Survivorship bias is the error of concentrating on the entities that made it past a selection process and overlooking those that did not. The classic example is Abraham Wald's work on returning bombers: the armour should go where the returning planes were not hit, because the planes hit in those places never came back. The absence of data is itself the data.
```

**Attendu, binaire** : concepts en anglais. Teste « Écris dans la langue du dépôt ».

---

### D11 · Pavé collé d'article — sujet non technique

_(1 876 caractères)_

```
Pendant longtemps, on a expliqué la disparition des mammouths laineux par la chasse humaine, puis par le réchauffement de la fin du Pléistocène. Les deux hypothèses tenaient mal seules : la chasse n'expliquait pas pourquoi les populations continentales s'effondrent bien avant le pic de pression humaine, et le climat n'expliquait pas pourquoi l'espèce avait survécu à plusieurs réchauffements comparables au cours des cent mille années précédentes.

Le modèle qui s'est imposé combine les deux, mais pas comme une simple addition. Le réchauffement fragmente l'habitat de steppe à mammouths en poches isolées ; c'est cette fragmentation, plus que la perte de surface totale, qui compte. Une population dispersée sur un grand territoire continu absorbe une mauvaise année ; la même population coupée en douze poches sans échange perd une poche à chaque mauvaise année, et ne la recolonise jamais. La chasse humaine intervient alors sur des groupes déjà réduits, où le prélèvement de quelques individus reproducteurs suffit à basculer la démographie.

L'ultime population, sur l'île de Wrangel, a tenu jusqu'à environ 1700 avant notre ère — soit mille ans après la construction des premières pyramides. Son génome montre une accumulation de mutations délétères typique d'une population très réduite : perte de l'odorat, anomalies du pelage, baisse de la fertilité mâle. On appelle ça une fusion génomique, et c'est un piège dont on ne sort pas : moins d'individus, donc moins de sélection efficace contre les mauvaises mutations, donc encore moins d'individus.

Ce schéma — fragmentation, puis petites populations, puis dette génétique — n'est pas propre aux mammouths. C'est le mécanisme central de la biologie de la conservation moderne, et c'est pour ça qu'on se bat autant pour les corridors écologiques : ils rendent à une population fragmentée sa continuité démographique.
```

**Ordre de grandeur** : 4 à 7 concepts. Deux contrôles binaires qui, eux, ne dépendent pas du
compte : le texte revient deux fois sur la fragmentation (la déduplication doit tenir), et aucun
concept ne doit dire « ce mécanisme » sans se suffire à lui-même.

---

### D12 · Presque à la borne — ~3 750 caractères

_(à assembler : coller D11 deux fois de suite, séparé par une ligne vide)_

**Attendu** : le nombre de concepts ne doit **pas** doubler — la déduplication doit absorber la
répétition. Teste aussi l'affichage à hauteur bornée (3 visibles + défilement) et le comportement
à l'approche de la borne des 4000 caractères.

Le plafond serveur de **20 concepts** n'est pas en jeu ici — aucun texte du corpus n'en approche.
S'il l'était, la découpe serveur s'appliquerait, avec son drapeau de troncature calculé côté
serveur.

---

### D13 · Dépassement de borne → refus client + serveur

_(coller D11 trois fois : ~5 600 caractères)_

**Attendu** : bouton désactivé, compteur en `text-alerte`, et si l'envoi passe quand même, refus
Zod côté serveur. Aucun essai consommé, aucun coût, aucune ligne `AiCall`.

---

## E — Sans concept extractible (test des rejets)

### E14 · Organisation pure

_(256 caractères)_

```
Penser à rappeler le garage avant vendredi pour le contrôle technique, récupérer le colis au point relais avant qu'il reparte, relancer Julien sur le devis, et bloquer deux heures samedi matin pour finir le rangement du garage. Acheter des piles AAA aussi.
```

**Attendu** : `REJECTED`. Le message doit être à la deuxième personne et dire ce qui manquerait —
pas « ce texte est invalide ».

---

### E15 · Opinion et ressenti, sans contenu factuel

_(311 caractères)_

```
Franchement je sais pas quoi penser de cette série. Les trois premiers épisodes m'ont scotché, après ça retombe complètement et la fin je l'ai vue venir à des kilomètres. Les acteurs sont bons mais le scénario tourne en rond. Je pense que je vais quand même regarder la saison 2, ne serait-ce que par curiosité.
```

**Attendu** : `REJECTED`. Un modèle trop serviable peut en tirer « la série X a une structure en
trois actes » — ce serait un faux positif, et il faut le voir.

---

### E16 · Trop vague pour une question précise

_(201 caractères)_

```
Il faut vraiment que je fasse plus attention à ma manière de communiquer au travail, être plus clair, plus direct, moins dans l'implicite. Ça éviterait beaucoup de malentendus sur les projets en cours.
```

**Attendu** : `REJECTED`. Cas limite : il y a une idée, mais aucune sur laquelle on puisse se
tromper. Si ça passe, le critère « on peut se tromper dessus » est trop lâche.

---

## F — Deux textes frais, choisis au moment du test

Les corpus figés ont un angle mort : à force de les repasser, on finit par tester ce qu'on a appris
à réussir. **Prendre deux textes jamais vus** — un article de blog, une page de documentation
technique — et les coller tels quels.

C'est le cas réel du visiteur, et c'est là que sortent les surprises qu'un corpus maison ne montre
pas.

---

## Ordre de passage

Le plafond anonyme est **actif**, donc les essais se consomment. Le tester volontairement en fin
de série.

1. **A1, D13** — les refus gratuits : aucun appel modèle, aucun essai consommé
2. **A2, B3, B4, B5** — les courts
3. **E14, E15, E16** — les rejets, enchaînés pour observer le compteur d'essais
4. **C6, C7, C8** — les moyens
5. **D9, D10** — les cas de contrôle binaires
6. **D11, D12** — les longs, et le chrono de latence sur les plus gros
7. **F** — les deux textes frais
8. **Le plafond** — un essai de trop : doit couper avec un message clair, pas une erreur 500

## Ce qu'on note pour chaque essai

Latence · concepts et questions rendus · fournisseur et modèle servis · bascule (oui/non) · et une
ligne libre : **ce qui a tiqué à l'écran**, même sans savoir le nommer.

Cette dernière colonne est la plus précieuse du fichier. C'est le seul endroit du dispositif où un
humain regarde le produit comme un visiteur, et pas comme une mesure.
