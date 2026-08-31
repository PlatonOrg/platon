/* eslint-disable @typescript-eslint/no-explicit-any */

type Obj = Record<string, any>

/**
 * Merge two objects recursively
 * @param target The object to merge into
 * @param source The object to merge from
 * @param replace Whether to replace sub-objects instead of merging them if they already exists on target (default: `false`)
 * @returns The merged object
 */
export const deepMerge = <T extends Obj>(target: T, source: any, replace = false): Obj => {
  const targetObj = target as any
  for (const key in source) {
    if (typeof source[key] === 'object' && source[key] !== null) {
      if (!(key in target)) {
        Object.assign(target, { [key]: Array.isArray(source[key]) ? [] : {} })
      }
      if (Array.isArray(source[key])) {
        targetObj[key] = source[key]
      } else if (!replace) {
        deepMerge(target[key] as any, source[key] as any)
      } else {
        Object.assign(target, { [key]: source[key] })
      }
    } else {
      Object.assign(target, { [key]: source[key] })
    }
  }
  return target
}

export function deepCopy<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }
  const copy: any = obj instanceof Array ? [] : {}
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      copy[key] = deepCopy(obj[key])
    }
  }
  return copy as T
}
