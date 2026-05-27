/**
 * Convert snake_case object keys to camelCase (Supabase → API responses)
 */
export function toCamelCase<T = any>(obj: any): T {
  if (obj === null || obj === undefined) return obj as T
  if (Array.isArray(obj)) return obj.map((item) => toCamelCase(item)) as T
  if (typeof obj === 'object' && obj.constructor === Object) {
    const result: Record<string, any> = {}
    for (const key of Object.keys(obj)) {
      const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
      result[camelKey] = toCamelCase(obj[key])
    }
    return result as T
  }
  return obj as T
}

/**
 * Convert camelCase object keys to snake_case (API requests → Supabase)
 */
export function toSnakeCase<T = any>(obj: any): T {
  if (obj === null || obj === undefined) return obj as T
  if (Array.isArray(obj)) return obj.map((item) => toSnakeCase(item)) as T
  if (typeof obj === 'object' && obj.constructor === Object) {
    const result: Record<string, any> = {}
    for (const key of Object.keys(obj)) {
      const snakeKey = key.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase())
      result[snakeKey] = toSnakeCase(obj[key])
    }
    return result as T
  }
  return obj as T
}

/**
 * Helper to handle Supabase responses - throws on error, returns data
 */
export function unwrap<T>(result: { data: T; error: any }): T {
  if (result.error) throw new Error(result.error.message || 'Database error')
  return result.data as T
}
