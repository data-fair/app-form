export function setByPath (obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.')
  let current: Record<string, unknown> = obj
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    const existing = current[key]
    if (existing === undefined || existing === null || typeof existing !== 'object') {
      current[key] = {}
    } else if (Array.isArray(existing)) {
      current[key] = [...existing]
    } else {
      current[key] = { ...(existing as Record<string, unknown>) }
    }
    current = current[key] as Record<string, unknown>
  }
  current[keys[keys.length - 1]] = value
}
