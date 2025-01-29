import { createContext, useContext, useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { AuthService } from './service'
import { UserRole } from './config'

interface AuthContextType {
  session: Session | null
  user: User | null
  userRole: UserRole | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, role: UserRole, name: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Initialize auth state
    const initAuth = async () => {
      try {
        const session = await AuthService.getSession()
        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          const role = await AuthService.getCurrentUserRole()
          setUserRole(role)
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { session } = await AuthService.signIn(email, password)
    setSession(session)
    setUser(session?.user ?? null)

    if (session?.user) {
      const role = await AuthService.getCurrentUserRole()
      setUserRole(role)
    }
  }

  const signUp = async (email: string, password: string, role: UserRole, name: string) => {
    await AuthService.signUp(email, password, role, name)
    // Note: User needs to verify email before signing in
  }

  const signOut = async () => {
    await AuthService.signOut()
    setSession(null)
    setUser(null)
    setUserRole(null)
  }

  const resetPassword = async (email: string) => {
    await AuthService.resetPassword(email)
  }

  const value = {
    session,
    user,
    userRole,
    isLoading,
    signIn,
    signUp,
    signOut,
    resetPassword,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 