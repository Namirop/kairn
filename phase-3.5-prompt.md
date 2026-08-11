# Cairn — Phase 3.5 : les deux modes, et ce que le premier usage réel a révélé

Romain a utilisé le produit avec ses propres dépôts. Plusieurs choses ne vont pas, et la plupart
viennent de mes consignes, pas de ton travail.

Ordre imposé : les changements de prompt et le rejeu du banc d'abord, le reste ensuite. On ne mesure
pas la qualité des questions en même temps qu'on change le moteur.

---

## 1. Le format manquant : le texte à trou

Aujourd'hui, hors code, il ne reste que QCM et vrai/faux comme formats vérifiables. Trois
emplacements à remplir avec deux formats : la répétition est forcée.

Ajoute `CLOZE` à l'énumération des formats. Une phrase du concept dont on masque le terme porteur de
sens, la personne écrit ce qui manque.

**La vérification ne coûte aucun appel modèle.** La tolérance se paie à la génération : le modèle
rend, avec la question, la liste des formes acceptées. La comparaison vit dans `lib/domain/`, en
fonction pure — minuscules, accents retirés, espaces normalisés, et une tolérance d'un ou deux
caractères de distance d'édition sur les mots longs uniquement. Testée, instantanée, gratuite.

Quand la réponse ne correspond pas, on affiche le terme attendu avec une action « je l'avais » : la
personne se juge, mais seulement dans ce cas.

Côté schéma, un objet `cloze` facultatif à côté de `mcq`, portant la phrase trouée et les formes
acceptées. La contrainte croisée — `cloze` présent si et seulement si le format est `CLOZE` — va
dans le schéma de validation, jamais dans le schéma de forme.

---

## 2. Le quota de formats

Sur un concept réel, Romain a reçu trois questions sur quatre en texte libre auto-noté. C'est
épuisant, et personne ne se juge honnêtement trois fois de suite — on finit par cliquer « je
savais » pour avancer, et la planification devient du bruit.

Ma contrainte de la phase 1.2 mesurait la mauvaise chose : « deux formats au plus partagés » était
déjà satisfaite par un quatuor dont trois formats sont auto-notés.

Remplace la section `LES FORMATS` de `generate_variants` par ceci, mot pour mot :

```
LES FORMATS

Le format n'est pas déterminé par la facette. Chaque facette s'écrit dans
plusieurs formats, et c'est le contenu du concept qui tranche.

RECOGNITION : MCQ, CLOZE, TRUE_FALSE, SHORT_ANSWER
MECHANISM   : EXPLAIN, CLOZE, MCQ, CODE, SHORT_ANSWER
BOUNDARY    : TRUE_FALSE, MCQ, CLOZE, SHORT_ANSWER
APPLICATION : MCQ, CODE, CLOZE, SHORT_ANSWER, EXPLAIN

Au plus une des quatre questions se répond en texte libre — c'est-à-dire au
format SHORT_ANSWER ou EXPLAIN, où la personne écrit puis se juge elle-même.
Les trois autres ont une réponse vérifiable sans jugement : MCQ, TRUE_FALSE,
CLOZE ou CODE. Une suite de questions à s'auto-noter épuise, et finit par être
expédiée sans être lue.

Deux questions au plus partagent le même format.

Si le concept cite du code — un identifiant entre accents graves, un appel de
méthode, une instruction, une commande, un en-tête —, une des quatre questions
emploie CODE. La citation suffit à déclencher la règle : ce n'est pas une
appréciation à porter sur le sujet du concept. Cette question montre un extrait
court et demande ce qu'il produit, ce qui lui manque, ou ce qui le casse.

CLOZE : une phrase du concept dont on masque le terme porteur de sens. Le trou
fait un à trois mots, jamais une proposition entière. Ne masque ni un article,
ni un mot de liaison, ni un verbe passe-partout : ce qui disparaît doit être ce
qui constitue la connaissance, de sorte que retrouver le mot revienne à savoir
la chose. Donne les formes acceptées : le terme lui-même, ses variantes de
nombre et de genre, ses abréviations d'usage. « les rayons ultraviolets »
accepte « ultraviolets », « ultraviolet », « UV ».

MCQ : exactement quatre options. Chaque mauvaise option est fausse pour une
raison précise, une confusion que quelqu'un pourrait réellement avoir. Une
option manifestement absurde rend la question inutile. Les quatre options ont
une longueur et une forme comparables : la bonne réponse ne doit pas se repérer
à sa taille.

TRUE_FALSE : l'affirmation est fausse à peu près une fois sur deux. Quand elle
est fausse, elle l'est d'un cheveu — une condition inversée, un cas particulier
étendu à tous — pas grossièrement.

SHORT_ANSWER et EXPLAIN : la personne répond en texte libre et jugera elle-même.
Écris `answerKey` pour qu'elle puisse se juger honnêtement : les points attendus,
formulés simplement, et ce qui compte comme une réponse insuffisante.
```

Ajoute deux contrôles automatiques : au plus une question en texte libre par lot, et la longueur du
trou sur les `CLOZE`.

---

## 3. Le corpus n'est plus un corpus de développeur

J'ai poussé l'angle « développeurs » très tôt et tout en a découlé — le corpus, la landing, les
exemples. Romain a tranché : c'est un produit généraliste, pour retenir n'importe quoi.

Ajoute au corpus du banc trois dépôts hors informatique, de registres différents — une observation
scientifique, un fait pratique, quelque chose de moins structuré. Ils doivent exercer le `CLOZE` et
prouver que la règle `CODE` ne se déclenche jamais dessus.

---

## 4. Point de contrôle

Rejeu du banc sur les concepts figés, plus le nouveau corpus. Ce qu'on regarde :

- au plus une question en texte libre par lot, sur tous les lots
- la répartition des formats, `CLOZE` compris
- aucun `CODE` sur les dépôts non techniques
- la qualité des trous : est-ce que le mot masqué est bien celui qui porte la connaissance

**Arrête-toi là et rends le rapport.** La suite ne dépend pas des prompts.

---

## 5. Les deux modes

C'est le cœur de cette phase.

### La session du jour

Inchangée. Les concepts dus, une question par concept, ça compte, ça replanifie.

### L'entraînement libre

Illimité, à la demande. Il pioche dans les **autres facettes** des concepts existants — deux
concepts donnent huit questions disponibles.

Il existe parce qu'au démarrage, un compte neuf fait le tour de sa session en quelques questions et
se retrouve devant « reviens demain ». C'est le moment où on perd les gens.

**Et il ne touche à rien de la mémoire :**

- il ne déplace aucune échéance, ne modifie ni stabilité, ni difficulté, ni état de maîtrise
- il ne déclenche jamais le signal « tu maîtrises ça » — trois bonnes réponses de plus en plus
  rapides en dix minutes, c'est de la mémoire de travail, pas de la maîtrise
- il n'entre pas dans le compteur qui pilote la rotation de la session du jour

Sans cette étanchéité, quelqu'un qui tourne cinq fois sur un concept dans l'heure verrait son
intervalle sauter à un mois, et l'aurait oublié la semaine suivante. C'est exactement ce que le
produit existe pour empêcher.

**Deux compteurs par variante**, donc : les passages en session, les passages en entraînement. La
rotation de la session ne lit que le premier. Les révisions d'entraînement sont enregistrées et
portent leur mode — elles servent l'historique, pas la planification.

### Ce que les écrans disent

À la fin de la session du jour, deux propositions, dans cet ordre : **ajouter quelque chose**, puis
**s'entraîner**. La boucle de croissance du produit, ce sont les dépôts ; quelqu'un avec deux
concepts n'a pas un problème de session, il a un problème de contenu.

L'explication du principe apparaît **une seule fois**, à la première ouverture de l'entraînement.
Pas de fenêtre qui barre la route à chaque fois : un péage, on apprend à le cliquer sans le lire.
Ensuite, une ligne discrète et permanente sur l'écran d'entraînement suffit : ça ne change pas le
planning.

---

## 6. La régénération suit l'usage réel

Le seuil de la phase 3 — chaque facette vue trois fois — lit désormais **la somme des deux
compteurs**. Quelqu'un qui tourne beaucoup en entraînement use ses questions et déclenche leur
renouvellement, sans bouton et sans décision à prendre.

Un plafond de fréquence par concept : pas plus d'une régénération tous les sept jours. Il protège
le budget et empêche la boucle.

Les nouvelles variantes servent les deux modes : elles appartiennent au concept.

---

## 7. Les questions arrivent tout de suite

Ma décision de passer les variantes par le lot groupé reposait sur « les questions ne servent qu'au
lendemain ». L'entraînement libre l'invalide : on dépose, on veut jouer.

Repasse la génération de variantes en appel direct. Ça double ce poste — de 0,005 $ à 0,01 $ par
concept — et à ce niveau, casser le geste n'en vaut pas la peine.

Garde le chemin groupé en place et testé : il servira pour la régénération, qui elle peut attendre.

---

## 8. L'archivage passe à trois mois

Six mois était trop long. Trois mois suffisent pour qu'oublier ait le temps de se produire, et c'est
une promesse qu'on peut tenir devant l'utilisateur. Constante nommée, et le texte de l'écran suit.

---

## 9. Les écrans

**« 8 concepts arrivent à échéance »** est du jargon d'algorithme. « 8 concepts à revoir
aujourd'hui ».

**La section « En cours »** de la page d'accueil disparaît. Elle liste ce que la session va servir,
donc elle fait doublon avec le bouton juste au-dessus — et elle dévoile les concepts avant qu'on les
travaille.

**La page de détail d'un dépôt n'affiche plus les questions.** Les lire hors session revient à se
gâcher la surprise. Elle montre le dépôt, ses concepts, leur état, et les actions : modifier,
supprimer, désarchiver.

**La landing et les exemples** sortent du registre technique. Aujourd'hui tout parle de code ; le
produit sert à retenir n'importe quoi.

---

## 10. Vérification

- [ ] Aucun lot ne porte plus d'une question en texte libre
- [ ] `CLOZE` se vérifie sans appel modèle, et la tolérance est testée : accents, casse, pluriel,
      abréviation, faute de frappe, réponse fausse
- [ ] Une révision d'entraînement ne modifie ni échéance, ni stabilité, ni difficulté, ni état
- [ ] Elle ne déclenche jamais le signal de maîtrise — testé
- [ ] Elle n'entre pas dans le compteur de rotation de la session — testé
- [ ] Le seuil de régénération lit bien la somme des deux compteurs
- [ ] Le plafond de sept jours par concept tient
- [ ] Un dépôt rend ses questions en appel direct, sans attendre le cron
- [ ] `npm test`, typecheck, build, ESLint, `verify:ai`, `verify:session` : propres
- [ ] Correct à 375 px et à 1440 px, navigation clavier sur les deux modes

Ne lance rien contre l'API : Romain lance lui-même, et s'arrête au point de contrôle du §4.

Récapitulatif à la fin, et signale ce qui te paraît produire un mauvais résultat.
