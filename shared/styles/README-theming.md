# Système de variables CSS centralisé

Ce projet utilise un système de variables CSS centralisé pour unifier les couleurs et thèmes entre :

- SCSS/Material Design
- ng-zorro (LESS)
- Composants custom

## Architecture

### 1. Variables CSS centrales (`_css-variables.scss`)

Définit toutes les variables CSS dans `:root` avec support automatique des thèmes clair/sombre.

### 2. Material Design (`material/base.scss`)

Utilise les variables CSS via `var(--variable-name)` pour tous les thèmes Material.

### 3. ng-zorro (`ng-zorro/*.less`)

- `light.less` et `dark.less` utilisent les mêmes variables CSS
- Toutes les couleurs ng-zorro pointent vers nos variables centrales

## Variables principales

| Variable                        | Usage                                   |
| ------------------------------- | --------------------------------------- |
| `--brand-background-components` | Arrière-plan principal des composants   |
| `--brand-background-primary`    | Arrière-plan de la page                 |
| `--brand-background-secondary`  | Arrière-plan secondaire (headers, etc.) |
| `--brand-background-hover`      | État hover                              |
| `--brand-text-primary`          | Texte principal                         |
| `--brand-text-secondary`        | Texte secondaire                        |

## Avantages

✅ **Une seule source de vérité** : Toutes les couleurs dans `_css-variables.scss`
✅ **Thèmes automatiques** : Switch clair/sombre via classe CSS
✅ **Cohérence** : SCSS, Material et ng-zorro utilisent les mêmes couleurs
✅ **Maintenance** : Changer une couleur dans un seul endroit

## Comment modifier une couleur

1. Ouvrir `shared/styles/_css-variables.scss`
2. Modifier la variable souhaitée dans `:root` et/ou `.dark-theme`
3. La couleur sera automatiquement appliquée partout

## Exemple

```scss
:root {
  --brand-background-components: #ffffff; /* Thème clair */
}

.dark-theme {
  --brand-background-components: rgb(27, 28, 33); /* Thème sombre */
}
```

Cette variable sera utilisée par :

- Material Design : `$light-background: var(--brand-background-components);`
- ng-zorro : `@component-background: var(--brand-background-components);`
- SCSS custom : `background-color: var(--brand-background-components);`
