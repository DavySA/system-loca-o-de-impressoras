import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Users,
  Printer,
  ClipboardList,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ArrowRight,
  Clock,
  Calendar,
  Package,
  Boxes,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { clientesService } from '@/services/clientes'
import { equipamentosService } from '@/services/equipamentos'
import { ordensServicoService } from '@/services/ordensServico'
import { faturasService } from '@/services/faturas'
import { contratosService } from '@/services/contratos'
import { suprimentosService } from '@/services/suprimentos'
import { graficaService } from '@/services/grafica'
import { formatCurrency, formatCompactCurrency, formatDate, formatOSCode } from '@/lib/formatters'
import { useRealtime } from '@/hooks/use-realtime'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { OrdemServico, Contrato } from '@/types'

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [isLoading, setIsLoading] = useState(true)
  const [activeClientsCount, setActiveClientsCount] = useState(0)
  const [rentedEquipmentsCount, setRentedEquipmentsCount] = useState(0)
  const [openOsCount, setOpenOsCount] = useState(0)
  const [currentMonthRevenue, setCurrentMonthRevenue] = useState(0)
  const [recentOrders, setRecentOrders] = useState<OrdemServico[]>([])
  const [graficaStats, setGraficaStats] = useState<{
    totalVendasValor: number
    totalCustos: number
    lucroTotal: number
    quantidadeItensVendidos: number
  }>({
    totalVendasValor: 0,
    totalCustos: 0,
    lucroTotal: 0,
    quantidadeItensVendidos: 0,
  })
  const [suprimentosAbaixoMinimo, setSuprimentosAbaixoMinimo] = useState<number>(0)
  const [expiringContracts, setExpiringContracts] = useState<
    { contrato: Contrato; motivo: string }[]
  >([])
  const [alertasAutomaticos, setAlertasAutomaticos] = useState<
    {
      id: string
      tipo: 'contrato_vencendo' | 'fatura_a_vencer' | 'fatura_vencida' | 'excedente'
      titulo: string
      descricao: string
      link: string
      dataVencimento?: string
      gravidade: 'critica' | 'atencao' | 'info'
    }[]
  >([])
  const [monthlyRevenueData, setMonthlyRevenueData] = useState<{ label: string; value: number }[]>(
    [],
  )

  // Formatação de data por extenso
  const currentDateFormatted = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const loadDashboardData = async () => {
    try {
      setIsLoading(true)
      const [clientes, equipamentos, ordens, faturas, contratos, gStats, sups] = await Promise.all([
        clientesService.getAll(),
        equipamentosService.getAll(),
        ordensServicoService.getAll(),
        faturasService.getAll(),
        contratosService.getAll(),
        graficaService.getEstatisticasGerais().catch(() => ({
          totalVendasValor: 0,
          totalCustos: 0,
          lucroTotal: 0,
          quantidadeItensVendidos: 0,
          vendasRecentes: [],
        })),
        suprimentosService.getAll().catch(() => []),
      ])

      setGraficaStats(gStats)
      const abaixoMin = sups.filter(
        (s) => s.estoque_minimo !== undefined && s.quantidade <= s.estoque_minimo,
      ).length
      setSuprimentosAbaixoMinimo(abaixoMin)

      // 1. Clientes ativos
      const activeClients = clientes.filter((c) => c.status === 'ativo').length
      setActiveClientsCount(activeClients)

      // 2. Equipamentos locados
      const rented = equipamentos.filter((e) => e.status === 'locado').length
      setRentedEquipmentsCount(rented)

      // 3. Ordens de serviço em aberto (status != concluida)
      const openOrders = ordens.filter((o) => o.status !== 'concluida')
      setOpenOsCount(openOrders.length)

      // 4. Faturamento do mês corrente
      const now = new Date()
      const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      const monthInvoices = faturas.filter(
        (f) => f.mes_referencia === currentMonthStr && f.status !== 'cancelada',
      )
      const totalMonthRev = monthInvoices.reduce((acc, f) => acc + (f.valor_total || 0), 0)
      setCurrentMonthRevenue(totalMonthRev)

      // 5. Histórico 12 meses para gráfico
      const last12Months: { label: string; key: string; value: number }[] = []
      const monthNames = [
        'Jan',
        'Fev',
        'Mar',
        'Abr',
        'Mai',
        'Jun',
        'Jul',
        'Ago',
        'Set',
        'Out',
        'Nov',
        'Dez',
      ]
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        const label = `${monthNames[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`
        last12Months.push({ label, key, value: 0 })
      }

      for (const item of last12Months) {
        const matchingFaturas = faturas.filter(
          (f) => f.mes_referencia === item.key && f.status !== 'cancelada',
        )
        const sum = matchingFaturas.reduce((acc, f) => acc + (f.valor_total || 0), 0)
        item.value = sum
      }
      setMonthlyRevenueData(last12Months.map((m) => ({ label: m.label, value: m.value })))

      // 6. Próximas O.S. (máx 5 abertas/agendadas)
      const sortedOrders = [...ordens]
        .filter((o) => o.status !== 'concluida')
        .sort((a, b) => {
          const dateA = a.data_agendada ? new Date(a.data_agendada).getTime() : 0
          const dateB = b.data_agendada ? new Date(b.data_agendada).getTime() : 0
          return dateA - dateB
        })
        .slice(0, 5)
      setRecentOrders(sortedOrders)

      // 7. Alertas Automáticos: Contratos vencendo (<= 30 dias), Faturas a vencer (<= 7 dias) e Faturas vencidas
      const listaAlertas: {
        id: string
        tipo: 'contrato_vencendo' | 'fatura_a_vencer' | 'fatura_vencida' | 'excedente'
        titulo: string
        descricao: string
        link: string
        dataVencimento?: string
        gravidade: 'critica' | 'atencao' | 'info'
      }[] = []

      const alertsContratos: { contrato: Contrato; motivo: string }[] = []
      const thirtyDaysFromNow = new Date()
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

      const sevenDaysFromNow = new Date()
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)

      // a) Contratos vencendo em <= 30 dias
      for (const c of contratos) {
        if (c.status === 'ativo' && c.data_fim) {
          const endDate = new Date(c.data_fim)
          if (endDate <= thirtyDaysFromNow && endDate >= now) {
            const diffDays = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 3600 * 24))
            alertsContratos.push({
              contrato: c,
              motivo: `Contrato vence em ${diffDays} dias (${formatDate(c.data_fim)}).`,
            })
            listaAlertas.push({
              id: `contrato-${c.id}`,
              tipo: 'contrato_vencendo',
              titulo: `Contrato Vencendo (${diffDays} dias)`,
              descricao: `Cliente: ${c.expand?.cliente_id?.nome_razao_social || 'Cliente'} — Vencimento: ${formatDate(c.data_fim)}`,
              link: `/clientes/${c.cliente_id}`,
              dataVencimento: c.data_fim,
              gravidade: diffDays <= 7 ? 'critica' : 'atencao',
            })
          }
        }
      }

      // b) Faturas Vencidas e Faturas a Vencer (<= 7 dias)
      for (const f of faturas) {
        if (f.status === 'paga' || f.status === 'cancelada') continue

        const cli = clientes.find((c) => c.id === f.cliente_id)
        // Data de vencimento: usar f.data_vencimento ou dia 10 do mês seguinte à criação/referência
        let dtVenc: Date
        if (f.data_vencimento) {
          dtVenc = new Date(f.data_vencimento)
        } else if (f.mes_referencia) {
          const [anoStr, mesStr] = f.mes_referencia.split('-')
          const anoRef = parseInt(anoStr, 10)
          const mesRef = parseInt(mesStr, 10)
          // Vencimento padrão: dia 10 do mês seguinte
          dtVenc = new Date(anoRef, mesRef, 10)
        } else {
          dtVenc = new Date(new Date(f.created).getTime() + 10 * 24 * 3600 * 1000)
        }

        const diffDias = Math.ceil((dtVenc.getTime() - now.getTime()) / (1000 * 3600 * 24))

        if (f.status === 'vencida' || dtVenc < now) {
          // Fatura vencida
          const diasAtraso = Math.max(1, Math.abs(diffDias))
          listaAlertas.push({
            id: `fatura-vencida-${f.id}`,
            tipo: 'fatura_vencida',
            titulo: 'Fatura Vencida',
            descricao: `${cli?.nome_razao_social || 'Cliente'} — ${formatCurrency(f.valor_total)} (${diasAtraso} dias em atraso)`,
            link: '/faturamento',
            dataVencimento: dtVenc.toISOString(),
            gravidade: 'critica',
          })
        } else if (diffDias <= 7 && diffDias >= 0) {
          // Fatura a vencer em até 7 dias
          listaAlertas.push({
            id: `fatura-avencer-${f.id}`,
            tipo: 'fatura_a_vencer',
            titulo: `Fatura a Vencer (${diffDias === 0 ? 'Hoje' : `em ${diffDias} dias`})`,
            descricao: `${cli?.nome_razao_social || 'Cliente'} — ${formatCurrency(f.valor_total)} (Venc: ${formatDate(dtVenc.toISOString())})`,
            link: '/faturamento',
            dataVencimento: dtVenc.toISOString(),
            gravidade: 'atencao',
          })
        }
      }

      // c) Excedentes no mês
      for (const f of faturas) {
        if (f.paginas_excedentes > 0 && f.mes_referencia === currentMonthStr) {
          const c = contratos.find((ct) => ct.id === f.contrato_id)
          if (c) {
            alertsContratos.push({
              contrato: c,
              motivo: `Páginas excedentes atingidas no mês: +${f.paginas_excedentes} págs gerando ${formatCurrency(f.valor_excedente)}.`,
            })
          }
        }
      }

      setExpiringContracts(alertsContratos)
      setAlertasAutomaticos(listaAlertas)
    } catch (e) {
      console.error('Erro ao carregar dados do dashboard:', e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  // Realtime updates
  useRealtime('clientes', () => loadDashboardData())
  useRealtime('equipamentos', () => loadDashboardData())
  useRealtime('ordens_servico', () => loadDashboardData())
  useRealtime('faturas', () => loadDashboardData())
  useRealtime('contratos', () => loadDashboardData())
  useRealtime('grafica_vendas', () => loadDashboardData())
  useRealtime('grafica_caixas', () => loadDashboardData())
  useRealtime('suprimentos', () => loadDashboardData())

  // Max valor do gráfico para escala
  const maxRevenue = Math.max(...monthlyRevenueData.map((d) => d.value), 2000)

  return (
    <div className="space-y-6">
      {/* Top Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Bem-vindo(a), {user?.name || 'Administrador'}
          </h1>
          <p className="text-sm text-gray-500 capitalize flex items-center gap-1.5 mt-0.5">
            <Calendar className="w-4 h-4 text-gray-400" />
            {currentDateFormatted}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => navigate('/ordens-de-servico')}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
          >
            + Nova Ordem de Serviço
          </Button>
          <Button
            onClick={() => navigate('/faturamento')}
            size="sm"
            variant="outline"
            className="text-gray-700"
          >
            Faturamento
          </Button>
        </div>
      </div>

      {/* Banner de Controle de Insumos Vendidos & Lucro (Gráfica e Suprimentos) */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-xl p-5 text-white shadow-sm border border-blue-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/20 text-blue-200 border border-blue-400/30">
                Módulo Gráfica Rápida & Insumos
              </span>
              {suprimentosAbaixoMinimo > 0 && (
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-400" /> {suprimentosAbaixoMinimo}{' '}
                  insumo(s) em nível crítico
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Desempenho Comercial de Insumos & Serviços
            </h2>
            <p className="text-xs text-blue-200">
              Vendas no balcão da gráfica, cópias, adesivos, papéis e margem de lucro apurada (custo
              x venda)
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 border-t md:border-t-0 md:border-l border-white/10 pt-3 md:pt-0 md:pl-6">
            <div>
              <p className="text-[11px] font-medium text-blue-300 uppercase tracking-wider">
                Insumos Vendidos
              </p>
              <p className="text-2xl font-bold text-white font-mono mt-0.5">
                {graficaStats.quantidadeItensVendidos.toLocaleString('pt-BR')} un.
              </p>
              <span className="text-[10px] text-blue-300">Papéis e serviços</span>
            </div>

            <div>
              <p className="text-[11px] font-medium text-blue-300 uppercase tracking-wider">
                Faturado Insumos
              </p>
              <p className="text-2xl font-bold text-white font-mono mt-0.5">
                {formatCurrency(graficaStats.totalVendasValor)}
              </p>
              <span className="text-[10px] text-blue-300">Total recebido</span>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <p className="text-[11px] font-medium text-emerald-300 uppercase tracking-wider">
                Lucro Líquido
              </p>
              <p className="text-2xl font-bold text-emerald-400 font-mono mt-0.5">
                {formatCurrency(graficaStats.lucroTotal)}
              </p>
              <span className="text-[10px] text-emerald-300">
                {graficaStats.totalVendasValor > 0
                  ? `Margem: ${((graficaStats.lucroTotal / graficaStats.totalVendasValor) * 100).toFixed(1)}%`
                  : 'Margem estimada'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards (4 em linha desktop / empilhados mobile) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Clientes Ativos */}
        <div
          onClick={() => navigate('/clientes')}
          className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Clientes Ativos
            </span>
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-gray-900">{activeClientsCount}</span>
            <span className="inline-flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              <TrendingUp className="w-3 h-3 mr-1" />
              +12% vs mês ant.
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-2">Empresas e pessoas atendidas</p>
        </div>

        {/* KPI 2: Equipamentos Locados */}
        <div
          onClick={() => navigate('/equipamentos')}
          className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Equipamentos Locados
            </span>
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Printer className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-gray-900">{rentedEquipmentsCount}</span>
            <span className="inline-flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              <TrendingUp className="w-3 h-3 mr-1" />
              +5% vs mês ant.
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-2">Parque em operação nos clientes</p>
        </div>

        {/* KPI 3: Ordens em Aberto */}
        <div
          onClick={() => navigate('/ordens-de-servico')}
          className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Ordens em Aberto
            </span>
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <ClipboardList className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-gray-900">{openOsCount}</span>
            <span className="inline-flex items-center text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
              Pendente
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-2">Atendimentos aguardando conclusão</p>
        </div>

        {/* KPI 4: Faturamento do Mês */}
        <div
          onClick={() => navigate('/faturamento')}
          className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Faturamento do Mês
            </span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-gray-900">
              {formatCurrency(currentMonthRevenue)}
            </span>
            <span className="inline-flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              <TrendingUp className="w-3 h-3 mr-1" />
              +8.4%
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-2">Locação fixa + páginas excedentes</p>
        </div>
      </div>

      {/* Grid: Gráfico de Faturamento (12 meses) + Alertas de Contrato */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico 12 meses */}
        <Card className="lg:col-span-2 border border-gray-200 shadow-xs">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-gray-900">
                Faturamento dos Últimos 12 Meses
              </CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">
                Total faturado por mês (Aluguel base + Franquia excedente de impressão)
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                BRL (R$)
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {/* Visual Bar Chart */}
            <div className="h-64 pt-6 flex items-end gap-2 sm:gap-3 border-b border-gray-200 px-2 pb-2">
              {monthlyRevenueData.map((item, idx) => {
                const heightPercent =
                  maxRevenue > 0 ? Math.max((item.value / maxRevenue) * 100, 4) : 4
                return (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col items-center h-full justify-end group relative"
                  >
                    {/* Tooltip */}
                    <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-[11px] font-medium py-1 px-2 rounded pointer-events-none whitespace-nowrap z-10 shadow-lg">
                      {item.label}: {formatCurrency(item.value)}
                    </div>
                    {/* Bar */}
                    <div
                      className="w-full max-w-[28px] rounded-t-sm transition-all duration-600 ease-out bg-gradient-to-t from-blue-600 to-indigo-500 hover:brightness-110"
                      style={{ height: `${heightPercent}%` }}
                    />
                    <span className="text-[10px] text-gray-500 mt-2 truncate w-full text-center">
                      {item.label.split('/')[0]}
                    </span>
                  </div>
                )
              })}
            </div>
            <div className="flex items-center justify-between pt-3 text-xs text-gray-500">
              <span>Eixo base: R$ 0,00</span>
              <span>Teto projetado: {formatCompactCurrency(maxRevenue)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Painel Central de Alertas Automáticos (Contratos & Faturas) */}
        <Card className="border border-gray-200 shadow-xs flex flex-col">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Alertas Automáticos
              </CardTitle>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Contratos vencendo (≤30 dias), faturas a vencer (≤7 dias) e em atraso
              </p>
            </div>
            {alertasAutomaticos.length > 0 && (
              <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                {alertasAutomaticos.length} pendentes
              </span>
            )}
          </CardHeader>
          <CardContent className="space-y-2.5 max-h-[340px] overflow-y-auto flex-1">
            {alertasAutomaticos.length === 0 ? (
              <div className="p-6 rounded-lg bg-emerald-50/50 border border-emerald-100 text-center text-xs text-emerald-800">
                <p className="font-semibold">Nenhuma pendência crítica!</p>
                <p className="text-[11px] text-emerald-600 mt-1">
                  Todos os contratos estão vigentes e as faturas estão em dia.
                </p>
              </div>
            ) : (
              alertasAutomaticos.map((alerta) => (
                <div
                  key={alerta.id}
                  className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 transition-all ${
                    alerta.gravidade === 'critica'
                      ? 'border-red-200 bg-red-50/80 text-red-900'
                      : 'border-amber-200 bg-amber-50/80 text-amber-900'
                  }`}
                >
                  <AlertTriangle
                    className={`w-4 h-4 shrink-0 mt-0.5 ${
                      alerta.gravidade === 'critica' ? 'text-red-600' : 'text-amber-600'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-gray-900 leading-tight truncate">
                        {alerta.titulo}
                      </p>
                      <span
                        className={`text-[9.5px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          alerta.gravidade === 'critica'
                            ? 'bg-red-200 text-red-900'
                            : 'bg-amber-200 text-amber-900'
                        }`}
                      >
                        {alerta.gravidade === 'critica' ? 'Urgente' : 'Atenção'}
                      </span>
                    </div>
                    <p className="text-gray-700 mt-1 leading-snug">{alerta.descricao}</p>
                    <div className="mt-2">
                      <Link
                        to={alerta.link}
                        className="text-[11px] font-semibold text-blue-700 hover:underline inline-flex items-center gap-1"
                      >
                        Ver detalhes <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lista: Próximas Ordens de Serviço */}
      <Card className="border border-gray-200 shadow-xs">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-gray-900">
              Próximas Ordens de Serviço Agendadas
            </CardTitle>
            <p className="text-xs text-gray-500 mt-0.5">
              Atendimentos técnicos e manutenções prioritárias
            </p>
          </div>
          <Link
            to="/ordens-de-servico"
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            Ver todas <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">
              Nenhuma ordem de serviço pendente no momento.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F9FAFB] text-gray-600 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="py-2.5 px-3">Código</th>
                    <th className="py-2.5 px-3">Cliente</th>
                    <th className="py-2.5 px-3">Equipamento</th>
                    <th className="py-2.5 px-3">Serviço Solicitado</th>
                    <th className="py-2.5 px-3">Data Agendada</th>
                    <th className="py-2.5 px-3">Prioridade</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentOrders.map((os) => {
                    const statusBadgeMap: Record<string, { label: string; color: string }> = {
                      aberta: {
                        label: 'Aberta',
                        color: 'bg-blue-50 text-blue-700 border-blue-200',
                      },
                      em_andamento: {
                        label: 'Em Andamento',
                        color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                      },
                      aguardando_peca: {
                        label: 'Aguardando Peça',
                        color: 'bg-amber-50 text-amber-700 border-amber-200',
                      },
                      concluida: {
                        label: 'Concluída',
                        color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                      },
                    }

                    const prioMap: Record<string, { label: string; color: string }> = {
                      baixa: { label: 'Baixa', color: 'bg-gray-100 text-gray-700' },
                      media: { label: 'Média', color: 'bg-amber-100 text-amber-800' },
                      alta: { label: 'Alta', color: 'bg-red-100 text-red-800' },
                    }

                    const st = statusBadgeMap[os.status] || {
                      label: os.status,
                      color: 'bg-gray-100 text-gray-700 border-gray-200',
                    }
                    const pr = prioMap[os.prioridade] || {
                      label: os.prioridade,
                      color: 'bg-gray-100 text-gray-700',
                    }

                    return (
                      <tr
                        key={os.id}
                        onClick={() => navigate(`/ordens-de-servico/${os.id}`)}
                        className="hover:bg-gray-50/80 cursor-pointer transition-colors"
                      >
                        <td className="py-2.5 px-3 font-semibold text-blue-600">
                          {formatOSCode(os.id)}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-gray-900">
                          {os.expand?.cliente_id?.nome_razao_social || 'Cliente'}
                        </td>
                        <td className="py-2.5 px-3 text-gray-600">
                          {os.expand?.equipamento_id?.modelo || 'Equipamento'}
                        </td>
                        <td className="py-2.5 px-3 text-gray-600">
                          {os.expand?.servico_id?.nome || os.descricao_problema}
                        </td>
                        <td className="py-2.5 px-3 text-gray-600">
                          {os.data_agendada ? formatDate(os.data_agendada) : 'A definir'}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-medium ${pr.color}`}
                          >
                            {pr.label}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-medium border ${st.color}`}
                          >
                            {st.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
