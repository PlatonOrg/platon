import { defineWebComponent, IWebComponent, WebComponentTypes } from '../../web-component'

export interface UploadedFile {
  id?: string
  name: string
  size: number
  type: string
  url?: string
  uploadedAt?: string
  progress?: number
  status?: 'pending' | 'uploading' | 'success' | 'failed'
}

export interface FileUploadState extends IWebComponent {
  maxFiles: number
  allowedExtensions: string[]
  maxFileSize: number // en bytes
  fileNameRegex: string
  uploadedFiles: UploadedFile[]
  dragActive: boolean
  disabled: boolean
  multiple: boolean
  css?: string
  acceptedFormats: string
}

export const FileUploadComponentDefinition = defineWebComponent({
  type: WebComponentTypes.form,
  name: 'FileUpload',
  selector: 'wc-file-upload',
  description:
    "Composant d'upload de fichiers avec validation (extensions, taille, format du nom). Support du drag-drop et de l'upload multiple. Idéal pour les exercices nécessitant une soumission de fichiers (devoirs, projets, ressources, documents à analyser).",
  schema: {
    $schema: 'http://json-schema.org/draft-07/schema',
    type: 'object',
    title: 'FileUpload',
    properties: {
      maxFiles: {
        type: 'number',
        default: 1,
        description: 'Le nombre maximum de fichiers autorisés à télécharger.',
      },
      allowedExtensions: {
        type: 'array',
        default: [],
        items: {
          type: 'string',
        },
        description:
          'Les extensions de fichiers autorisées (ex: ["pdf", "docx", "txt"]). Si vide, tous les types sont acceptés.',
      },
      maxFileSize: {
        type: 'number',
        default: 10485760, // 10 MB par défaut
        description: 'La taille maximale autorisée par fichier en bytes (par défaut 10 MB).',
      },
      fileNameRegex: {
        type: 'string',
        default: '',
        description: 'Une regex que le nom du fichier doit respecter. Si vide, aucune validation spéciale sur le nom.',
      },
      uploadedFiles: {
        type: 'array',
        default: [],
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Nom du fichier' },
            size: { type: 'number', description: 'Taille du fichier en bytes' },
            type: { type: 'string', description: 'Type MIME du fichier' },
            url: { type: 'string', description: 'URL de téléchargement du fichier' },
            uploadedAt: { type: 'string', description: "Date d'upload ISO" },
            progress: { type: 'number', description: "Progression de l'upload (0-100)" },
          },
        },
        description: 'Liste des fichiers téléchargés.',
      },
      dragActive: {
        type: 'boolean',
        default: false,
        description: 'Indique si une opération drag-drop est en cours.',
      },
      disabled: {
        type: 'boolean',
        default: false,
        description: "Désactiver l'upload de fichiers?",
      },
      multiple: {
        type: 'boolean',
        default: true,
        description: "Permettre l'upload de plusieurs fichiers à la fois?",
      },
      acceptedFormats: {
        type: 'string',
        default: '',
        description: 'Format accepté pour l\'attribut HTML accept (ex: ".pdf,.docx,.txt" ou "image/*").',
      },
      css: {
        type: 'string',
        default: '',
        description: 'Les classes CSS à appliquer au composant.',
      },
    },
  },
  showcase: {
    maxFiles: 3,
    allowedExtensions: ['pdf', 'docx', 'txt', 'xlsx'],
    maxFileSize: 52428800, // 50 MB
    fileNameRegex: '^[a-zA-Z0-9_-]+$',
    multiple: true,
    acceptedFormats: '.pdf,.docx,.txt,.xlsx',
  },
  playgrounds: {},
})
