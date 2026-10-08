import React, { createContext, useContext, useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import type { AppUser } from '@/types'

interface AuthContextType {
  user: AppUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, pass: string) => Promise<void>
  logout: () => void
  requestPasswordReset: (email: string) => Promise<void>
  confirmPasswordReset: (token: string, pass: string, passConfirm: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    // Inicializar estado a partir do authStore do PocketBase
    if (pb.authStore.isValid && pb.authStore.record) {
      setUser({
        id: pb.authStore.record.id,
        email: pb.authStore.record.email,
        name: pb.authStore.record.name || 'Usuário',
        avatar: pb.authStore.record.avatar,
        role: pb.authStore.record.role || 'administrador',
        cliente_id: pb.authStore.record.cliente_id || undefined,
        permissoes: Array.isArray(pb.authStore.record.permissoes)
          ? pb.authStore.record.permissoes
          : undefined,
      })
    } else {
      setUser(null)
    }
    setIsLoading(false)

    // Ouvir alterações no authStore
    const unsubscribe = pb.authStore.onChange((token, record) => {
      if (token && record) {
        setUser({
          id: record.id,
          email: record.email,
          name: record.name || 'Usuário',
          avatar: record.avatar,
          role: record.role || 'administrador',
          cliente_id: record.cliente_id || undefined,
          permissoes: Array.isArray(record.permissoes) ? record.permissoes : undefined,
        })
      } else {
        setUser(null)
      }
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const login = async (email: string, pass: string) => {
    const authData = await pb.collection('users').authWithPassword(email, pass)
    if (authData.record) {
      setUser({
        id: authData.record.id,
        email: authData.record.email,
        name: authData.record.name || 'Usuário',
        avatar: authData.record.avatar,
        role: authData.record.role || 'administrador',
        cliente_id: authData.record.cliente_id || undefined,
        permissoes: Array.isArray(authData.record.permissoes)
          ? authData.record.permissoes
          : undefined,
      })
    }
  }

  const logout = () => {
    pb.authStore.clear()
    setUser(null)
  }

  const requestPasswordReset = async (email: string) => {
    await pb.collection('users').requestPasswordReset(email)
  }

  const confirmPasswordReset = async (token: string, pass: string, passConfirm: string) => {
    await pb.collection('users').confirmPasswordReset(token, pass, passConfirm)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        requestPasswordReset,
        confirmPasswordReset,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}
