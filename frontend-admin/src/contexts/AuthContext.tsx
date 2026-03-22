import { createContext, useCallback, useMemo, useState } from 'react'
import type { AuthTokenPayload, AuthUser } from '../types/api'
import { clearAuth, getAuthUser, saveAuthUser } from '../utils/auth'
import { jwtDecode } from 'jwt-decode'

interface AuthContextValue {
  user: AuthUser | null
  login: (token: string) => void
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => getAuthUser())

  const login = useCallback((token: string) => {
    const payload = jwtDecode<AuthTokenPayload>(token)
    const authUser: AuthUser = {
      userId: payload.userId,
      username: payload.username,
      roleId: payload.roleId,
      token,
    }
    saveAuthUser(authUser)
    setUser(authUser)
  }, [])

  const logout = useCallback(() => {
    clearAuth()
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
