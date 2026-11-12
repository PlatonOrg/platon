Ce composant vous permet de créer des interactions de type glisser-déposer dans vos exercices. C'est un outil particulièrement puissant pour concevoir des activités où les apprenants doivent associer, classer ou positionner des éléments.

### Fonctionnement

Le composant fonctionne avec deux types d'éléments:

- **Éléments déplaçables** (`draggable=true`): Ces éléments peuvent être saisis et déplacés.
- **Zones de dépôt** (`draggable=false`): Ces zones peuvent recevoir des éléments déplaçables.

Lorsqu'un élément déplaçable est déposé dans une zone de dépôt, le contenu (`content`) de l'élément déplaçable est automatiquement copié dans la zone de dépôt. Un même élément déplaçable peut être utilisé plusieurs fois dans différentes zones.

### Regroupement et restrictions

Pour limiter quels éléments peuvent être déposés dans quelles zones, utilisez la propriété `group`. Les éléments ne peuvent être déposés que dans les zones ayant le même identifiant de groupe.

### Créer un exercice avec plusieurs zones

Un composant `wc-drag-drop` représente **un seul** élément : une étiquette ou une zone. Un exercice en utilise donc
toujours plusieurs, déclarés un par un ou générés par le `builder` avec la fonction `component` :

```ple
etiquette1 = :wc-drag-drop
etiquette1.draggable = true
etiquette1.content = "Chat"

etiquette2 = :wc-drag-drop
etiquette2.draggable = true
etiquette2.content = "Aigle"

mammifere = :wc-drag-drop
oiseau = :wc-drag-drop

form ==
{{ etiquette1 }} {{ etiquette2 }}

Mammifère : {{ mammifere }}

Oiseau : {{ oiseau }}
==

grader == #!lang=js
grade = (mammifere.content === "Chat" && oiseau.content === "Aigle") ? 100 : 0
==
```

Le grader lit la propriété `content` de chaque **zone de dépôt**. L'exemple interactif en bas de page génère les
étiquettes et les zones à partir d'une liste.

### Ce qu'une zone peut contenir

- Une zone contient **un seul** contenu à la fois : déposer un nouvel élément dans une zone déjà remplie remplace
  son contenu. Pour accepter plusieurs réponses dans une même catégorie, prévoyez plusieurs zones.
- Déposer le contenu d'une zone remplie dans une autre zone remplie **échange** leurs contenus.
- Une étiquette n'est pas consommée quand elle est déposée : elle reste disponible et peut être déposée dans
  plusieurs zones.

### Réinitialisation des zones

Pour vider une zone de dépôt, deux méthodes sont possibles:

- Glissez son contenu vers l'élément déplaçable d'origine
- Cliquez sur le bouton de suppression qui apparaît dans la zone

### Applications pédagogiques

Ce composant est idéal pour créer des exercices comme:

- Associations de termes avec leurs définitions
- Classification d'éléments dans diverses catégories
- Placement d'étiquettes sur un schéma ou une image
- Reconstitution de séquences ou d'ordres logiques
