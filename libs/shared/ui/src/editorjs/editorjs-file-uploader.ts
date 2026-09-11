export interface EditorJsFileUploadResponse {
  readonly success: 1
  readonly file: { readonly url: string }
}

// Abstraction injectable consommée par les extensions qui ont besoin d'un vrai upload de fichier
// (ImageExtension, VideoExtension extensions/image.extension.ts, extensions/video.extension.ts).
// Sans implémentation fournie dans l'arbre d'injection d'une instance <ui-editorjs> donnée, les
// blocs concernés restent en mode URL uniquement.
//
// Chaque fonctionnalité qui veut l'upload réel (ex: l'éditeur de leçon d'un cours) fournit sa propre
// implémentation via `providers: [{ provide: EditorJsFileUploader, useExisting: ... }]` sur un
// composant ancêtre de son <ui-editorjs>  aucune modification requise dans shared/ui pour ça.
// Une seule implémentation sert tous les types de fichiers (image, vidéo, ...) : le backend
// (CourseFileService) est déjà agnostique du type de fichier.
export abstract class EditorJsFileUploader {
  // `onProgress` est optionnel et ignoré par les gros consommateurs qui n'en ont pas besoin (ex: le
  // bloc image, dont les fichiers sont toujours petits) — seul le bloc vidéo l'utilise pour afficher
  // une progression réelle sur des fichiers volumineux.
  abstract uploadByFile(file: Blob, onProgress?: (percent: number) => void): Promise<EditorJsFileUploadResponse>

  // Collage direct d'une URL externe (ex: une image ou vidéo libre de droit trouvée sur le web) :
  // comportement historique de simple-image, à préserver même une fois le vrai upload de fichier
  // câblé — aucun aller-retour serveur nécessaire, l'URL externe est acceptée telle quelle.
  abstract uploadByUrl(url: string): Promise<EditorJsFileUploadResponse>
}
