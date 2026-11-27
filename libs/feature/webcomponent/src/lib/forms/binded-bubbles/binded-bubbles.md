Le format des éléments du tableau `items` est le suivant:

```typescript
{
    "content"?: string, // Contenu en markdown.
}
```

> Vous pouvez définir uniquement la propriété `content` d'un des éléments du tableau.

Le composant BindedBubbles crée une activité interactive de type "memory" ou "association de paires" où les apprenants doivent connecter des éléments correspondants. C'est un excellent moyen de rendre l'apprentissage plus engageant, particulièrement pour les associations terme-définition, mot-traduction, ou concept-exemple.

### Structure et organisation

Le composant fonctionne avec une liste de paires d'éléments que l'apprenant devra associer. Chaque paire est définie par deux éléments: Le contenu de chaque élément peut inclure du texte simple ou du markdown enrichi (formules, mise en forme, etc.).

### Configuration du jeu

Plusieurs paramètres permettent d'ajuster l'expérience d'apprentissage:

- Mode d'affichage (`mode`) :

  - `ordered` (par défaut) : quand une paire est trouvée, elle est remplacée par une nouvelle paire complète : le nouvel élément de gauche et le nouvel élément de droite vont ensemble.
  - `shuffle` : les nouveaux éléments de gauche et de droite sont tirés indépendamment ; un élément n'arrive donc pas forcément avec celui qui forme sa paire. Il reste toujours au moins une paire à former à l'écran.

  Dans les deux modes, les premiers éléments des paires sont affichés dans une colonne et les seconds dans l'autre.

- Nombre de paires: Contrôlez combien de paires sont affichées simultanément avec `numberPairToShow`
- Timing: Ajustez le délai entre les associations réussies avec `timeout` (en millisecondes)

### Suivi des performances

Le composant intègre automatiquement un système de suivi avec:

- Compteur d'erreurs (`nbError`)
- Enregistrement des associations incorrectes (`errors`)

Cette fonctionnalité est particulièrement utile pour identifier les associations qui posent le plus de difficultés aux apprenants.

### Conseil d'utilisation

Pour optimiser l'expérience d'apprentissage, gardez un bon équilibre dans le nombre de paires affichées: trop peu rend l'exercice trop simple, trop nombreuses peuvent surcharger cognitivement l'apprenant. 3 à 5 paires simultanées offrent généralement un bon équilibre.
