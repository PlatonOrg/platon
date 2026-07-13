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

## Backend

Endpoint `/api/upload`:

```typescript
@Post('upload')
@UseInterceptors(FileInterceptor('file'))
uploadFile(@UploadedFile() file: Express.Multer.File) {
  return {
    success: true,
    url: `/files/${file.filename}`,
    fileName: file.originalname,
    fileSize: file.size
  }
}
```
