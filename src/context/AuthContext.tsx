import { createContext, useContext, useState, type ReactNode } from "react"

export type UserRole = "admin" | "observer" | "auditor" | "student"

export interface AuthUser {
  id: string
  email: string
  name: string
  role: UserRole
}

interface AuthState {
  token: string | null
  user: AuthUser | null
  pendingEmail: string | null
}

interface AuthContextType extends AuthState {
  setPendingEmail: (email: string) => void
  login: (token: string, user: AuthUser) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

const STORAGE_KEY = "auth_session"

function isTokenExpired(token: string): boolean {
  try {
    const payloadB64 = token.split(".")[1]
    const payload = JSON.parse(atob(payloadB64))
    return typeof payload.exp === "number" && payload.exp * 1000 < Date.now()
  } catch {
    return true
  }
}

function loadSession(): AuthState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AuthState
      if (parsed.token && isTokenExpired(parsed.token)) {
        localStorage.removeItem(STORAGE_KEY)
        return { token: null, user: null, pendingEmail: null }
      }
      return parsed
    }
  } catch {
    // ignore parse errors
  }
  return { token: null, user: null, pendingEmail: null }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(loadSession)

  const setPendingEmail = (email: string) =>
    setState((s) => ({ ...s, pendingEmail: email }))

  const login = (token: string, user: AuthUser) => {
    const next: AuthState = { token, user, pendingEmail: null }
    setState(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // session won't persist across page refreshes if storage is full
    }
  }

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY)
    setState({ token: null, user: null, pendingEmail: null })
  }

  return (
    <AuthContext.Provider value={{ ...state, setPendingEmail, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
