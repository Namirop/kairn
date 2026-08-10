# Cairn — Phase 2 : l'ingestion

C'est la phase qui rend le produit utilisable. À la fin, on dépose quelque chose et ça devient des
concepts avec leurs questions, sans intervention. La révision reste pour la phase 3.

Relis `CLAUDE.md`. Tout ce qui suit s'y ajoute sans le contredire.

---

## 1. Le geste de dépôt

Un seul écran, un seul champ. Une grande zone de texte, et un bouton pour joindre une image. Pas
d'onglet « texte » / « image », pas de choix de type : on colle ce qu'on a.

**Aucun bouton « générer ».** On dépose, ça part, on revient à la liste. C'est une contrainte de
conception, pas une préférence : le produit repose sur la vitesse du geste.

Limites, appliquées côté serveur :

- 8000 signes de texte par dépôt — soit environ 2000 tokens, un coût négligeable, et de quoi coller
  un article entier. Au-delà, un message qui dit quoi faire, pas une erreur brute.
- Une image par dépôt, 5 Mo avant compression, formats courants uniquement, type vérifié sur le
  contenu et pas sur l'extension.
- Texte et image peuvent coexister : le texte sert alors de contexte à la lecture de l'image.

**L'image n'est pas conservée.** Elle est compressée, envoyée au modèle, et les octets sont jetés
une fois `extractedText` obtenu. Une capture d'écran contient souvent bien plus que ce que son
auteur croit y montrer — barre latérale, notifications, onglets. Ne pas la stocker supprime la
question. Ce que l'utilisateur relira, c'est le texte extrait. Adapte le schéma en conséquence :
`imageUrl` n'a plus de raison d'être.

Protège contre le double envoi : un même dépôt soumis deux fois ne crée pas deux `Input`.

---

## 2. Le pipeline

```
Input créé (PENDING)
  ├─ si image : job OCR          → extractedText
  ├─ job extraction              → les Atoms
  └─ jobs variantes, par 3       → les Variants
Input READY
```

Un échec à une étape met l'`Input` en `FAILED` avec un motif lisible par l'utilisateur, et laisse
en place ce qui a déjà abouti. Un dépôt dont l'extraction a réussi mais dont les questions ont
échoué garde ses concepts : on ne jette rien de ce qui a coûté un appel.

Les jobs passent par la file existante et son exécuteur. Trois tentatives, pas de retry à
l'intérieur d'un appel.

Un atome marqué `uncertain` ne déclenche aucune génération, comme en phase 1.

---

## 3. Le Batch API — et où le mettre exactement

C'est le dernier levier de coût : moitié tarif, en échange d'une latence de quelques minutes à
quelques heures.

**L'extraction reste en appel normal. La génération de variantes passe en batch.**

Le raisonnement tient au moment où chaque résultat est attendu. Les concepts sont le retour visible
du dépôt : l'utilisateur veut voir « 5 concepts » rapidement, c'est ce qui lui dit que son geste a
servi à quelque chose. Les questions, elles, ne sont utiles qu'à la première révision, au plus tôt
le lendemain. Elles peuvent attendre des heures sans que personne le remarque.

Et c'est là qu'est l'argent : la génération de variantes représente environ 70 % des tokens de
sortie, donc l'essentiel de la facture.

Concrètement : les lots de variantes sont accumulés et soumis en batch, un cron relève les
résultats et termine les jobs. Un batch qui n'a pas répondu au bout d'un délai raisonnable est
signalé, pas relancé en boucle.

Ce chemin passe par `callAI()` comme le reste. Aucun appel au SDK ailleurs, et la réservation de
place au plafond journalier vaut aussi pour les appels groupés — compte chaque requête du lot.

---

## 4. Les quotas

Pas de paiement dans cette phase, donc un plafond simple et lisible : **5 dépôts par jour et par
utilisateur**, compté sur la table `DailyUsage` qui existe déjà.

Quand le plafond est atteint, l'écran ne dit pas « erreur ». Il dit ce qui se passe, quand ça se
remet à zéro, et propose de s'inscrire sur une liste d'attente pour un accès plus large. Cette
liste est une simple table et un bouton — elle te donnera un signal de demande gratuit, bien avant
d'avoir quoi que ce soit à vendre.

Limite aussi le débit par utilisateur sur la route de dépôt elle-même, indépendamment du quota
journalier : le quota protège ton budget, la limite de débit protège ton serveur.

---

## 5. La liste des dépôts, et l'état d'avancement

Un écran qui liste ce qu'on a déposé, du plus récent au plus ancien. Pour chacun : un extrait du
contenu, le nombre de concepts, l'état.

Les états doivent être nommés du point de vue de l'utilisateur, pas du système. Pas `PROCESSING` :
« lecture de l'image », « découpage en concepts », « écriture des questions », « prêt ». Il doit
comprendre ce qui se passe sans avoir à demander.

Les concepts apparaissent **dès que l'extraction a abouti**, sans attendre les questions. C'est le
retour qui compte, et c'est aussi ce qui rend le batch acceptable.

---

## 6. Corriger un concept

Deux cas réels, vus au banc, qui demandent la même fonctionnalité.

Le premier : un concept extrait contenait « la précédente », qui renvoyait hors de lui-même. En
révision, il serait sans réponse possible.

Le second : les concepts marqués douteux attendent une décision.

Depuis le détail d'un dépôt, l'utilisateur peut donc, sur un concept :

- **le modifier** — le texte est réécrit, ses variantes existantes sont supprimées et
  regénérées
- **le supprimer** — lui et ses variantes
- **le confirmer**, quand il est douteux — la génération part alors normalement

Pour un concept douteux, dis pourquoi il est signalé, sans donner la version « juste » : on n'a pas
vérifié, et affirmer serait pire que douter. La formulation compte, écris-la sobrement.

Une modification remet le concept à zéro côté planification. C'est un nouveau concept pour la
mémoire, même s'il garde son identifiant.

---

## 7. Sécurité

Rien de nouveau, mais c'est la première phase où des données utilisateur circulent vraiment.

- Toute mutation vérifie la session **et** la propriété de la ressource. Un `userId` ne vient jamais
  du client.
- Zod sur chaque entrée, y compris les métadonnées d'un fichier.
- Le contenu déposé n'est jamais écrit dans les logs. Les logs portent des identifiants.
- Un `Input` supprimé emporte ses `Atom` et leurs `Variant`.

---

## 8. Ce qui n'est PAS dans cette phase

Le moteur de révision, la rotation des variantes, les états de maîtrise, le tableau de bord, la
gamification, l'envoi de notifications. Rien de tout ça, même si c'est tentant en passant.

---

## 9. Vérification

- [ ] Un dépôt texte produit ses concepts puis ses questions, de bout en bout, en mode mock
- [ ] Un dépôt image aussi, et les octets de l'image ne sont nulle part après coup
- [ ] Un échec à mi-parcours laisse en place ce qui a abouti et affiche un motif lisible
- [ ] Le double envoi ne crée qu'un `Input`
- [ ] Le sixième dépôt du jour est refusé avec l'écran prévu, pas une erreur
- [ ] Modifier un concept supprime bien ses anciennes variantes
- [ ] Aucun atome `uncertain` n'a déclenché de génération
- [ ] Les appels groupés passent par `callAI()` et consomment leur place au plafond
- [ ] `npm test`, typecheck, build, ESLint, `verify:ai` : propres
- [ ] Correct à 375 px et à 1440 px, navigation clavier possible
- [ ] Aucun fichier au-delà de 200 lignes

Ne lance rien contre l'API : Romain lance lui-même.

Récapitulatif à la fin, et signale-moi tout ce qui te paraît produire un mauvais résultat — en
particulier sur le découpage batch/normal, qui est une décision que j'ai prise sur un raisonnement
et pas sur une mesure.
