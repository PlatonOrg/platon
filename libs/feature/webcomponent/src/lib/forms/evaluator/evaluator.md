Le composant Evaluator permet de donner un note à un élément avec des étoiles ou d'autres icônes personnalisées.

### Propriétés principales

- **title**: Titre de l'élément à noter
- **count**: Nombre d'étoiles maximal
- **allowHalf**: Booléen permettant d'activer la possibilité de donner des demi-points
- **value**: Valeur de la note donnée par l'utilisateur

### Configuration des icônes

Le composant possède une propriété **icons** qui permet d'ajouter des icônes personnalisées.
Les noms d'icônes utilisables sont situés sur la page suivante :
[Liste des icônes disponibles](https://ng.ant.design/version/18.2.x/components/icon/en)

Vous pouvez les configurer de deux façons :

#### 1. Une seule icône

Vous pouvez faire en sorte que toutes les icônes soient les mêmes en donnant le nom de l'icône :

```typescript
icons = 'star'
count = 5
```

☆☆☆☆☆

#### 2. Plusieurs icônes

Vous pouvez ajouter plusieurs icônes différentes. Pour cela, il faut donner une liste des noms d'icônes :

```typescript
icons = ['frown', 'meh', 'smile']
count = 3
```

🙁😐🙂

#### Icones pleines

Vous pouvez déninir la propriété `filledIcons = true` pour avoir des icônes pleines. Cela n'est compatible qu'avec les icônes possèdant le thème **Filled** parmi la liste fournie ci-dessus.

★★★★★
