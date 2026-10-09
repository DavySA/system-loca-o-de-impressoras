import React, { useState, useEffect } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutGrid,
  Users,
  Printer,
  ClipboardList,
  Receipt,
  Wrench,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  BarChart3,
  Package,
  Layers,
  Phone,
  Mail,
  Globe,
  Share2,
  Target,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { ordensServicoService } from '@/services/ordensServico'
import { faturasService } from '@/services/faturas'
import { contratosService } from '@/services/contratos'
import { configuracoesService } from '@/services/configuracoes'
import { useRealtime } from '@/hooks/use-realtime'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import defaultLogo from '@/assets/logo-png-copia-13bb2.png'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatDate, formatCurrency } from '@/lib/formatters'
import type { ConfiguracoesEmpresa, ModuloSistema } from '@/types'
import { resolverPermissoesUsuario } from '@/lib/permissoes'

interface LayoutProps {
  children?: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [openOsCount, setOpenOsCount] = useState<number>(0)
  const [empresaConfig, setEmpresaConfig] = useState<ConfiguracoesEmpresa | null>(null)

  useEffect(() => {
    configuracoesService.get().then((cfg) => {
      if (cfg) setEmpresaConfig(cfg)
    })
  }, [])

  useRealtime('configuracoes_empresa', () => {
    configuracoesService.get().then((cfg) => {
      if (cfg) setEmpresaConfig(cfg)
    })
  })

  // Alertas de notificações do sistema para o sino
  const [notificacoes, setNotificacoes] = useState<
    {
      id: string
      tipo: 'os' | 'fatura_vencida' | 'fatura_avencer' | 'contrato_vencendo'
      titulo: string
      descricao: string
      link: string
      dataVencimento?: string
      prioridade: 'alta' | 'media' | 'baixa'
    }[]
  >([])

  const role = user?.role || 'administrador'

  // Carregar contagem de ordens de serviço abertas e alertas reativos
  const loadAlertasENotificacoes = async () => {
    try {
      const now = new Date()
      const thirtyDays = new Date()
      thirtyDays.setDate(thirtyDays.getDate() + 30)

      const sevenDays = new Date()
      sevenDays.setDate(sevenDays.getDate() + 7)

      let osFilter = 'status != "concluida"'
      if (role === 'cliente' && user?.cliente_id) {
        osFilter += ` && cliente_id = "${user.cliente_id}"`
      }

      const [osList, fatList, contList] = await Promise.all([
        ordensServicoService.getAll(osFilter),
        faturasService.getAll(
          role === 'cliente' && user?.cliente_id ? `cliente_id = "${user.cliente_id}"` : '',
        ),
        role === 'administrador'
          ? contratosService.getAll('status = "ativo"')
          : Promise.resolve([]),
      ])

      setOpenOsCount(osList.length)

      const alerts: typeof notificacoes = []

      // 1. Ordens de Serviço abertas (com alta prioridade primeiro)
      osList.slice(0, 3).forEach((os) => {
        alerts.push({
          id: `os-${os.id}`,
          tipo: 'os',
          titulo: `O.S. ${os.id.slice(0, 8).toUpperCase()} pendente`,
          descricao: os.descricao_problema || 'Atendimento aguardando conclusão',
          link: `/ordens-de-servico/${os.id}`,
          prioridade: os.prioridade === 'alta' ? 'alta' : 'media',
        })
      })

      // 2. Faturas vencidas e a vencer
      fatList.forEach((f) => {
        if (f.status === 'paga' || f.status === 'cancelada') return
        let dVenc: Date
        if (f.data_vencimento) {
          dVenc = new Date(f.data_vencimento)
        } else if (f.mes_referencia) {
          const [anoStr, mesStr] = f.mes_referencia.split('-')
          const anoRef = parseInt(anoStr, 10)
          const mesRef = parseInt(mesStr, 10)
          dVenc = new Date(anoRef, mesRef, 10)
        } else {
          dVenc = new Date(new Date(f.created).getTime() + 10 * 24 * 3600 * 1000)
        }

        const diffDias = Math.ceil((dVenc.getTime() - now.getTime()) / (1000 * 3600 * 24))

        if (f.status === 'vencida' || dVenc < now) {
          alerts.push({
            id: `fat-venc-${f.id}`,
            tipo: 'fatura_vencida',
            titulo: 'Fatura Vencida em Atraso',
            descricao: `Fatura de ${formatCurrency(f.valor_total)} vencida em ${formatDate(dVenc.toISOString())}`,
            link: '/faturamento',
            prioridade: 'alta',
          })
        } else if (diffDias <= 7 && diffDias >= 0) {
          alerts.push({
            id: `fat-avenc-${f.id}`,
            tipo: 'fatura_avencer',
            titulo: 'Fatura a Vencer',
            descricao: `Vence em ${formatDate(dVenc.toISOString())}: ${formatCurrency(f.valor_total)}`,
            link: '/faturamento',
            prioridade: 'media',
          })
        }
      })

      // 3. Contratos vencendo em <= 30 dias (apenas admin)
      if (role === 'administrador') {
        contList.forEach((c) => {
          if (c.data_fim) {
            const dFim = new Date(c.data_fim)
            if (dFim <= thirtyDays && dFim >= now) {
              alerts.push({
                id: `cont-${c.id}`,
                tipo: 'contrato_vencendo',
                titulo: 'Contrato Vencendo',
                descricao: `Contrato do cliente vence em ${formatDate(c.data_fim)}`,
                link: `/clientes/${c.cliente_id}`,
                prioridade: 'media',
              })
            }
          }
        })
      }

      setNotificacoes(alerts)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadAlertasENotificacoes()
  }, [role, user?.cliente_id])

  // Realtime para atualizar contadores e alertas
  useRealtime('ordens_servico', () => loadAlertasENotificacoes())
  useRealtime('faturas', () => loadAlertasENotificacoes())
  useRealtime('contratos', () => loadAlertasENotificacoes())

  // Fechar drawer mobile ao trocar de rota
  useEffect(() => {
    setMobileDrawerOpen(false)
  }, [location.pathname])

  const userPerms = resolverPermissoesUsuario(user || {})

  interface MenuItem {
    label: string
    path: string
    icon: any
    badge?: number
    modulo: ModuloSistema
    somenteCliente?: boolean
    ocultarParaCliente?: boolean
  }

  const rawMenuItems: MenuItem[] = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: LayoutGrid,
      modulo: 'dashboard',
    },
    {
      label: 'Clientes',
      path: '/clientes',
      icon: Users,
      modulo: 'clientes',
      ocultarParaCliente: true,
    },
    {
      label: 'Equipamentos',
      path: '/equipamentos',
      icon: Printer,
      modulo: 'equipamentos',
      ocultarParaCliente: true,
    },
    {
      label: 'Ordens de Serviço',
      path: '/ordens-de-servico',
      icon: ClipboardList,
      badge: openOsCount,
      modulo: 'ordens_servico',
    },
    {
      label: 'Faturamento',
      path: '/faturamento',
      icon: Receipt,
      modulo: 'faturamento',
    },
    {
      label: 'Meu Contrato',
      path: user?.cliente_id ? `/clientes/${user.cliente_id}` : '/clientes',
      icon: Receipt,
      modulo: 'meu_contrato',
      somenteCliente: true,
    },
    {
      label: 'Suprimentos',
      path: '/suprimentos',
      icon: Package,
      modulo: 'suprimentos',
      ocultarParaCliente: true,
    },
    {
      label: 'Gráfica Rápida',
      path: '/grafica-rapida',
      icon: Layers,
      modulo: 'grafica_rapida',
      ocultarParaCliente: true,
    },
    {
      label: 'Comissões & Metas',
      path: '/comissoes-metas',
      icon: Target,
      modulo: 'comissoes_metas',
      ocultarParaCliente: true,
    },
    {
      label: 'Relatórios',
      path: '/relatorios',
      icon: BarChart3,
      modulo: 'relatorios',
      ocultarParaCliente: true,
    },
    {
      label: 'Serviços',
      path: '/servicos',
      icon: Wrench,
      modulo: 'servicos',
      ocultarParaCliente: true,
    },
    {
      label: 'Usuários',
      path: '/usuarios',
      icon: Users,
      modulo: 'usuarios',
      ocultarParaCliente: true,
    },
    {
      label: 'Personalizar',
      path: '/personalizar',
      icon: Settings,
      modulo: 'personalizar',
      ocultarParaCliente: true,
    },
  ]

  const navItems = rawMenuItems.filter((item) => {
    // 1. Cliente: apenas Dashboard, Ordens de Serviço, Faturamento e Meu Contrato
    if (role === 'cliente') {
      if (item.ocultarParaCliente) return false
      return ['dashboard', 'ordens_servico', 'faturamento', 'meu_contrato'].includes(item.modulo)
    }

    // 2. Não-cliente nunca vê Meu Contrato
    if (item.somenteCliente) return false

    // 3. Administrador vê tudo
    if (role === 'administrador') return true

    // 4. Usuários com funções marcadas veem exatamente o que foi marcado
    return userPerms.includes(item.modulo)
  })

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
    if (path.startsWith('/grafica-rapida')) return 'Gráfica Rápida (PDV/Caixa)'
    if (path.startsWith('/comissoes-metas')) return 'Comissões & Metas'
    if (path.startsWith('/servicos')) return 'Catálogo de Serviços'
    if (path.startsWith('/usuarios')) return 'Gerenciamento de Usuários'
    if (path.startsWith('/personalizar')) return 'Personalizar Empresa & Cabeçalho'
    if (path.startsWith('/relatorios')) return 'Relatórios Mensais'
    if (path.startsWith('/suprimentos')) return 'Gestão de Suprimentos & Peças'
    return 'STD'
  }

  const getInitials = (name?: string) => {
    if (!name) return 'TD'
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
        <div className="h-16 flex items-center justify-between px-3.5 border-b border-[#374151]">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-10 h-10 rounded-lg bg-white/10 p-1 flex items-center justify-center shrink-0 border border-white/10">
              <img src={defaultLogo} alt="STD" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col md:hidden lg:flex overflow-hidden">
              <span className="font-bold text-base text-white tracking-tight leading-none truncate">
                STD
              </span>
              <span className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider mt-0.5">
                Sistema ERP
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
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-semibold text-white truncate leading-tight">
                  {user?.name || 'Usuário'}
                </p>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  {role}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 truncate">
                {user?.email || 'usuario@printgest.com'}
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
            {/* Central de Notificações com Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none"
                  title="Central de Notificações"
                >
                  <Bell className="w-5 h-5" />
                  {notificacoes.length > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 text-[10px] font-bold text-white bg-red-600 rounded-full flex items-center justify-center animate-pulse">
                      {notificacoes.length > 9 ? '9+' : notificacoes.length}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 p-0 shadow-lg border-gray-200">
                <DropdownMenuLabel className="p-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between text-xs">
                  <span className="font-bold text-gray-900">Central de Alertas</span>
                  <span className="text-[10px] font-semibold text-blue-600">
                    {notificacoes.length} {notificacoes.length === 1 ? 'aviso' : 'avisos'}
                  </span>
                </DropdownMenuLabel>
                <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 text-xs">
                  {notificacoes.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 text-xs">
                      Nenhum alerta pendente no momento.
                    </div>
                  ) : (
                    notificacoes.map((item) => (
                      <DropdownMenuItem
                        key={item.id}
                        onClick={() => navigate(item.link)}
                        className="p-3 cursor-pointer hover:bg-blue-50/50 flex flex-col items-start gap-0.5"
                      >
                        <div className="flex items-center justify-between w-full">
                          <span
                            className={cn(
                              'font-bold text-[11px]',
                              item.prioridade === 'alta' ? 'text-red-700' : 'text-blue-900',
                            )}
                          >
                            {item.titulo}
                          </span>
                          <span
                            className={cn(
                              'text-[9px] px-1.5 py-0.2 rounded font-semibold uppercase',
                              item.prioridade === 'alta'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-blue-100 text-blue-800',
                            )}
                          >
                            {item.prioridade === 'alta' ? 'Urgente' : 'Aviso'}
                          </span>
                        </div>
                        <p className="text-gray-600 text-[11px] leading-tight line-clamp-2">
                          {item.descricao}
                        </p>
                      </DropdownMenuItem>
                    ))
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

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

        {/* Footer com contatos dinâmicos da TD Technology */}
        <footer className="py-4 px-4 sm:px-6 bg-white border-t border-[#E5E7EB] text-xs text-gray-600">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left">
            {/* Esquerda: Copyright e Site Fallback */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-2 gap-y-1">
              <span className="font-semibold text-gray-800">
                © {new Date().getFullYear()} {empresaConfig?.nome_fantasia || 'STD'}
              </span>
              <span className="hidden sm:inline text-gray-300">•</span>
              <a
                href={
                  empresaConfig?.website
                    ? empresaConfig.website.startsWith('http')
                      ? empresaConfig.website
                      : `https://${empresaConfig.website}`
                    : 'https://tdtechnology.com.br'
                }
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline font-medium inline-flex items-center gap-1"
              >
                <Globe className="w-3.5 h-3.5" />
                {empresaConfig?.website || 'tdtechnology.com.br'}
              </a>
            </div>

            {/* Direita: Contatos & Redes Sociais */}
            <div className="flex flex-wrap items-center justify-center md:justify-end gap-x-4 gap-y-1.5 text-gray-500 text-[11px]">
              {/* Telefone / WhatsApp */}
              {(empresaConfig?.telefone || empresaConfig?.whatsapp) && (
                <a
                  href={`tel:${(empresaConfig.whatsapp || empresaConfig.telefone || '').replace(/\D/g, '')}`}
                  className="flex items-center gap-1 hover:text-emerald-700 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{empresaConfig.whatsapp || empresaConfig.telefone}</span>
                </a>
              )}

              {/* E-mail */}
              {empresaConfig?.email && (
                <a
                  href={`mailto:${empresaConfig.email}`}
                  className="flex items-center gap-1 hover:text-blue-700 transition-colors"
                >
                  <Mail className="w-3.5 h-3.5 text-blue-600" />
                  <span>{empresaConfig.email}</span>
                </a>
              )}

              {/* Instagram */}
              {empresaConfig?.instagram && (
                <a
                  href={
                    empresaConfig.instagram.startsWith('http')
                      ? empresaConfig.instagram
                      : `https://instagram.com/${empresaConfig.instagram.replace('@', '')}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-pink-600 hover:text-pink-700 font-medium"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>
                    {empresaConfig.instagram.startsWith('@')
                      ? empresaConfig.instagram
                      : `@${empresaConfig.instagram.replace('https://instagram.com/', '').replace('/', '')}`}
                  </span>
                </a>
              )}

              {/* Facebook / LinkedIn */}
              {empresaConfig?.facebook && (
                <a
                  href={
                    empresaConfig.facebook.startsWith('http')
                      ? empresaConfig.facebook
                      : `https://${empresaConfig.facebook}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-blue-800 transition-colors"
                >
                  <span>{empresaConfig.facebook}</span>
                </a>
              )}

              {/* Fallback caso não haja contatos configurados */}
              {!empresaConfig?.telefone &&
                !empresaConfig?.whatsapp &&
                !empresaConfig?.email &&
                !empresaConfig?.instagram &&
                !empresaConfig?.facebook && (
                  <span className="text-gray-400">
                    Soluções e Outsourcing em Impressão Corporativa
                  </span>
                )}
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
