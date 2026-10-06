import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Toaster } from '@/components/ui/toaster'

// Auth pages
import Login from '@/pages/Login'
import ForgotPassword from '@/pages/ForgotPassword'
import ResetPassword from '@/pages/ResetPassword'

// ERP pages
import Dashboard from '@/pages/Dashboard'
import Clientes from '@/pages/Clientes'
import ClienteDetalhe from '@/pages/ClienteDetalhe'
import Equipamentos from '@/pages/Equipamentos'
import EquipamentoDetalhe from '@/pages/EquipamentoDetalhe'
import OrdensServico from '@/pages/OrdensServico'
import OrdemServicoDetalhe from '@/pages/OrdemServicoDetalhe'
import Faturamento from '@/pages/Faturamento'
import Servicos from '@/pages/Servicos'
import NotFound from '@/pages/NotFound'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Rotas Públicas de Autenticação */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Rotas Protegidas (Exigem Login, envolvidas pelo Layout B2B) */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/clientes/:id" element={<ClienteDetalhe />} />
            <Route path="/equipamentos" element={<Equipamentos />} />
            <Route path="/equipamentos/:id" element={<EquipamentoDetalhe />} />
            <Route path="/ordens-de-servico" element={<OrdensServico />} />
            <Route path="/ordens-de-servico/:id" element={<OrdemServicoDetalhe />} />
            <Route path="/faturamento" element={<Faturamento />} />
            <Route path="/servicos" element={<Servicos />} />
          </Route>

          {/* Rota 404 Não Encontrada */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  )
}
