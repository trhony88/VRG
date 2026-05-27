const BASE = '/api'

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('vrg_token')
}

export const api = {
  async get<T = any>(path: string): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    const token = getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch(`${BASE}${path}`, { headers })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || `Erreur ${res.status}`)
    }
    return res.json()
  },

  async post<T = any>(path: string, body?: any): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    const token = getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch(`${BASE}${path}`, { method: 'POST', headers, body: body ? JSON.stringify(body) : undefined })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || `Erreur ${res.status}`)
    }
    return res.json()
  },

  async put<T = any>(path: string, body?: any): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    const token = getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch(`${BASE}${path}`, { method: 'PUT', headers, body: body ? JSON.stringify(body) : undefined })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || `Erreur ${res.status}`)
    }
    return res.json()
  },

  async del<T = any>(path: string): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    const token = getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch(`${BASE}${path}`, { method: 'DELETE', headers })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || `Erreur ${res.status}`)
    }
    return res.json()
  },

  setToken(token: string) { if (typeof window !== 'undefined') localStorage.setItem('vrg_token', token) },
  clearToken() { if (typeof window !== 'undefined') localStorage.removeItem('vrg_token') },
}
