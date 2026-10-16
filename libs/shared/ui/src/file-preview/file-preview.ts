export const SUPPORTED_IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'] as readonly string[]
export const SUPPORTED_VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov'] as readonly string[]
export const SUPPORTED_TEXT_EXTENSIONS = ['md', 'txt'] as readonly string[]
export const SUPPORTED_CODE_EXTENSIONS = [
  // Web & Frontend
  'html',
  'htm',
  'css',
  'scss',
  'sass',
  'less',
  'js',
  'mjs',
  'cjs',
  'ts',
  'tsx',
  'jsx',
  'vue',
  'svelte',

  // General langage & Backend
  'py',
  'java',
  'c',
  'cpp',
  'cc',
  'h',
  'hpp',
  'cs',
  'go',
  'rs',
  'rb',
  'php',
  'swift',
  'kt',
  'kts',
  'scala',

  // Scripting & Shell
  'sh',
  'bash',
  'zsh',
  'ps1',
  'bat',
  'cmd',
  'lua',
  'pl',
  'r',

  // Data, Documentation & Config
  'yaml',
  'yml',
  'xml',
  'toml',
  'ini',
  'sql',
]

export const SUPPORTED_EXTENSIONS = [
  ...SUPPORTED_IMAGE_EXTENSIONS,
  ...SUPPORTED_VIDEO_EXTENSIONS,
  ...SUPPORTED_TEXT_EXTENSIONS,
  ...SUPPORTED_CODE_EXTENSIONS,
  'pdf',
  'csv',
  'json',
] as readonly string[]

export const FILE_PREVIEW_REGEX = /\/api\/v[0-9]+\/files\/[^.]+\.([^?]+)/

export const extractSupportedExtension = (url: string): string | null => {
  const regex = FILE_PREVIEW_REGEX
  const match = url.match(regex)
  if (!match) {
    return null
  }
  const extension = match[1]
  if (SUPPORTED_EXTENSIONS.includes(extension || '')) {
    return extension as string
  }
  return null
}
