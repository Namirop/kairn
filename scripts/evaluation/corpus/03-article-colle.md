Comprendre la boucle d'événements de JavaScript

JavaScript n'exécute qu'une chose à la fois. Il y a une seule pile d'appels, et
tant qu'une fonction n'a pas rendu la main, absolument rien d'autre ne
s'exécute : ni une minuterie échue, ni une promesse résolue, ni le clic que
l'utilisateur vient de faire. C'est ce qui rend une boucle de calcul de trois
secondes si désagréable — la page ne répond plus, parce qu'il n'y a personne
d'autre pour répondre.

Autour de cette pile, le moteur tient deux files d'attente. La première est
celle des tâches : c'est là qu'atterrissent les rappels de `setTimeout`, les
gestionnaires d'événements, les réponses réseau. La seconde est celle des
microtâches : c'est là qu'atterrit la suite d'une promesse résolue, ainsi que
tout ce qu'on y met explicitement avec `queueMicrotask`.

Les deux ne sont pas servies de la même manière, et c'est le point que la
plupart des gens ratent. Le moteur prend une tâche, l'exécute jusqu'au bout,
puis vide la file des microtâches en entier — y compris les microtâches
ajoutées pendant qu'il la vidait — et seulement ensuite passe à la tâche
suivante. D'où le classique : un `setTimeout(…, 0)` s'exécute après toutes les
promesses déjà résolues, même si vous l'avez écrit avant elles.

Cette règle a une conséquence brutale. Si vous écrivez une boucle de promesses
qui se réenchaînent sans fin, vous remplissez la file des microtâches aussi
vite qu'elle se vide. Le navigateur ne rendra plus rien et ne répondra plus à
rien, alors qu'aucune boucle bloquante n'apparaît dans votre code. C'est une
famine, pas un blocage, et elle se lit très mal dans un profileur.

Au passage, le délai que vous passez à `setTimeout` est un minimum, jamais une
garantie. Le rappel part quand la pile est vide et que les microtâches sont
épuisées, ce qui peut arriver bien après le délai demandé. Écrire
`setTimeout(f, 100)` ne veut pas dire « dans cent millisecondes », mais « pas
avant cent millisecondes ».

Le mot-clé `await` n'échappe pas à ce mécanisme, il s'y branche. Une fonction
asynchrone est découpée en deux à chaque attente : ce qui suit le `await`
devient une microtâche, planifiée au moment où la promesse se règle. Entre les
deux moitiés, le code appelant reprend la main. C'est pour cette raison qu'une
fonction `async` rend une promesse immédiatement, avant d'avoir fini son
travail.

Deux combinateurs reviennent souvent et on les confond. `Promise.all` rejette
dès le premier échec et vous perd les résultats des autres promesses, qui
continuent pourtant de tourner dans leur coin — il n'annule rien.
`Promise.allSettled` attend tout le monde et vous rend un statut par entrée,
ce qui est presque toujours ce que vous vouliez quand vous chargez cinq
ressources indépendantes.

Dernier piège, et le plus coûteux en production : une promesse rejetée sans
gestionnaire déclenche l'événement `unhandledrejection` dans le navigateur, et
fait tomber le processus Node par défaut. Attacher le `catch` plus tard suffit,
à condition que ce soit dans le même tour de boucle — au tour suivant, le
moteur a déjà considéré le rejet comme non traité.
