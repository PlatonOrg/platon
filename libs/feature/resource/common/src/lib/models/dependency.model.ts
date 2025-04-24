export interface ResourceDependency {
  resourceId: string
  resourceVersion: string
  dependOnId: string
  dependOnVersion: string
  isTemplate: boolean
}

export interface CreateResourceDependency {
  resourceId: string
  dependOnId: string
  resourceVersion: string
  dependOnVersion: string
  isTemplate: boolean
}
