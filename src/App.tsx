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
import Relatorios from './pages/Relatorios'
import Suprimentos from './pages/Suprimentos'
import GraficaRapida from './pages/GraficaRapida'
import ComissoesMetas from './pages/ComissoesMetas'
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

          {/* Rotas Autenticadas com Proteção por Módulos/Funções Marcadas */}
          {/* Dashboard executivo / Portal do Cliente */}
          <Route
            element={
              <ProtectedRoute
                requiredModulo="dashboard"
                allowedRoles={['administrador', 'cliente']}
              />
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
          </Route>

          {/* Clientes */}
          <Route
            element={
              <ProtectedRoute
                requiredModulo="clientes"
                allowedRoles={['administrador', 'operador']}
              />
            }
          >
            <Route path="/clientes" element={<Clientes />} />
          </Route>

          {/* Detalhes do Cliente / Meu Contrato (Cliente vê apenas o seu contrato; Admin e Operador com permissão de clientes veem) */}
          <Route
            element={
              <ProtectedRoute
                requiredModulo="clientes"
                allowedRoles={['administrador', 'cliente', 'operador']}
              />
            }
          >
            <Route path="/clientes/:id" element={<ClienteDetalhe />} />
          </Route>

          {/* Equipamentos */}
          <Route
            element={
              <ProtectedRoute
                requiredModulo="equipamentos"
                allowedRoles={['administrador', 'operador']}
              />
            }
          >
            <Route path="/equipamentos" element={<Equipamentos />} />
            <Route path="/equipamentos/:id" element={<EquipamentoDetalhe />} />
          </Route>

          {/* Suprimentos */}
          <Route
            element={
              <ProtectedRoute
                requiredModulo="suprimentos"
                allowedRoles={['administrador', 'operador']}
              />
            }
          >
            <Route path="/suprimentos" element={<Suprimentos />} />
          </Route>

          {/* Gráfica Rápida (PDV/Caixa) */}
          <Route
            element={
              <ProtectedRoute
                requiredModulo="grafica_rapida"
                allowedRoles={['administrador', 'operador']}
              />
            }
          >
            <Route path="/grafica-rapida" element={<GraficaRapida />} />
          </Route>

          {/* Comissões & Metas */}
          <Route
            element={
              <ProtectedRoute
                requiredModulo="comissoes_metas"
                allowedRoles={['administrador', 'operador', 'tecnico']}
              />
            }
          >
            <Route path="/comissoes-metas" element={<ComissoesMetas />} />
          </Route>

          {/* Catálogo de Serviços */}
          <Route
            element={
              <ProtectedRoute
                requiredModulo="servicos"
                allowedRoles={['administrador', 'operador']}
              />
            }
          >
            <Route path="/servicos" element={<Servicos />} />
          </Route>

          {/* Ordens de Serviço */}
          <Route
            element={
              <ProtectedRoute
                requiredModulo="ordens_servico"
                allowedRoles={['administrador', 'tecnico', 'cliente', 'operador']}
              />
            }
          >
            <Route path="/ordens-de-servico" element={<OrdensServico />} />
            <Route path="/ordens-de-servico/:id" element={<OrdemServicoDetalhe />} />
          </Route>

          {/* Faturamento */}
          <Route
            element={
              <ProtectedRoute
                requiredModulo="faturamento"
                allowedRoles={['administrador', 'cliente']}
              />
            }
          >
            <Route path="/faturamento" element={<Faturamento />} />
          </Route>

          {/* Relatórios Mensais (Apenas Admin ou quem tiver a função de relatórios marcada) */}
          <Route
            element={
              <ProtectedRoute requiredModulo="relatorios" allowedRoles={['administrador']} />
            }
          >
            <Route path="/relatorios" element={<Relatorios />} />
          </Route>

          {/* Usuários (Gerenciamento de contas e permissões) */}
          <Route
            element={<ProtectedRoute requiredModulo="usuarios" allowedRoles={['administrador']} />}
          >
            <Route path="/usuarios" element={<Usuarios />} />
          </Route>

          {/* Personalizar (Configurações institucionais) */}
          <Route
            element={
              <ProtectedRoute requiredModulo="personalizar" allowedRoles={['administrador']} />
            }
          >
            <Route path="/personalizar" element={<Personalizar />} />
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
