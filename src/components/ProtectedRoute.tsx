import React from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import Layout from '@/components/Layout'

import type { UserRole } from '@/types'

interface ProtectedRouteProps {
  allowedRoles?: UserRole[]
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { isAuthenticated, isLoading, user } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F6F7F9] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm text-gray-600 font-medium">
          Carregando TD Technology System ERP...
        </p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  const role = user?.role || 'administrador'
  if (allowedRoles && !allowedRoles.includes(role)) {
    // Redirecionar usuário com base no papel permitido
    if (role === 'tecnico') {
      return <Navigate to="/ordens-de-servico" replace />
    }
    if (role === 'cliente') {
      return <Navigate to="/faturamento" replace />
    }
    return <Navigate to="/dashboard" replace />
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  )
}
