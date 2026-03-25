const BASE_URL = import.meta.env.VITE_API_URL 
const HABITS_BASE_URL = import.meta.env.VITE_HABITS_API_URL 
function getBaseUrl(endpoint: string) {
  return endpoint.startsWith('/habits') ? HABITS_BASE_URL : BASE_URL
}

export async function apiGet<T>(endpoint: string): Promise<T> {
  try {
    const res = await fetch(`${getBaseUrl(endpoint)}${endpoint}`)
    if (res.status === 404) return [] as any
    if (!res.ok) throw new Error(`GET ${endpoint} failed: ${res.status}`)
    return await res.json()
  } catch (err) {
    console.error('API GET Error:', err)
    throw err
  }
}

export async function apiPost<T>(endpoint: string, data: any): Promise<T> {
  try {
    const res = await fetch(`${getBaseUrl(endpoint)}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error(`POST ${endpoint} failed: ${res.status}`)
    return await res.json()
  } catch (err) {
    console.error('API POST Error:', err)
    throw err
  }
}

export async function apiPut<T>(endpoint: string, data: any): Promise<T> {
  try {
    const res = await fetch(`${getBaseUrl(endpoint)}${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error(`PUT ${endpoint} failed: ${res.status}`)
    return await res.json()
  } catch (err) {
    console.error('API PUT Error:', err)
    throw err
  }
}

export async function apiDelete<T>(endpoint: string): Promise<T> {
  try {
    const res = await fetch(`${getBaseUrl(endpoint)}${endpoint}`, {
      method: 'DELETE',
    })
    if (!res.ok) throw new Error(`DELETE ${endpoint} failed: ${res.status}`)
    return await res.json()
  } catch (err) {
    console.error('API DELETE Error:', err)
    throw err
  }
}
