export function getApiBaseUrl() {
  const envBase = process.env.NEXT_PUBLIC_API_BASE_URL
  if (envBase && envBase.length > 0) return envBase

  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    if (host === 'localhost' || host === '127.0.0.1') {
      return `http://${host}:5710`
    }
    return window.location.origin
  }

  return 'http://localhost:5710'
}
