export function decodeJWT (token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = parts[1]!.replace(/-/g, '+').replace(/_/g, '/')
    const json = atob(payload)
    return JSON.parse(json)
  } catch {
    return null
  }
}

export function tokenDelayMs (nbf: number | null): number {
  if (!nbf) return 0
  return Math.max(0, nbf * 1000 - Date.now() + 500)
}
