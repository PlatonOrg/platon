import { jsonrepair } from 'jsonrepair'

/**
 * Result of {@link parseJsonLenient}.
 */
export interface LenientJsonResult<T = unknown> {
  /** The parsed value. */
  value: T
  /** Whether the text was not valid JSON and had to be repaired before being parsed. */
  repaired: boolean
}

/**
 * Parses a JSON text while tolerating the usual mistakes of hand-written or copied JSON:
 * single quotes, unquoted keys, trailing commas, comments, Python constants (`True`, `False`, `None`)...
 *
 * Be aware that a repair can change the meaning of the text: a truncated JSON is completed
 * (`[1, 2` gives `[1, 2]`) and a text which is not JSON at all is parsed as a string.
 * Check `repaired` to warn the user.
 *
 * @param text The text to parse.
 * @returns The parsed value and whether the text had to be repaired.
 * @throws {Error} When the text cannot be repaired into valid JSON.
 */
export function parseJsonLenient<T = unknown>(text: string): LenientJsonResult<T> {
  try {
    return { value: JSON.parse(text) as T, repaired: false }
  } catch {
    return { value: JSON.parse(jsonrepair(text)) as T, repaired: true }
  }
}

/**
 * Checks whether the given value is a plain JSON object (not an array nor `null`).
 */
export function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Checks whether the given value is a JSON object or a JSON array.
 */
export function isJsonObjectOrArray(value: unknown): value is Record<string, unknown> | unknown[] {
  return isJsonObject(value) || Array.isArray(value)
}
