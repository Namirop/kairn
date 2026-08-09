# Formulaires

## D'abord : identifier le type de form

Les règles diffèrent selon le type. Ne pas appliquer les mêmes réflexes partout.

- **Création / publication** (écrire un article, un post) → hiérarchie forte entre champs, champ « héros », preview live.
- **Inscription / transactionnel** (signup, checkout) → champs ~égaux, **pas de champ héros artificiel**, priorité à la rapidité de saisie.
- **Conversion / marketing** (lead, paywall) → persuasion *autour* du form (voir dernière section).

> Piège classique : coller un « champ héros 3-4× plus gros » sur un form d'inscription. Sur un signup, tous les champs sont requis et ~égaux — ne pas en fabriquer un héros.

## Hiérarchie des champs *(forms de création surtout)*

**❌ Tell** : 10 champs au même poids visuel, aucune hiérarchie — l'utilisateur ne sait pas ce qui compte.

**✅** Hiérarchiser selon l'importance métier : champ héros (celui qui définit l'action) plus grand / distinctif, champs principaux standard, secondaires plus petits ou repliables. Ex. « publier un article » : titre + contenu = héros ; catégorie, tags, date = secondaires.

## Labels

**❌ Tell visé** : aucune hiérarchie dans un form mou (tout au même poids, labels et contenu se valent).

**✅** Le tell, c'est l'**absence de hiérarchie**, pas le poids du label. Deux styles valides :
- **Bold / dark** (souvent plus clair en transactionnel) — la hiérarchie vient alors de la position + des inputs bien délimités.
- **Muted / uppercase / petit** (style éditorial).

Choisir selon la DA, ne pas imposer le muted. L'astérisque d'obligation reste muted (pas rouge ni brand) : l'obligation n'est pas une alerte.

## Décision importante : toggle, pas checkbox sèche

**❌ Tell** : checkbox 16×16 sèche au milieu du form pour une décision à impact (« Mettre en avant », « Activer les notifications »).

**✅** Si la décision a un impact (visibilité, paiement, sécurité), la traiter comme une décision : toggle proéminent, label sur 2 lignes (titre fort + sous-texte qui explique l'impact), placée après un séparateur, pas noyée.

```tsx
<div className="flex gap-4 pt-8 border-t">
  <Toggle />
  <div>
    <p className="font-medium">Mettre en avant comme analyse du jour</p>
    <p className="text-sm text-muted-foreground">1 par jour. Visibilité maximale sur ton profil.</p>
  </div>
</div>
```

## Une donnée = un champ

**❌ Tell** : deux dropdowns « HH » « MM » pour une heure, trois pour une date.

**✅** Un seul input texte avec **parse libre** côté JS (heure : « 18h30 », « 18:30 », « 1830 » ; date : « 12/03 », « 12 mars »), normalisé au submit. Plus rapide à saisir, plus naturel.

## Bouton submit

**❌ Tell** : pavé full-width générique « Envoyer » / « Continuer ».

**✅** Label **métier** (« Publier l'analyse », « Devenir membre »), taille mesurée, aligné à droite, flèche typographique (« Continuer → ») plutôt qu'icône générique. C'est le seul endroit du form où l'accent brand vit légitimement. Sur mobile, le full-width redevient OK ; le label reste métier.

## Validation / états d'erreur

**❌ Tell** : validation native HTML (la bulle du navigateur) — moche, incohérente, casse le design. Ou des erreurs qui **décalent le layout** en apparaissant.

**✅** :
- `noValidate` sur le `<form>` + erreurs **custom inline**. Jamais la bulle native.
- **Réserver l'espace** du message d'erreur → le layout ne saute pas quand l'erreur apparaît.
- L'erreur **remplace le helper dans le même slot** (pas d'empilement helper + erreur).
- **Messages spécifiques et utiles** (« Code postal BE : 4 chiffres, ex 1000 »), pas « Champ invalide ».
- **Timing** : valider au **submit** d'abord, puis re-valider au change/blur **uniquement les champs déjà en erreur**. Pas de rouge à chaque frappe.
- **Traitement** : bordure + message en rouge sémantique. Mettre le **label en rouge** aussi est un choix (acceptable) ; le laisser lisible (seuls bordure + message rouges) préserve mieux la scannabilité — au choix selon la DA.
- Pas de **vert** sur champ valide : le neutre suffit (cohérent avec les états sémantiques, voir `couleur.md`).

## Page de conversion (form marketing)

**❌ Tell** : titre + form vide sur fond neutre, zéro persuasion. Conversion plate.

**✅** Structurer la page autour du form : hero éditorial (promesse + sous-titre + visuel non-abstrait), bénéfices concrets avant le form, form en 2 colonnes (form + preview/preuve sociale/explication), FAQ qui traite les objections après. Densité utile, pas de vide. Sur mobile, tout s'empile, le form reste prioritaire.
