import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Receipt,
  ClipboardList,
  AlertCircle,
  Clock,
  CheckCircle2,
  Calendar,
  ArrowRight,
  Plus,
  FileText,
  Printer,
  DollarSign,
  AlertTriangle,
  Building,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { faturasService } from '@/services/faturas'
import { ordensServicoService } from '@/services/ordensServico'
import { contratosService } from '@/services/contratos'
import { formatCurrency, formatDate, formatMonthYear, formatOSCode } from '@/lib/formatters'
import { useRealtime } from '@/hooks/use-realtime'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Fatura, OrdemServico, Contrato } from '@/types'

export default function PortalCliente() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const clienteId = user?.cliente_id

  const [isLoading, setIsLoading] = useState(true)
  const [faturas, setFaturas] = useState<Fatura[]>([])
  const [ordens, setOrdens] = useState<OrdemServico[]>([])
  const [contratos, setContratos] = useState<Contrato[]>([])

  const loadDadosCliente = async () => {
    if (!clienteId) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      const [fatList, osList, contList] = await Promise.all([
        faturasService.getAll(`cliente_id = "${clienteId}"`),
        ordensServicoService.getAll(`cliente_id = "${clienteId}"`),
        contratosService.getAll(`cliente_id = "${clienteId}" && status = "ativo"`),
      ])
      setFaturas(fatList)
      setOrdens(osList)
      setContratos(contList)
    } catch (e) {
      console.error('Erro ao carregar dados do portal do cliente:', e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadDadosCliente()
  }, [clienteId])

  useRealtime('faturas', () => loadDadosCliente())
  useRealtime('ordens_servico', () => loadDadosCliente())
  useRealtime('contratos', () => loadDadosCliente())

  // Cálculos de Faturas
  const now = new Date()
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  // Total do mês
  const faturasMesAtual = faturas.filter(
    (f) => f.mes_referencia === currentMonthStr && f.status !== 'cancelada',
  )
  const totalMes = faturasMesAtual.reduce((acc, f) => acc + (f.valor_total || 0), 0)

  // Faturas em aberto/pendentes (geradas e vencidas)
  const faturasAbertas = faturas.filter((f) => f.status === 'gerada' || f.status === 'vencida')
  const totalAbertas = faturasAbertas.reduce((acc, f) => acc + (f.valor_total || 0), 0)

  // Faturas vencidas
  const faturasVencidas = faturas.filter((f) => {
    if (f.status === 'paga' || f.status === 'cancelada') return false
    if (f.status === 'vencida') return true
    if (f.data_vencimento && new Date(f.data_vencimento) < now) return true
    return false
  })
  const totalVencidas = faturasVencidas.reduce((acc, f) => acc + (f.valor_total || 0), 0)

  // Próxima fatura a vencer
  const faturasNaoPagasComData = faturas
    .filter((f) => f.status === 'gerada')
    .sort((a, b) => {
      const dateA = a.data_vencimento ? new Date(a.data_vencimento).getTime() : 0
      const dateB = b.data_vencimento ? new Date(b.data_vencimento).getTime() : 0
      return dateA - dateB
    })
  const proximaFatura = faturasNaoPagasComData[0] || null

  // Cálculos de Ordens de Serviço
  const osAbertas = ordens.filter((o) => o.status !== 'concluida')
  const osConcluidasRecentes = ordens.filter((o) => o.status === 'concluida').slice(0, 5)

  const ultimasFaturas = faturas.slice(0, 5)
  const ultimasOS = ordens.slice(0, 5)

  const contratoPrincipal = contratos[0] || null

  const getStatusBadgeFatura = (status: Fatura['status']) => {
    switch (status) {
      case 'paga':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Paga
          </span>
        )
      case 'vencida':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            Vencida
          </span>
        )
      case 'cancelada':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
            Cancelada
          </span>
        )
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            Em Aberto
          </span>
        )
    }
  }

  const getStatusBadgeOS = (status: OrdemServico['status']) => {
    switch (status) {
      case 'concluida':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Concluída
          </span>
        )
      case 'em_andamento':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            Em Andamento
          </span>
        )
      case 'aguardando_peca':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Aguardando Peça
          </span>
        )
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            Aberta
          </span>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Portal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-200">
        <div>
          <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 uppercase tracking-wider">
            Portal do Cliente
          </span>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight mt-1">
            Olá, {user?.name || 'Cliente'}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-gray-400" />
            Acompanhe suas faturas de locação, equipamentos contratados e chamados técnicos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {contratoPrincipal && (
            <Button
              onClick={() => navigate(`/clientes/${clienteId}`)}
              variant="outline"
              size="sm"
              className="text-gray-700 flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4 text-blue-600" /> Meu Contrato
            </Button>
          )}
          <Button
            onClick={() => navigate('/ordens-de-servico')}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-1.5 font-medium"
          >
            <Plus className="w-4 h-4" /> Abrir Chamado (O.S.)
          </Button>
        </div>
      </div>

      {/* Alerta de inadimplência caso haja faturas vencidas */}
      {faturasVencidas.length > 0 && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-900 flex items-start gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-bold text-sm">Atenção: Você possui fatura(s) vencida(s)</h3>
            <p className="text-xs text-red-700 mt-0.5">
              Existem {faturasVencidas.length} fatura(s) em atraso somando{' '}
              {formatCurrency(totalVencidas)}. Regularize seu pagamento para manter os chamados e
              atendimento técnico liberados sem bloqueios.
            </p>
            <div className="mt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate('/faturamento')}
                className="text-xs h-7 border-red-300 text-red-800 hover:bg-red-100"
              >
                Visualizar Faturas em Atraso
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 4 Cards de Resumo de Faturas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total do Mês */}
        <div
          onClick={() => navigate('/faturamento')}
          className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Total do Mês Atual
            </span>
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-gray-900 font-mono">
              {formatCurrency(totalMes)}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Referência: {formatMonthYear(currentMonthStr)}
          </p>
        </div>

        {/* Card 2: Faturas em Aberto */}
        <div
          onClick={() => navigate('/faturamento')}
          className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Faturas em Aberto
            </span>
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-amber-700 font-mono">
              {formatCurrency(totalAbertas)}
            </span>
            <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full">
              {faturasAbertas.length} fatura(s)
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">Aguardando quitação</p>
        </div>

        {/* Card 3: Faturas Vencidas */}
        <div
          onClick={() => navigate('/faturamento')}
          className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Faturas Vencidas
            </span>
            <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-colors">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-red-600 font-mono">
              {formatCurrency(totalVencidas)}
            </span>
            <span className="text-xs font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
              {faturasVencidas.length} em atraso
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">Exige quitação prioritária</p>
        </div>

        {/* Card 4: Próxima Fatura */}
        <div
          onClick={() => navigate('/faturamento')}
          className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Próximo Vencimento
            </span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            {proximaFatura ? (
              <>
                <span className="text-xl font-bold text-gray-900 font-mono">
                  {formatCurrency(proximaFatura.valor_total)}
                </span>
                <p className="text-xs text-emerald-700 font-medium mt-1">
                  Vence em:{' '}
                  {proximaFatura.data_vencimento
                    ? formatDate(proximaFatura.data_vencimento)
                    : formatMonthYear(proximaFatura.mes_referencia)}
                </p>
              </>
            ) : (
              <>
                <span className="text-lg font-bold text-gray-400">Em dia</span>
                <p className="text-xs text-gray-400 mt-1">Nenhum vencimento pendente</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Grid: Últimas Faturas e Últimas O.S. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Painel de Faturas */}
        <Card className="border border-gray-200 shadow-xs">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-blue-600" /> Minhas Últimas Faturas
              </CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">
                Histórico recente de cobranças e faturamentos emitidos
              </p>
            </div>
            <Link
              to="/faturamento"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              Ver todas <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            {ultimasFaturas.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500">
                Nenhuma fatura encontrada para sua conta.
              </div>
            ) : (
              <div className="divide-y divide-gray-100 text-xs">
                {ultimasFaturas.map((f) => (
                  <div
                    key={f.id}
                    onClick={() => navigate('/faturamento')}
                    className="py-3 flex items-center justify-between hover:bg-gray-50 cursor-pointer rounded-lg px-2 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 text-sm">
                          {formatMonthYear(f.mes_referencia)}
                        </span>
                        {getStatusBadgeFatura(f.status)}
                      </div>
                      <p className="text-gray-500 text-[11px] mt-0.5">
                        Emissão: {formatDate(f.created)} •{' '}
                        {f.paginas_consumidas.toLocaleString('pt-BR')} págs
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-sm text-gray-900 font-mono">
                        {formatCurrency(f.valor_total)}
                      </span>
                      <span className="block text-[10px] text-blue-600 hover:underline">
                        Visualizar fatura
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Painel de Ordens de Serviço */}
        <Card className="border border-gray-200 shadow-xs">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-blue-600" /> Minhas Ordens de Serviço
              </CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">
                {osAbertas.length} chamado(s) em andamento • {osConcluidasRecentes.length}{' '}
                concluído(s)
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
            {ultimasOS.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500 space-y-2">
                <p>Nenhuma ordem de serviço registrada.</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate('/ordens-de-servico')}
                  className="text-xs"
                >
                  Abrir Primeiro Chamado
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 text-xs">
                {ultimasOS.map((os) => (
                  <div
                    key={os.id}
                    onClick={() => navigate(`/ordens-de-servico/${os.id}`)}
                    className="py-3 flex items-center justify-between hover:bg-gray-50 cursor-pointer rounded-lg px-2 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-blue-600 font-mono">
                          {formatOSCode(os.id)}
                        </span>
                        {getStatusBadgeOS(os.status)}
                      </div>
                      <p className="font-medium text-gray-800 mt-1 line-clamp-1">
                        {os.descricao_problema || 'Atendimento técnico'}
                      </p>
                      <p className="text-gray-400 text-[11px] mt-0.5">
                        {os.expand?.equipamento_id
                          ? `${os.expand.equipamento_id.marca} ${os.expand.equipamento_id.modelo}`
                          : 'Equipamento'}{' '}
                        • {os.created ? formatDate(os.created) : '-'}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400 shrink-0 ml-2" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
