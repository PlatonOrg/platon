Le composant VariationTable affiche un tableau de signes ou de variations que l'élève complète : valeurs de x, signes, zéros et valeurs interdites, flèches de variation, extremums et limites. Les valeurs se tapent avec MathLive (LaTeX), le reste se choisit d'un clic.

### Structure

Un tableau compte **n valeurs de x** (bornes comprises) et donc **n - 1 intervalles**. La propriété `rows` contient les lignes ; la première est toujours la ligne des valeurs de x. Chaque ligne a :

- `type` : `"x"`, `"sign"` (ligne de signes) ou `"variation"` (ligne de variations) ;
- `label` : l'intitulé en LaTeX (`"f'(x)"`, `"f(x)"`, `"x-1"`...) ;
- `points` : une case par valeur de x ;
- `intervals` : une case par intervalle ;
- `locked` (facultatif) : `true` pour figer toute la ligne, ou la liste des cases figées (`"p0"` : première valeur, `"i1"` : deuxième intervalle...).

| Ligne       | `points`                                                                            | `intervals`                         |
| ----------- | ----------------------------------------------------------------------------------- | ----------------------------------- |
| `x`         | la valeur de x en LaTeX (`-\infty`, `\frac{1}{2}`)                                  | inutilisé                           |
| `sign`      | `""`, `"0"` ou `"\|\|"` (valeur interdite)                                          | `""`, `"+"` ou `"-"`                |
| `variation` | la valeur en LaTeX, ou `["gauche", "droite"]` de part et d'autre d'une double barre | `""`, `"up"`, `"down"` ou `"const"` |

Les valeurs sont placées automatiquement en haut, au milieu ou en bas selon les flèches voisines (maximum en haut, minimum en bas, valeur intermédiaire au milieu).

### Ce que fait l'élève

- un clic sur une case de signe la fait passer de vide à `+`, `-`, puis vide ; sur une case de point : `0`, `||` (valeur interdite), puis vide ;
- un clic sur une case de variation : flèche montante, descendante, constante, puis vide ;
- les valeurs (valeurs de x, extremums, limites) se tapent au clavier, comme dans `wc-math-live` (`oo` donne ∞) ;
- avec `resizable`, la ligne « Colonnes » sous le tableau permet d'ajouter (**+**) ou de supprimer (**×**) une valeur de x : l'élève doit alors trouver lui-même les valeurs remarquables ;
- avec `forbidden`, le bouton **||** de cette même ligne marque une valeur interdite : double barre dans les lignes de variations (deux limites à saisir) et `||` dans les lignes de signes.

Les bornes et les cases figées (`locked`) ne sont pas modifiables. Les cases vides sont signalées par un point d'interrogation.

### Exemple

```
tableau = :wc-variation-table
tableau.resizable = true
tableau.rows = [
  {"type": "x", "label": "x", "points": ["-\infty", "+\infty"], "locked": ["p0", "p1"]},
  {"type": "sign", "label": "f'(x)"},
  {"type": "variation", "label": "f(x)"}
]
```

Les cases manquantes sont complétées automatiquement : il suffit de donner les valeurs de x et l'intitulé des autres lignes. En PLE, une barre oblique inverse s'écrit une seule fois (`"-\infty"`) ; dans un script Python, elle se double (`"-\\infty"`).

### Correction

Le grader lit `tableau['rows']` (même structure). Les valeurs saisies sont du LaTeX brut de MathLive (sans normalisation par le Compute Engine) : `-\infty`, `\infty`, `\frac{1}{e}`, `e^{-1}`... Pour comparer des valeurs, utilisez un outil de calcul formel (SymPy) plutôt qu'une comparaison de chaînes.

Le template « Maths MathLive » (bibliothèque `mlsympy`) corrige ce composant automatiquement avec une réponse de type `tableau` : le tableau attendu est calculé avec SymPy (zéros de la dérivée, valeurs interdites, signes, limites) et comparé case par case, avec un message pour chaque ligne fausse et des points partiels.

### Applications pédagogiques

- signe d'un produit ou d'un quotient de facteurs affines (seconde) ;
- sens de variation d'un polynôme, extremums sur un intervalle (première) ;
- étude complète de fonction avec limites et valeurs interdites (terminale, supérieur) ;
- lecture d'un tableau donné (`disabled: true`) pour un exercice de compréhension.
