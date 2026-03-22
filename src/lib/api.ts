const BASE_URL = import.meta.env.VITE_API_URL || 'https://69beaab117c3d7d97792a813.mockapi.io/obel'
const HABITS_BASE_URL = import.meta.env.VITE_HABITS_API_URL || 'https://69beb74717c3d7d97792cc34.mockapi.io/obelv2'

function getBaseUrl(endpoint: string) {
  return endpoint.startsWith('/habits') ? HABITS_BASE_URL : BASE_URL
}

export async function apiGet<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${getBaseUrl(endpoint)}${endpoint}`)
  if (!res.ok) throw new Error(`GET ${endpoint} failed`)
  return res.json()
}

export async function apiPost<T>(endpoint: string, data: any): Promise<T> {
  const res = await fetch(`${getBaseUrl(endpoint)}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`POST ${endpoint} failed`)
  return res.json()
}

export async function apiPut<T>(endpoint: string, data: any): Promise<T> {
  const res = await fetch(`${getBaseUrl(endpoint)}${endpoint}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`PUT ${endpoint} failed`)
  return res.json()
}

export async function apiDelete<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${getBaseUrl(endpoint)}${endpoint}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error(`DELETE ${endpoint} failed`)
  return res.json()
}
