import React, { useState, useEffect } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutGrid,
  Users,
  Printer,
  ClipboardList,
  Receipt,
  Wrench,
  LogOut,
  Bell,
  Menu,
  X,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { ordensServicoService } from '@/services/ordensServico'
import { useRealtime } from '@/hooks/use-realtime'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

interface LayoutProps {
  children?: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [openOsCount, setOpenOsCount] = useState<number>(0)

  // Carregar contagem de ordens de serviço abertas
  const loadOpenOsCount = async () => {
    try {
      const list = await ordensServicoService.getAll('status != "concluida"')
      setOpenOsCount(list.length)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadOpenOsCount()
  }, [])

  // Realtime para atualizar contagem de O.S.
  useRealtime('ordens_servico', () => {
    loadOpenOsCount()
  })

  // Fechar drawer mobile ao trocar de rota
  useEffect(() => {
    setMobileDrawerOpen(false)
  }, [location.pathname])

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutGrid },
    { label: 'Clientes', path: '/clientes', icon: Users },
    { label: 'Equipamentos', path: '/equipamentos', icon: Printer },
    {
      label: 'Ordens de Serviço',
      path: '/ordens-de-servico',
      icon: ClipboardList,
      badge: openOsCount,
    },
    { label: 'Faturamento', path: '/faturamento', icon: Receipt },
    { label: 'Serviços', path: '/servicos', icon: Wrench },
  ]

  // Obter título da página atual
  const getPageTitle = () => {
    const path = location.pathname
    if (path.startsWith('/dashboard')) return 'Dashboard Executivo'
    if (path.startsWith('/clientes/')) return 'Detalhes do Cliente'
    if (path.startsWith('/clientes')) return 'Gestão de Clientes'
    if (path.startsWith('/equipamentos/')) return 'Detalhes do Equipamento'
    if (path.startsWith('/equipamentos')) return 'Parque de Equipamentos'
    if (path.startsWith('/ordens-de-servico/')) return 'Detalhes da Ordem de Serviço'
    if (path.startsWith('/ordens-de-servico')) return 'Ordens de Serviço'
    if (path.startsWith('/faturamento')) return 'Faturamento & Leituras'
    if (path.startsWith('/servicos')) return 'Catálogo de Serviços'
    return 'PrintGest'
  }

  const getInitials = (name?: string) => {
    if (!name) return 'PG'
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-[#F6F7F9] flex flex-col antialiased">
      {/* Mobile Drawer Backdrop */}
      {mobileDrawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity duration-250 lg:hidden"
          onClick={() => setMobileDrawerOpen(false)}
        />
      )}

      {/* Sidebar Desktop & Tablet & Mobile Drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col bg-[#1F2937] text-white border-r border-[#374151] transition-all duration-250 ease-in-out',
          // Desktop: 260px
          'lg:w-[260px]',
          // Tablet: 72px icon-only
          'md:w-[72px] lg:w-[260px]',
          // Mobile: drawer deslizante pela esquerda
          mobileDrawerOpen
            ? 'w-[260px] translate-x-0 shadow-2xl'
            : '-translate-x-full md:translate-x-0 w-[72px]',
        )}
      >
        {/* Logo Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-[#374151]">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 shadow-md">
              <Printer className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col md:hidden lg:flex overflow-hidden">
              <span className="font-semibold text-lg text-white tracking-tight">PrintGest</span>
              <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                Locação ERP
              </span>
            </div>
          </div>
          {/* Close button on mobile drawer */}
          <button
            type="button"
            className="md:hidden text-gray-400 hover:text-white p-1"
            onClick={() => setMobileDrawerOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 py-4 px-2 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname.startsWith(item.path)
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  'group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-[#273449] text-white shadow-xs'
                    : 'text-gray-300 hover:bg-[#273449]/60 hover:text-white',
                )}
                title={item.label}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-blue-600 rounded-r-full" />
                )}
                <Icon
                  className={cn(
                    'w-5 h-5 shrink-0 transition-colors',
                    isActive ? 'text-white' : 'text-gray-400 group-hover:text-white',
                  )}
                />
                <span className="truncate md:hidden lg:inline">{item.label}</span>

                {/* Badge if exists */}
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={cn(
                      'ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-red-600 text-white shadow-xs',
                      'md:hidden lg:inline-block',
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Sidebar Footer with Logged User Card */}
        <div className="p-3 border-t border-[#374151]">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-[#273449]/80 border border-[#374151]">
            <Avatar className="w-9 h-9 border border-gray-600 shrink-0">
              <AvatarFallback className="bg-blue-600 text-white text-xs font-semibold">
                {getInitials(user?.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 md:hidden lg:block">
              <p className="text-xs font-semibold text-white truncate leading-tight">
                {user?.name || 'Administrador'}
              </p>
              <p className="text-[11px] text-gray-400 truncate">
                {user?.email || 'admin@printgest.com'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="text-gray-400 hover:text-red-400 p-1.5 rounded-md hover:bg-[#1F2937] transition-colors"
              title="Sair do sistema"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col md:pl-[72px] lg:pl-[260px] transition-all duration-250">
        {/* Top Header */}
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-[#E5E7EB] flex items-center justify-between px-4 sm:px-6 shadow-xs">
          <div className="flex items-center gap-3">
            {/* Hamburger on Mobile */}
            <button
              type="button"
              className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 focus:outline-none"
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Abrir menu lateral"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
              {getPageTitle()}
            </h1>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {/* Bell Notifications */}
            <button
              type="button"
              onClick={() => navigate('/ordens-de-servico')}
              className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title={`${openOsCount} ordens de serviço abertas`}
            >
              <Bell className="w-5 h-5" />
              {openOsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 text-[10px] font-bold text-white bg-red-600 rounded-full flex items-center justify-center animate-pulse">
                  {openOsCount}
                </span>
              )}
            </button>

            {/* User Info Desktop */}
            <div className="hidden sm:flex items-center gap-2.5 pl-2 border-l border-gray-200">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-gray-800 text-white text-xs font-medium">
                  {getInitials(user?.name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs font-semibold text-gray-800">
                {user?.name || 'Administrador'}
              </span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 bg-[#F6F7F9]">
          <div className="max-w-7xl mx-auto animate-in fade-in-50 duration-200">{children}</div>
        </main>

        {/* Footer */}
        <footer className="py-4 px-6 bg-white border-t border-[#E5E7EB] text-center text-xs text-gray-500">
          © 2025 PrintGest — Sistema de Gestão de Locação de Impressoras • v1.0.0
        </footer>
      </div>
    </div>
  )
}
