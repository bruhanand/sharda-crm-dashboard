const BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1').replace(/\/$/, '')

const buildUrl = (endpoint, params) => {
  const path = endpoint.startsWith('http') ? endpoint : `${BASE_URL}/${endpoint.replace(/^\//, '')}`
  const url = new URL(path)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '' || value === false) return
      url.searchParams.append(key, value)
    })
  }
  return url
}

export const apiRequest = async (endpoint, options = {}) => {
  const { params, signal, headers = {}, ...rest } = options
  const url = buildUrl(endpoint, params)

  // Add auth token if available
  const token = localStorage.getItem('authToken')
  const authHeaders = {
    ...headers,
    ...(token && { 'Authorization': `Token ${token}` }),
  }

  const response = await fetch(url, {
    signal,
    headers: authHeaders,
    credentials: 'include',  // CRITICAL: Include cookies/credentials with all requests
    ...rest,
  })

  if (response.status === 401) {
    // Clear token and redirect to login if unauthorized
    localStorage.removeItem('authToken')
    window.location.href = '/'
    throw new Error('Unauthorized')
  }

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`API ${response.status}: ${message}`)
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null
  }

  return response.json()
}

export { BASE_URL as API_BASE_URL }
