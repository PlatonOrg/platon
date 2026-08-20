export interface EditorJsImageUploadResponse {
  readonly success: 1
  readonly file: { readonly url: string }
}

// Abstraction injectable consommée par `ImageExtension` (extensions/image.extension.ts) pour
// activer l'upload réel de fichier sur le bloc `image` d'EditorJS. Sans implémentation fournie
// dans l'arbre d'injection d'une instance <ui-editorjs> donnée, le bloc reste en mode URL uniquement
//
// Chaque fonctionnalité qui veut l'upload réel (ex: l'éditeur de leçon d'un cours) fournit sa propre
// implémentation via `providers: [{ provide: EditorJsImageUploader, useExisting: ... }]` sur un
// composant ancêtre de son <ui-editorjs> — aucune modification requise dans shared/ui pour ça.
export abstract class EditorJsImageUploader {
  abstract uploadByFile(file: Blob): Promise<EditorJsImageUploadResponse>

  // Collage direct d'une URL d'image externe (ex: une image libre de droit trouvée sur le web) :
  // comportement historique de simple-image, à préserver même une fois le vrai upload de fichier
  // câblé — aucun aller-retour serveur nécessaire, l'URL externe est acceptée telle quelle.
  abstract uploadByUrl(url: string): Promise<EditorJsImageUploadResponse>
}
