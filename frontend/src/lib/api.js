const BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '')

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
    Accept: 'application/json',
    ...headers,
    ...(token && { Authorization: `Token ${token}` }),
  }

  const response = await fetch(url, {
    signal,
    headers: authHeaders,
    credentials: 'include', // include cookies/credentials with all requests
    ...rest,
  })

  if (response.status === 401) {
    localStorage.removeItem('authToken')
    window.location.href = '/'
    const err = new Error('Unauthorized')
    err.status = 401
    throw err
  }

  // Unified error handling with JSON-first parsing
  if (!response.ok) {
    let parsedBody
    try {
      parsedBody = await response.clone().json()
    } catch (_) {
      parsedBody = await response.text()
    }

    const message =
      (parsedBody && parsedBody.error && parsedBody.error.message) ||
      (typeof parsedBody === 'string' ? parsedBody : JSON.stringify(parsedBody))

    const err = new Error(`API ${response.status}: ${message}`)
    err.status = response.status
    err.details = parsedBody
    throw err
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
}

export { BASE_URL as API_BASE_URL }
