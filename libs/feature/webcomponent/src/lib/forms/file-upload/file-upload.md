# FileUpload - Guide d'utilisation

## Configuration simple

```json
{
  "maxFiles": 1,
  "allowedExtensions": ["pdf"],
  "maxFileSize": 10485760,
  "acceptedFormats": ".pdf"
}
```

## Exemples de configurations

**Plusieurs fichiers:**

```json
{
  "maxFiles": 5,
  "allowedExtensions": ["pdf", "docx", "xlsx"],
  "maxFileSize": 52428800
}
```

**Images uniquement:**

```json
{
  "maxFiles": 10,
  "allowedExtensions": ["jpg", "png", "gif"],
  "maxFileSize": 5242880,
  "acceptedFormats": "image/*"
}
```

**Avec validation du nom:**

```json
{
  "maxFiles": 1,
  "allowedExtensions": ["pdf"],
  "fileNameRegex": "^[a-zA-Z0-9_-]+$"
}
```

## Propriétés

- `maxFiles`: Nombre max de fichiers (défaut: 1)
- `allowedExtensions`: Extensions autorisées (défaut: [])
- `maxFileSize`: Taille max en bytes (défaut: 10 MB)
- `fileNameRegex`: Regex pour le nom du fichier
- `uploadedFiles`: Fichiers uploadés
- `disabled`: Désactiver l'upload
- `multiple`: Upload multiple

## Envoi et correction

- Chaque fichier est envoyé dès qu'il est déposé, à `/api/v1/sessions/<session>/submissions/upload`, et enregistré pour l'utilisateur connecté.
- **Il faut être connecté à PLaTon** : pour un visiteur non connecté (la documentation, par exemple), la zone de dépôt est désactivée et le composant affiche « Connectez-vous à PLaTon pour déposer un fichier. ».
- À la correction, les fichiers déposés sont copiés dans le dossier `submission/` de l'environnement d'exécution : ils ne sont accessibles qu'avec la sandbox Python. Le grader reçoit aussi la liste `uploadedFiles` (nom, taille, type, statut) dans l'état du composant.
