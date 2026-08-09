# Mobile (app native)

Ce fichier ne remplace pas les autres : structure, typographie, couleur, décoration s'appliquent tels quels. Il traite ce qu'une app native a en plus — la main qui tient l'appareil, le système sous l'interface, et les tells propres aux frameworks mobiles.

Rappel du principe n°1 : rien n'est interdit ici non plus. Bottom sheets, tab bars, cards, animations sont tous légitimes ; c'est l'usage par défaut et uniforme qui est le tell.

## Le tell n°1 : le framework par défaut

**❌ Tell** : `ThemeData` non touché, `Colors.blue`, `Card()` avec son `elevation` d'origine, `ListTile` brut, `AppBar` standard, `ElevatedButton` partout. C'est le « Bootstrap de Flutter » — reconnaissable en une capture, sur toutes les plateformes.

**✅** Le premier geste d'un projet mobile n'est pas un écran, c'est le **thème** : palette, échelle typographique, échelle d'espacement, rayons, élévations. Ensuite les composants système ne sont utilisés que **stylés**, ou remplacés par des primitives maison.

**Test** : « si je remplace le contenu par du lorem, est-ce que ça reste reconnaissable comme *cette* app ? » Si la réponse tient au logo seul → le thème n'existe pas encore.

**Corollaire Material vs Cupertino** : choisir une DA propre et l'assumer sur les deux plateformes est un choix valide et souvent meilleur que du Material par défaut. Suivre la plateforme n'a de sens que pour les gestes système (retour, partage, sélection de texte), pas pour l'apparence.

## Zones d'atteinte

**❌ Tell** : action principale en haut à droite, barre d'outils dense en haut, navigation en tiroir hamburger. Ce sont des dispositions **web** transposées sans réflexion — sur un écran de 6", le haut est la zone la plus difficile à atteindre.

**✅** Répartir selon l'effort :
- **Tiers bas** = actions primaires, navigation, validation. C'est là que le pouce vit.
- **Tiers haut** = lecture, titre, contexte, statut. Action secondaire ou destructive uniquement (l'inconfort est une protection).
- Une action détruit/irréversible ne doit **jamais** tomber sous le pouce au repos.

## Cibles tactiles

**❌ Tell** : icônes de 24 dp collées les unes aux autres, rangée d'actions dans un en-tête où l'on rate systématiquement sa cible.

**✅** ~44-48 dp de **zone tactile** minimum (le glyphe reste petit, c'est la zone qui grandit). Et **l'écart entre cibles compte plus que leur taille** : deux boutons de 48 dp collés se ratent quand même. Viser ~8 dp d'écart minimum entre cibles distinctes, davantage si l'une est destructive.

## Safe areas

**❌ Tell** : padding uniforme de 16 sur tout l'écran, contenu qui passe sous l'encoche ou sous la barre de gestes, bouton plein écran collé au bord bas.

**✅** Les insets système sont **variables** et se consomment explicitement. Un padding est composé : `insets système + rythme du design`, jamais une constante unique. Le fond, lui, va bien jusqu'au bord — c'est le **contenu** qui respecte les insets, pas la surface.

## Surfaces : sheet, dialog, plein écran

**❌ Tell** : la modale centrée pour tout. C'est un pattern desktop ; sur mobile elle arrive de nulle part et casse le fil.

**✅** Choisir selon la nature de l'interruption :
- **Bottom sheet** — contenu contextuel, secondaire, dont on ressort vite (détail, filtres, explication). Se ferme par glissement : c'est le geste naturel.
- **Plein écran (push)** — une vraie tâche avec plusieurs étapes ou de la saisie.
- **Dialog centré** — réservé à **une décision courte et conséquente** (confirmer une suppression). Si le dialog a plus de deux boutons ou du contenu défilant, ce n'était pas un dialog.

## Densité : lignes, pas grilles de cards

**❌ Tell** : grille de cards à deux colonnes sur une largeur de 390 px, ou pile de cards où chaque card habille deux lignes de texte. C'est la version mobile du tell « grille de N cards uniformes ».

**✅** Le mobile est une **colonne étroite** : la ligne séparée par un filet 1px lit et scanne mieux qu'une card, et laisse la place au type. Garder la card pour ce qui a une vraie densité (≥4-5 infos utiles) ou ce qui est manipulable en tant qu'objet.

**Test** : « en retirant le fond et le rayon, est-ce que je perds de l'information ? » Si non, ce n'était pas une card.

## Typographie et espacement recalibrés

La colonne étroite change les valeurs, **pas les principes** :

- **Type** : l'écart entre les niveaux doit être *plus* marqué qu'en web, pas moins — une colonne étroite écrase la hiérarchie. Ne pas rabattre tous les corps à 14-16 par prudence. Le titre porte toujours le design (principe n°3).
- **Espacement** : les marges latérales se resserrent (~16-24 plutôt que 32-64), mais le **contraste** d'espacement se conserve intégralement. Compresser tout uniformément est exactement le tell qu'on corrige — proximité = sens (principe n°5) vaut autant sur 390 px.
- **Chiffres** : `tabular-nums` obligatoire dès qu'un nombre change en place (score, timer, XP, compteur). Un chiffre qui fait sauter la mise en page est un défaut visible à chaque usage.

## Mouvement

**❌ Tell** : tout est animé, tout dure 300 ms, tout entre en cascade, courbes élastiques par défaut. L'app « respire » tellement qu'elle est lente.

**✅** Le mouvement **explique une relation** (d'où vient cet élément, où est parti celui-ci) ou il ne sert à rien.
- Retour immédiat (pression, bascule, sélection) : ~100-200 ms.
- Transition d'écran ou de surface : ~250-350 ms.
- Courbe décélérée pour une entrée, accélérée pour une sortie. Le rebond élastique se **choisit**, il n'est jamais le défaut.
- Une seule chose bouge à la fois. Les cascades d'apparition sur une liste au premier affichage sont un tell fort — et ça vieillit vite à l'usage quotidien.

## Retour haptique

**❌ Tell** : vibration à chaque tap. Le retour perd tout sens et l'utilisateur coupe l'haptique dans les réglages.

**✅** L'haptique est une **signalisation**, exactement comme la couleur d'accent (principe n°4) : rare et fonctionnelle. Un cran léger sur un changement de sélection, un retour plus marqué sur un résultat qui compte (validation, verdict, échec). Jamais sur la navigation ordinaire ni sur le défilement.

## États

- **Chargement** : ne rien afficher en dessous de ~300-400 ms — un spinner qui clignote est pire que l'attente. Au-delà, un squelette **seulement si la forme finale est prévisible**, sinon un indicateur discret et localisé. Jamais de spinner plein écran pour recharger une portion d'écran.
- **Vide** : constat + contexte + une action, sans emoji (cf. `donnees.md`). Sur mobile, l'écran vide occupe tout le champ de vision : c'est un vrai écran à dessiner, pas une phrase grise centrée.
- **Erreur** : dire ce qui a échoué et ce qu'on peut faire. Pas de bandeau rouge permanent qui pousse la mise en page.

## Checklist mobile

À passer en plus de la checklist de fin d'écran.

- [ ] Le thème est défini avant les écrans (aucun composant système laissé brut) ?
- [ ] Action primaire dans le tiers bas ; rien de destructif sous le pouce au repos ?
- [ ] Cibles ~44-48 dp **et** écart suffisant entre elles ?
- [ ] Insets système consommés explicitement (haut, bas, encoche) ?
- [ ] Sheet / plein écran / dialog choisis selon la nature de l'interruption, pas par défaut ?
- [ ] Listes en lignes plutôt qu'en grille de cards, sauf densité réelle ?
- [ ] Hiérarchie typographique *plus* contrastée, pas aplatie par la largeur ?
- [ ] `tabular-nums` sur tout chiffre qui change en place ?
- [ ] Chaque animation explique une relation ; une seule chose bouge à la fois ?
- [ ] Haptique rare et signifiante ?
- [ ] Pas de spinner sous ~400 ms ; squelette seulement si la forme est prévisible ?
