export function getApiBaseUrl() {
  const envBase = process.env.NEXT_PUBLIC_API_BASE_URL
  if (envBase && envBase.length > 0) return envBase

  if (typeof window !== 'undefined') {
    return `http://${window.location.hostname}:5710`
  }

  return 'http://localhost:5710'
}
