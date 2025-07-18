Le composant ImageClicker permet de créer des exercices interactifs où les apprenants peuvent cliquer sur une image pour placer des points à des emplacements précis. Ce composant est particulièrement adapté aux exercices de localisation géographique, d'identification d'éléments sur des schémas, ou de positionnement d'objets sur des images.

### Propriétés principales

- **imageUrl**: URL de l'image à afficher (propriété obligatoire)
- **clickDisplayMode**: Mode d'affichage des points cliqués (par défaut: `all-points`)
- **defaultAllowDeletion**: Détermine si les nouveaux points peuvent être supprimés par défaut (`true` par défaut)
- **pointSize**: Taille des points en pixels (par défaut: 20)
- **pointOpacity**: Opacité des points de 0.1 à 1 (par défaut: 1)
- **disabled**: Empêche l'ajout et la suppression de points quand activé (`false` par défaut)

### Utilisation d'images personnalisées

Pour utiliser une image personnalisée depuis PLaTon plutôt qu'une URL externe, vous pouvez importer votre image directement dans votre exercice. Consultez le [guide d'importation d'images](/main/programing/exercise/image) pour apprendre comment ajouter et référencer vos propres images dans un exercice PLaTon.

Une fois votre image importée, vous pouvez l'utiliser dans le composant ImageClicker :

```json
{
  imageUrl: @copyurl monimage.png,
  clickDisplayMode: "all-points",
  maxWidth: "600px"
}
```

### Dimensions de l'image

Vous pouvez contrôler la taille d'affichage de l'image avec plusieurs propriétés:

- **width** / **height**: Dimensions fixes en pixels ou en unités CSS
- **maxWidth** / **maxHeight**: Dimensions maximales pour un affichage adaptatif

```typescript
{
  imageUrl: "https://example.com/carte.jpg",
  maxWidth: "100%",
  height: "400px"
}
```

Ceci est particulièrement utile pour:

- Afficher des corrections où l'utilisateur ne peut plus interagir
- Créer des exercices en mode "lecture seule"
- Présenter des exemples de réponses

### Modes d'affichage des points

Le composant propose plusieurs modes de visualisation via `clickDisplayMode`:

#### `all-points` (par défaut)

Affiche tous les points cliqués simultanément. Idéal pour les exercices de localisation multiple.

#### `last-only`

N'affiche que le dernier point cliqué. Parfait pour les exercices où une seule réponse est attendue.

#### `last-highlighted`

Affiche tous les points mais met en évidence le dernier cliqué avec une couleur différente (vert).

#### `numbered-order`

Affiche tous les points avec leur numéro d'ordre. Utile pour créer des séquences ou des parcours.

#### `deletion-status`

Colore les points selon leur statut de suppression : vert pour les points supprimables, rouge pour les points protégés.

### Gestion des points

#### Ajout de points

Un clic gauche sur l'image ajoute un nouveau point aux coordonnées cliquées. Chaque point reçoit automatiquement un numéro d'ordre.

**Note**: Cette fonctionnalité est désactivée quand `disabled` est `true`.

#### Suppression de points

Un clic droit sur un point le supprime, sauf si sa propriété `allowDeletion` est définie à `false`.

**Note**: Cette fonctionnalité est désactivée quand `disabled` est `true`.

#### Structure des points

```typescript
{
  x: number,           // Coordonnée X normalisée (0-1000)
  y: number,           // Coordonnée Y normalisée (0-1000)
  order: number,       // Numéro d'ordre du point
  allowDeletion: boolean // Autorisation de suppression
}
```

### Exemples d'utilisation

#### Localisation géographique simple

```typescript
{
  imageUrl: "https://example.com/carte-france.jpg",
  clickDisplayMode: "all-points",
  pointSize: 15,
  maxWidth: "600px"
}
```

#### Exercice de séquence

```typescript
{
  imageUrl: "https://example.com/schema-processus.jpg",
  clickDisplayMode: "numbered-order",
  pointSize: 25,
  defaultAllowDeletion: false,
  clickPoints: [
    { x: 100, y: 200, order: 1, allowDeletion: false },
    { x: 300, y: 200, order: 2, allowDeletion: true }
  ]
}
```

#### Exercice avec un seul point de réponse

```typescript
{
  imageUrl: "https://example.com/anatomie.jpg",
  clickDisplayMode: "last-only",
  pointSize: 20,
  pointOpacity: 0.8
}
```

#### Affichage de correction (lecture seule)

```typescript
{
  imageUrl: "https://example.com/exercice.jpg",
  disabled: true,
  clickDisplayMode: "numbered-order",
  clickPoints: [
    { x: 250, y: 150, order: 1, allowDeletion: false },
    { x: 750, y: 400, order: 2, allowDeletion: false }
  ]
}
```

### Récupération des réponses

Les coordonnées des points cliqués sont automatiquement sauvegardées dans le tableau `clickPoints`. Les coordonnées sont normalisées (0-1000) pour être indépendantes de la taille d'affichage de l'image.

```typescript
// Accès aux points cliqués
const points = state.clickPoints
// Chaque point contient: { x, y, order, allowDeletion }
```

### Applications pédagogiques

Ce composant est idéal pour:

- La géographie (localiser des villes, pays, reliefs sur une carte)
- Les sciences (identifier des organes sur un schéma anatomique)
- L'histoire de l'art (pointer des détails sur une œuvre)
- La physique/chimie (localiser des éléments sur un schéma)
- Les mathématiques (placer des points sur un graphique)
- Les langues (associer des mots à des images)

La normalisation des coordonnées garantit que les exercices fonctionnent de manière identique quelle que soit la taille d'écran de l'apprenant.
