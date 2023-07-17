export const resolveFileReference = (path: string, relativeTo: { resource: string; version?: string }) => {
  path = path.trim()
  if (!path.startsWith('/')) {
    path = `/relative/${path}`
  }
  const tokens = path.split(' as ')

  path = tokens[0].trim()
  const alias = tokens[1]?.trim()

  const parts = path.split('/').filter((e) => !!e.trim())
  let [resource, version] = parts[0].split(':')
  path = parts.slice(1).join('/')

  version = (resource === 'relative' ? relativeTo.version : version) || 'latest'
  resource = resource === 'relative' ? relativeTo.resource : resource

  return {
    alias,
    resource,
    version,
    relpath: path,
    abspath: `${resource}:${version}/${path}`,
  }
}

export const removeLeadingSlash = (path: string) => path.replace(/^[\\/.]+/g, '')
