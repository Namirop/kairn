# Documentation

Ce que le code ne dit pas seul. Le [README](../README.md) à la racine est la porte d'entrée ;
ces documents en sont la suite, un sujet chacun.

| Document                                     | À lire pour                                                                         |
| -------------------------------------------- | ----------------------------------------------------------------------------------- |
| [architecture.md](architecture.md)           | Le cycle d'un dépôt, les appels au modèle, les quotas, les travaux asynchrones      |
| [deploiement.md](deploiement.md)             | Mettre en ligne : variables de production, ordre des opérations, PR, retour arrière |
| [environnements.md](environnements.md)       | Comprendre une variable d'environnement et décider où elle se pose                  |
| [outillage.md](outillage.md)                 | Les commandes, les étages de vérification, où ranger un script                      |
| [paiement.md](paiement.md)                   | Stripe : qui décide qu'un compte est payant, le webhook, la TVA                     |
| [campagne-modeles.md](campagne-modeles.md)   | Le protocole de comparaison des modèles, que le banc exécute                        |
| [glossaire-anglais.md](glossaire-anglais.md) | Les mots du produit en anglais, contractuels comme le vocabulaire français          |

À la racine, [CONTRIBUTING.md](../CONTRIBUTING.md) décrit la façon de travailler sur le dépôt, [DESIGN.md](../DESIGN.md) le système visuel et [PRODUCT.md](../PRODUCT.md)
le produit et son public.

Une doc décrit ce qui **est**. `scripts/docs/carte-des-docs.ts` dit quelle doc couvre quel code, et
`npm run docs:check` nomme celles à relire quand ce code change.
