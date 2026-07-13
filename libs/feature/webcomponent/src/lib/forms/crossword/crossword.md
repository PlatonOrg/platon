Le composant Crossword permet de créer des exercices interactifs où les apprenants peuvent remplir une grille de mots croisés. Il permet aux apprenants d'apprendre des termes de manière ludique.

### Conseils d'utilisation

  - Ne pas utiliser ce composant pour saisir des caractères spéciaux comme @, $, ?, etc , il ne sont pas acceptés.

  - Les réponses attendues ne doivent pas être trop longues (moins de 20 caractères).

  - Limitez le nombre de définitions (il est conseillé de ne pas dépasser les 10 définitions).

  - Pour la correction, utilisez le champ ```results``` qui donne la saisie de l'utilisateur et le numéro de la définition correspondant.

### Structure des données

Le composant génère une grille que l'apprenant devra remplir à partir d'une liste de mots et de leurs définitions. Le tableau utilisé pour générer cette grille (le champ ```words``` du composant) doit avoir le format suivant :
```
{
  "clue": "La définition du mot",
  "answer": "la réponse attendue"
}
```

### Apparence personnalisable

Vous pouvez ajuster certains paramètres visuels du composant :

  - ```appearance``` : Choisissez d'afficher la grille de mots croisés à droite (inline) ou au-dessus (outline) des définitions.

  - ```cellSize``` : Permet d'augmenter ou de diminuer la taille des cellules.

  - ```definition``` : Si vous activez l'option (```true```) alors les définitions sont affichées avec la grille. Si elle n'est pas activée, c'est à vous de récupérer et d'afficher les définitions.

  - ```correctionColor``` : Les cases sont coloriées en vert si la saisie est correcte et en rouge dans le cas contraire. Cet affichage apparaît lors de la validation et disparaît dès que l'apprenant effectue une nouvelle saisie.