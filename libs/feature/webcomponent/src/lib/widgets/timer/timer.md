Le composant Timer affiche un **compte à rebours** au format minutes:secondes. Il sert à limiter le temps de réponse d'un exercice : lorsque le temps est écoulé, la réponse de l'apprenant est **soumise automatiquement**, comme s'il avait cliqué sur le bouton de validation.

### Propriétés principales

- **countDownTime** : durée du compte à rebours, en secondes. Le chronomètre décompte une seconde à la fois tant que cette valeur est supérieure à 0. Avec la valeur 0 (par défaut), il reste à l'arrêt.
- **alignment** : position du chronomètre dans la page (`center`, `left` ou `right`).
- **disabled** : met le décompte en pause tant que la valeur est `true`.

Pendant la dernière minute, l'affichage clignote pour attirer l'attention de l'apprenant.

### Utilisation dans un exercice

```ple
chrono = :wc-timer
chrono.countDownTime = 60
chrono.alignment = "right"

form ==
{{ chrono }}
{{ reponse }}
==
```

<Callout type="warning">
Placez le chronomètre dans le `form` : seuls les composants du formulaire renvoient leur état au grader. Le grader peut alors lire le temps restant dans `chrono.countDownTime` (0 si la réponse a été soumise automatiquement).
</Callout>

### Points d'attention

- Le décompte démarre à l'affichage de l'exercice.
- Pour arrêter le chronomètre après la correction, mettez `chrono.disabled = true` dans le grader.
- La soumission automatique déclenche le grader comme une validation normale : prévoyez dans le grader le cas d'une réponse vide.
