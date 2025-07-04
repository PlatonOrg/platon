# Composant `wc-confetti`

Le composant **Confetti** permet d'afficher des effets de confettis animés à l'écran, avec plusieurs modes visuels et une personnalisation des couleurs. Il est idéal pour célébrer un succès, marquer une étape ou dynamiser une interface utilisateur.

---

## Propriétés (`state`)

| Propriété | Type | Description | Par défaut |
|-----------|------|-------------|------------|
| `trigger` | `boolean` | Déclenche l'animation des confettis lorsqu'il passe à `true`. | `false` |
| `mode`    | `"canon" \| "pride" \| "snowfall" \| "fireworks"` | Mode d'animation des confettis. | `"canon"` |
| `colors`  | `string[]` | Tableau de couleurs hexadécimales utilisées pour les confettis. | `['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff']` |

---

## Modes disponibles

- **canon** : Explosion centrale de confettis, effet classique de célébration.
- **pride** : Pluie continue de confettis multicolores depuis la gauche et la droite.
- **snowfall** : Chute douce de confettis, effet "neige".
- **fireworks** : Effet feu d'artifice, confettis jaillissant de plusieurs points.

---

## Exemple de configuration

```typescript
{
  trigger: true,
  mode: 'fireworks',
  colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff']
}
```

---

## Bonnes pratiques

- Passez `trigger` à `true` pour lancer l'animation, puis remettez-le à `false` pour pouvoir la relancer plus tard.
- Vous pouvez personnaliser les couleurs pour adapter l'effet à votre charte graphique ou à l'événement célébré.

---

## Applications

- Félicitations après une réussite (quiz, jeu, validation…)
- Mise en avant d'un événement spécial
- Animation de transitions ou de notifications positives
