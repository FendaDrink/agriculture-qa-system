import { jwtDecode } from 'jwt-decode'
import type { AuthTokenPayload, AuthUser } from '../types/api'

const AUTH_STORAGE_KEY = 'frontend-admin-auth'

export const getAuthUser = (): AuthUser | null => {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as AuthUser
    if (!parsed?.token) return null
    const payload = jwtDecode<AuthTokenPayload>(parsed.token)
    if (payload?.exp && payload.exp * 1000 < Date.now()) {
      clearAuth()
      return null
    }
    return parsed
  } catch (error) {
    clearAuth()
    return null
  }
}

export const getAuthToken = (): string | null => {
  return getAuthUser()?.token ?? null
}

export const saveAuthUser = (user: AuthUser) => {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user))
}

export const clearAuth = () => {
  localStorage.removeItem(AUTH_STORAGE_KEY)
}
