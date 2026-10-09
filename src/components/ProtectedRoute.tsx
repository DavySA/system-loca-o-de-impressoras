import React from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import Layout from '@/components/Layout'

import type { UserRole, ModuloSistema } from '@/types'
import { resolverPermissoesUsuario } from '@/lib/permissoes'

interface ProtectedRouteProps {
  allowedRoles?: UserRole[]
  requiredModulo?: ModuloSistema
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, requiredModulo }) => {
  const { isAuthenticated, isLoading, user } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F6F7F9] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm text-gray-600 font-medium">Carregando STD...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  const role = user?.role || 'administrador'
  const isCliente = role === 'cliente'
  const isAdmin = role === 'administrador'
  const userPermissoes = resolverPermissoesUsuario(user || {})

  // 1. Regras do Perfil Especial: CLIENTE
  // O cliente tem acesso EXCLUSIVO a:
  // - Dashboard / Portal do cliente
  // - Meu contrato (detalhes do cliente / contrato digital)
  // - Ordens de serviço (abertura e histórico próprio)
  // - Faturamento (faturas próprias)
  if (isCliente) {
    // Se a rota requer um papel e cliente não estiver entre eles, barrar
    if (allowedRoles && !allowedRoles.includes('cliente')) {
      return <Navigate to="/dashboard" replace />
    }
    // Se a rota requer um módulo específico, permitir apenas os do cliente
    if (requiredModulo) {
      const modulosClientePermitidos: ModuloSistema[] = [
        'dashboard',
        'ordens_servico',
        'faturamento',
        'meu_contrato',
        'clientes', // caso acesse seu próprio contrato via /clientes/:id
      ]
      if (!modulosClientePermitidos.includes(requiredModulo)) {
        return <Navigate to="/dashboard" replace />
      }
    }
  } else if (!isAdmin) {
    // 2. Colaboradores internos (não-admin) verificam as funções/módulos marcados
    if (requiredModulo && !userPermissoes.includes(requiredModulo)) {
      // Redirecionar para a primeira rota que ele possui permissão
      if (userPermissoes.includes('dashboard')) return <Navigate to="/dashboard" replace />
      if (userPermissoes.includes('ordens_servico'))
        return <Navigate to="/ordens-de-servico" replace />
      if (userPermissoes.includes('clientes')) return <Navigate to="/clientes" replace />
      if (userPermissoes.includes('equipamentos')) return <Navigate to="/equipamentos" replace />
      if (userPermissoes.includes('grafica_rapida'))
        return <Navigate to="/grafica-rapida" replace />
      if (userPermissoes.includes('faturamento')) return <Navigate to="/faturamento" replace />
      if (userPermissoes.includes('suprimentos')) return <Navigate to="/suprimentos" replace />
      if (userPermissoes.includes('servicos')) return <Navigate to="/servicos" replace />
      return <Navigate to="/login" replace />
    }

    // Validação secundária caso tenha allowedRoles definido
    if (allowedRoles && !allowedRoles.includes(role)) {
      if (role === 'tecnico' && !requiredModulo) {
        return <Navigate to="/ordens-de-servico" replace />
      }
    }
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  )
}
