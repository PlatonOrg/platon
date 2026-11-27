Le composant CodeEditor offre un environnement d'édition de code complet directement intégré dans vos exercices PLaTon. Il dispose de fonctionnalités essentielles qu'on retrouve dans les IDE modernes, rendant l'expérience de programmation agréable et productive pour les apprenants.

### Caractéristiques principales

- **Coloration syntaxique** pour de nombreux langages de programmation
- **Indentation automatique** qui s'adapte selon le langage utilisé
- **Numérotation des lignes** pour une référence facile
- **Suggestions de code** (auto-complétion) qui peuvent être activées ou désactivées
- **Hauteur personnalisable** pour s'adapter à vos besoins de mise en page
- **Décorations** pour signaler une ligne ou une plage de code problématique

### Langages supportés

Le composant prend en charge un large éventail de langages de programmation, notamment Python, JavaScript, Java, C, C++, HTML, CSS et bien d'autres. Spécifiez simplement le langage souhaité via la propriété `language`.

### Cas d'utilisation

Le CodeEditor est parfait pour:

- Des exercices de programmation où les apprenants doivent écrire du code complet
- Des activités de débogage où un code avec des erreurs est présenté
- Des exercices à trous où certaines parties du code doivent être complétées
- Des démonstrations interactives avec du code modifiable

### Décorations

La propriété `decorations` accepte une liste de lignes ou de plages à signaler. Les numéros de ligne et de colonne commencent à 1. Une icône apparaît dans la gouttière au début de la ligne ; `severity` choisit l'icône (`error`, `warning` ou `info`) et `message` affiche un texte au survol. Pour surligner également un élément précis, fournissez les colonnes de début et de fin.

Les décorations représentent les résultats du diagnostic du code courant : elles sont effacées dès que l'élève modifie le code. Le parent peut les recalculer et fournir une nouvelle liste après son évaluation.

```json
{
  "code": "total = price * quantity",
  "decorations": [
    {
      "startLineNumber": 1,
      "severity": "error",
      "message": "Vérifiez le calcul du total"
    },
    {
      "startLineNumber": 1,
      "startColumn": 9,
      "endColumn": 14,
      "severity": "warning",
      "message": "Cette valeur doit être vérifiée"
    }
  ]
}
```

### Conseil d'utilisation

Pour une expérience optimale, adaptez la hauteur de l'éditeur en fonction de la quantité de code attendue, et activez les suggestions uniquement lorsque c'est pédagogiquement pertinent.
