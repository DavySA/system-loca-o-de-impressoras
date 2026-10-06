import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Toaster } from './components/ui/toaster'

// Páginas Públicas de Autenticação
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'

// Páginas da Aplicação
import Dashboard from './pages/Dashboard'
import Clientes from './pages/Clientes'
import ClienteDetalhe from './pages/ClienteDetalhe'
import Equipamentos from './pages/Equipamentos'
import EquipamentoDetalhe from './pages/EquipamentoDetalhe'
import OrdensServico from './pages/OrdensServico'
import OrdemServicoDetalhe from './pages/OrdemServicoDetalhe'
import Faturamento from './pages/Faturamento'
import Servicos from './pages/Servicos'
import Usuarios from './pages/Usuarios'
import Personalizar from './pages/Personalizar'
import NotFound from './pages/NotFound'

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Rotas Públicas */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Rota Raiz redireciona para Dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Rotas Autenticadas com restrição por Perfil */}
          {/* Administrador: Acesso Total */}
          <Route element={<ProtectedRoute allowedRoles={['administrador']} />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/clientes/:id" element={<ClienteDetalhe />} />
            <Route path="/equipamentos" element={<Equipamentos />} />
            <Route path="/equipamentos/:id" element={<EquipamentoDetalhe />} />
            <Route path="/servicos" element={<Servicos />} />
            <Route path="/usuarios" element={<Usuarios />} />
            <Route path="/personalizar" element={<Personalizar />} />
          </Route>

          {/* Ordens de Serviço: Administrador, Técnico e Cliente */}
          <Route
            element={<ProtectedRoute allowedRoles={['administrador', 'tecnico', 'cliente']} />}
          >
            <Route path="/ordens-de-servico" element={<OrdensServico />} />
            <Route path="/ordens-de-servico/:id" element={<OrdemServicoDetalhe />} />
          </Route>

          {/* Faturamento: Administrador e Cliente */}
          <Route element={<ProtectedRoute allowedRoles={['administrador', 'cliente']} />}>
            <Route path="/faturamento" element={<Faturamento />} />
          </Route>

          {/* Rota 404 Não Encontrada */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </AuthProvider>
  )
}

export default App
