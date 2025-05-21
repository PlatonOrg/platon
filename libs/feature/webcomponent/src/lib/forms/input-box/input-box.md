Le composant InputBox est un outil de saisie polyvalent qui s'adapte à différents besoins pédagogiques, depuis la simple réponse textuelle jusqu'à la saisie de données numériques ou multiformes.

### Modes de saisie

Le composant propose trois modes distincts, définis par la propriété `type`:

#### Mode texte (`type: "text"`)

Mode standard pour la saisie de chaînes de caractères sur une seule ligne. Dans ce mode:

- La valeur saisie est transmise telle quelle au script d'évaluation
- Aucune validation particulière n'est effectuée par le composant
- La gestion des cas particuliers (chaîne vide, format spécifique) doit être implémentée dans votre grader

#### Mode numérique (`type: "number"`)

Spécialisé pour la saisie de valeurs numériques. Dans ce mode:

- Seuls les caractères numériques sont acceptés
- Une chaîne vide ou invalide est automatiquement convertie en `0`
- La valeur est transmise au grader sous forme de nombre (entier ou décimal)

> **Remarque importante**: Si l'apprenant saisit un nombre décimal sans partie fractionnaire (ex: `5.0`), celui-ci sera automatiquement converti en entier (`5`) conformément au comportement standard de JavaScript.

#### Mode texte multiligne (`type: "textarea"`)

Idéal pour les réponses plus longues ou structurées sur plusieurs lignes. Ce mode se comporte comme le mode texte mais permet les retours à la ligne.

#### Mode mot de passe (`type: "password"`)

Conçu pour la saisie de mots de passe ou d'informations sensibles. Ce mode masque les caractères saisis pour protéger la confidentialité de l'utilisateur.
Dans ce mode, la valeur est transmise au grader sous forme de chaîne de caractères, elle est masquée à l'écran pour éviter toute divulgation accidentelle.

### Fonctionnalités avancées

#### Icônes interactives

Pour enrichir l'expérience utilisateur, vous pouvez ajouter une icône à gauche du champ de saisie grâce à la propriété `prefix`. La syntaxe est la suivante:

`type nom [color=CODE_COULEUR]`

Où:

- `type` correspond à une bibliothèque d'icônes (ex: fontawesome, clarity, material)
- `nom` est l'identifiant de l'icône dans cette bibliothèque
- `color=CODE_COULEUR` est un paramètre optionnel pour définir la couleur (format hexadécimal sans #)

**Exemples**:

- `fontawesome address-book` affiche une icône d'annuaire
- `clarity happy-face color=FF0000` affiche un visage souriant en rouge

La plateforme [icongr.am](https://icongr.am) référence toutes les bibliothèques et icônes disponibles.

#### Saisie assistée

Pour aider l'apprenant, plusieurs fonctionnalités peuvent être activées:

1. **Autocomplétion** - Proposez des suggestions pendant la saisie:

   ```js
   completion: ['France', 'Espagne', 'Italie', 'Allemagne']
   ```

2. **Validation automatique** - Déclenchez automatiquement la validation quand l'apprenant appuie sur Entrée:

```typescript
autoValidation: true
```

#### La propriété `specialCharacters`

La propriété `specialCharacters` vous permet de définir un clavier virtuel avec des caractères spéciaux.

Vous pouvez utiliser `string[][][]` afin de séparer les caractères par pages, lignes et colonnes.

Exemple :

```py
specialCharacters = [
  # Page 1 :
  [
    ['a', 'b', 'c', 'd', ...],   # Ligne 1
    ['q', 'r', 's', 't', ...]    # Ligne 2
  ],
  # Page 2 :
  [
    ['à', 'ñ', 'œ', ...],   # Ligne 1
    ['1', '2', '', '', '3', '4', ...],   # Le '' permet de laisser des colonnes vides dans la ligne
    ...
  ]
]
```

Sinon, vous pouvez utiliser `string[][]` si vous ne voulez utiliser qu'une seule page.

Exemple :

```py
specialCharacters = [
  ['α', 'β', 'γ', 'δ', ...],   # Ligne 1
  ['φ', 'χ', 'ψ', 'ω', ...]    # Ligne 2
]
```

Enfin, vous pouvez utiliser `string[]` si vous n'avez besoin que d'une seule ligne.

```py
specialCharacters = ['😁', '​😅', '​🤣', '​😂', '​🙂​', ...]
```

#### Apparence personnalisable

Adaptez le style visuel du champ à vos besoins:

- `appearance`: Choisissez entre outline (bordure), fill (fond coloré) ou inline (intégré)
- `width`: Définissez la largeur exacte en utilisant les unités CSS (%, px, em...)
- `placeholder`: Ajoutez un texte indicatif qui s'affiche quand le champ est vide
- `hint`: Fournissez une indication supplémentaire sous le champ
