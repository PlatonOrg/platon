/**
 * Génère un header Content-Disposition RFC 5987 compatible avec les navigateurs modernes
 * Supporte les caractères non-ASCII dans les noms de fichiers
 *
 * @param fileName Le nom du fichier (peut contenir des caractères non-ASCII comme 'é')
 * @param dispositionType Type de disposition ('attachment' ou 'inline'), par défaut 'attachment'
 * @returns Un header Content-Disposition formaté correctement
 *
 */
export function getContentDisposition(fileName: string, dispositionType = 'attachment'): string {
  const encodedFileName = encodeURIComponent(fileName)
  return `${dispositionType}; filename*=UTF-8''${encodedFileName}`
}
