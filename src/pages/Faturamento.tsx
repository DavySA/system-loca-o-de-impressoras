import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import {
  Receipt,
  Plus,
  DollarSign,
  FileSpreadsheet,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Printer,
  Calendar,
  AlertCircle,
  Calculator,
} from 'lucide-react'
import { faturasService } from '@/services/faturas'
import { clientesService } from '@/services/clientes'
import { contratosService } from '@/services/contratos'
import { formatCurrency, formatMonthYear, formatDate } from '@/lib/formatters'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'
import { configuracoesService } from '@/services/configuracoes'
import { equipamentosService } from '@/services/equipamentos'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Fatura, Cliente, Contrato, ConfiguracoesEmpresa, Equipamento } from '@/types'

export default function Faturamento() {
  const { user } = useAuth()
  const { toast } = useToast()
  const location = useLocation()

  const isClienteUser = user?.role === 'cliente'
  const clienteIdVinculado = user?.cliente_id

  const [faturas, setFaturas] = useState<Fatura[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([])
  const [configEmpresa, setConfigEmpresa] = useState<ConfiguracoesEmpresa | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // KPIs
  const [kpiFaturamentoMes, setKpiFaturamentoMes] = useState(0)
  const [kpiPaginasExcedentes, setKpiPaginasExcedentes] = useState(0)
  const [kpiFaturasPendentes, setKpiFaturasPendentes] = useState(0)

  // Modal Gerar Fatura com Leitura de Contadores e Subtração Automática
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedClienteId, setSelectedClienteId] = useState('')
  const [clienteContratos, setClienteContratos] = useState<Contrato[]>([])
  const [selectedContratoId, setSelectedContratoId] = useState('')
  const [mesReferencia, setMesReferencia] = useState('')

  // Leituras por equipamento
  const [leituraAnteriorMono, setLeituraAnteriorMono] = useState(0)
  const [leituraAtualMono, setLeituraAtualMono] = useState(0)
  const [leituraAnteriorColor, setLeituraAnteriorColor] = useState(0)
  const [leituraAtualColor, setLeituraAtualColor] = useState(0)
  const [descontoEquipamento, setDescontoEquipamento] = useState(0)
  const [acrescimoServicos, setAcrescimoServicos] = useState(0)
  const [observacoesFatura, setObservacoesFatura] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Modal Detalhes / Impressão
  const [selectedFatura, setSelectedFatura] = useState<Fatura | null>(null)
  const [isDetalhesOpen, setIsDetalhesOpen] = useState(false)
  const loadData = async () => {
    try {
      setIsLoading(true)
      let fatFilter = ''
      if (isClienteUser && clienteIdVinculado) {
        fatFilter = `cliente_id = "${clienteIdVinculado}"`
      }

      const [fatList, clList, contList, eqList, cfg] = await Promise.all([
        faturasService.getAll(fatFilter),
        clientesService.getAll('status = "ativo"'),
        contratosService.getAll('status = "ativo"'),
        equipamentosService.getAll(),
        configuracoesService.get(),
      ])
      setFaturas(fatList)
      setClientes(clList)
      setContratos(contList)
      setEquipamentos(eqList)
      setConfigEmpresa(cfg)

      // Calcular KPIs
      const now = new Date()
      const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

      // Faturamento do mês
      const currentMonthFats = fatList.filter(
        (f) => f.mes_referencia === currentMonthStr && f.status !== 'cancelada',
      )
      const sumMonth = currentMonthFats.reduce((acc, f) => acc + (f.valor_total || 0), 0)
      setKpiFaturamentoMes(sumMonth)

      // Páginas excedentes no mês
      const sumExcedentes = currentMonthFats.reduce(
        (acc, f) => acc + (f.paginas_excedentes || 0),
        0,
      )
      setKpiPaginasExcedentes(sumExcedentes)

      // Faturas pendentes de pagamento (status = gerada ou vencida)
      const pendentes = fatList.filter((f) => f.status === 'gerada' || f.status === 'vencida')
      const sumPendentes = pendentes.reduce((acc, f) => acc + (f.valor_total || 0), 0)
      setKpiFaturasPendentes(sumPendentes)

      // Checar se veio com cliente pré-selecionado de outra rota
      const state = location.state as { preselectClienteId?: string } | null
      if (state?.preselectClienteId) {
        handleOpenCreate(state.preselectClienteId)
      }
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar dados de faturamento',
        description: 'Não foi possível carregar a listagem.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('faturas', () => loadData())
  useRealtime('contratos', () => loadData())

  const handleOpenCreate = (preClienteId?: string) => {
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    setMesReferencia(currentMonth)

    const targetClientId = preClienteId || clientes[0]?.id || ''
    setSelectedClienteId(targetClientId)

    const conts = contratos.filter((c) => c.cliente_id === targetClientId)
    setClienteContratos(conts)
    if (conts.length > 0) {
      handleSelectContrato(conts[0], conts)
    } else {
      setSelectedContratoId('')
      resetLeituras()
    }

    setIsModalOpen(true)
  }

  const resetLeituras = () => {
    setLeituraAnteriorMono(0)
    setLeituraAtualMono(0)
    setLeituraAnteriorColor(0)
    setLeituraAtualColor(0)
    setDescontoEquipamento(0)
    setAcrescimoServicos(0)
    setObservacoesFatura('')
  }

  const handleSelectContrato = (ct: Contrato, currentConts?: Contrato[]) => {
    setSelectedContratoId(ct.id)
    // Obter equipamento vinculado para pegar os contadores anteriores
    const eq = equipamentos.find((e) => e.id === ct.equipamento_id) || ct.expand?.equipamento_id
    const prevMono = eq?.contador_monocromatico || 0
    const prevColor = eq?.contador_colorido || 0

    setLeituraAnteriorMono(prevMono)
    setLeituraAtualMono(prevMono + (ct.paginas_contratadas_mensais || 0))
    setLeituraAnteriorColor(prevColor)
    setLeituraAtualColor(prevColor)
    setDescontoEquipamento(0)
    setAcrescimoServicos(0)
  }

  // Quando o cliente selecionado muda
  const handleClienteChange = (cId: string) => {
    setSelectedClienteId(cId)
    const conts = contratos.filter((c) => c.cliente_id === cId)
    setClienteContratos(conts)
    if (conts.length > 0) {
      handleSelectContrato(conts[0], conts)
    } else {
      setSelectedContratoId('')
      resetLeituras()
    }
  }

  // Contrato atualmente selecionado no modal
  const activeContrato = clienteContratos.find((c) => c.id === selectedContratoId)
  const activeEquipamento =
    equipamentos.find((e) => e.id === activeContrato?.equipamento_id) ||
    activeContrato?.expand?.equipamento_id

  // Subtração automática do atual pelo anterior:
  const consumoMono = Math.max(0, leituraAtualMono - leituraAnteriorMono)
  const consumoColor = Math.max(0, leituraAtualColor - leituraAnteriorColor)
  const paginasConsumidas = consumoMono + consumoColor

  // Cálculos ao vivo da fatura
  const isApenasExcedentes = activeContrato?.modalidade === 'apenas_excedentes'
  const paginasContratadas = isApenasExcedentes
    ? 0
    : activeContrato?.paginas_contratadas_mensais || 0
  const valorBaseAluguel = activeContrato?.valor_mensal || 0
  const valorPorPaginaExcedente = activeContrato?.valor_pagina_excedente || 0

  const paginasExcedentesCalculadas = isApenasExcedentes
    ? paginasConsumidas
    : Math.max(0, paginasConsumidas - paginasContratadas)

  const valorExcedenteCalculado = paginasExcedentesCalculadas * valorPorPaginaExcedente
  const valorScanner = activeContrato?.valor_scanner || 0

  // Total geral a pagar com desconto e acréscimos por equipamento
  const subtotal =
    valorBaseAluguel + valorExcedenteCalculado + valorScanner + Number(acrescimoServicos)
  const valorTotalCalculado = Math.max(0, subtotal - Number(descontoEquipamento))

  const handleGerarFatura = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClienteId || !selectedContratoId) {
      toast({
        variant: 'destructive',
        title: 'Contrato não selecionado',
        description: 'Selecione um cliente e um contrato ativo para gerar a fatura.',
      })
      return
    }

    setIsSubmitting(true)
    try {
      await faturasService.create({
        cliente_id: selectedClienteId,
        contrato_id: selectedContratoId,
        mes_referencia: mesReferencia,
        paginas_contratadas: paginasContratadas,
        paginas_consumidas: Number(paginasConsumidas),
        paginas_excedentes: paginasExcedentesCalculadas,
        valor_base: valorBaseAluguel + valorScanner,
        valor_excedente: valorExcedenteCalculado,
        valor_total: valorTotalCalculado,
        leitura_anterior_mono: Number(leituraAnteriorMono),
        leitura_atual_mono: Number(leituraAtualMono),
        leitura_anterior_color: Number(leituraAnteriorColor),
        leitura_atual_color: Number(leituraAtualColor),
        desconto: Number(descontoEquipamento),
        acrescimo_servicos: Number(acrescimoServicos),
        observacoes: observacoesFatura,
        status: 'gerada',
      })

      // Atualizar contador do equipamento para as leituras mais recentes
      if (activeEquipamento) {
        try {
          await equipamentosService.update(activeEquipamento.id, {
            contador_monocromatico: Number(leituraAtualMono),
            contador_colorido: Number(leituraAtualColor),
          })
        } catch (e) {
          console.warn('Erro ao atualizar contador no equipamento:', e)
        }
      }

      toast({
        title: 'Fatura gerada com sucesso!',
        description: `Fatura de ${formatCurrency(valorTotalCalculado)} gerada e contador do equipamento atualizado.`,
      })
      setIsModalOpen(false)
      loadData()
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao gerar fatura',
        description: 'Não foi possível gravar o faturamento.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMarcarPaga = async (f: Fatura, e?: React.MouseEvent) => {
    e?.stopPropagation()
    try {
      await faturasService.marcarComoPaga(f.id)
      toast({
        title: 'Fatura quitada!',
        description: 'Status atualizado para "Paga".',
      })
      loadData()
      if (selectedFatura && selectedFatura.id === f.id) {
        setSelectedFatura({ ...selectedFatura, status: 'paga' })
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar fatura',
      })
    }
  }

  const handleCancelar = async (f: Fatura, e?: React.MouseEvent) => {
    e?.stopPropagation()
    try {
      await faturasService.cancelarFatura(f.id)
      toast({
        title: 'Fatura cancelada',
        description: 'Status alterado para "Cancelada".',
      })
      loadData()
      if (selectedFatura && selectedFatura.id === f.id) {
        setSelectedFatura({ ...selectedFatura, status: 'cancelada' })
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Erro ao cancelar fatura',
      })
    }
  }

  const handleOpenVisualizar = (f: Fatura) => {
    setSelectedFatura(f)
    setIsDetalhesOpen(true)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Faturamento</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Gestão de leituras de contadores, franquias contratadas e emissão de cobranças
          </p>
        </div>
        {!isClienteUser && (
          <Button
            onClick={() => handleOpenCreate()}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Gerar Fatura
          </Button>
        )}
      </div>

      {/* 3 Cards de KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* KPI 1 */}
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Faturamento do Mês
            </span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-gray-900">
              {formatCurrency(kpiFaturamentoMes)}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">Aluguel fixo + excedentes apurados</p>
        </div>

        {/* KPI 2 */}
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Páginas Excedentes no Mês
            </span>
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-gray-900">
              +{kpiPaginasExcedentes.toLocaleString('pt-BR')} págs
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">Volume impresso além da franquia</p>
        </div>

        {/* KPI 3 */}
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Faturas Pendentes de Pagamento
            </span>
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-amber-700">
              {formatCurrency(kpiFaturasPendentes)}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">Faturas geradas ou vencidas em aberto</p>
        </div>
      </div>

      {/* Tabela de Faturas */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#F9FAFB] text-gray-600 font-semibold text-xs border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Mês Ref.</th>
                <th className="py-3 px-4">Contratadas</th>
                <th className="py-3 px-4">Consumidas</th>
                <th className="py-3 px-4">Excedentes</th>
                <th className="py-3 px-4">Valor Base</th>
                <th className="py-3 px-4">Valor Excedente</th>
                <th className="py-3 px-4 font-bold text-gray-900">Total</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-gray-500">
                    Carregando faturas...
                  </td>
                </tr>
              ) : faturas.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-gray-500">
                    Nenhuma fatura gerada no sistema.
                  </td>
                </tr>
              ) : (
                faturas.map((f) => (
                  <tr
                    key={f.id}
                    onClick={() => handleOpenVisualizar(f)}
                    className="hover:bg-gray-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4 font-semibold text-gray-900">
                      <Link
                        to={`/clientes/${f.cliente_id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="hover:text-blue-600"
                      >
                        {f.expand?.cliente_id?.nome_razao_social || 'Cliente'}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-gray-800">
                      {formatMonthYear(f.mes_referencia)}
                    </td>
                    <td className="py-3.5 px-4 text-gray-600">
                      {f.paginas_contratadas.toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3.5 px-4 text-gray-600">
                      {f.paginas_consumidas.toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3.5 px-4 text-gray-600 font-medium">
                      {f.paginas_excedentes > 0 ? (
                        <span className="text-amber-700 font-semibold">
                          +{f.paginas_excedentes.toLocaleString('pt-BR')}
                        </span>
                      ) : (
                        '0'
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-gray-600">{formatCurrency(f.valor_base)}</td>
                    <td className="py-3.5 px-4 text-gray-600">
                      {formatCurrency(f.valor_excedente)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-gray-900">
                      {formatCurrency(f.valor_total)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          f.status === 'paga'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : f.status === 'vencida'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : f.status === 'cancelada'
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {f.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenVisualizar(f)
                          }}
                          className="h-8 w-8 p-0 text-gray-500 hover:text-blue-600"
                          title="Visualizar fatura"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {f.status !== 'paga' && f.status !== 'cancelada' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleMarcarPaga(f, e)}
                            className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-800"
                            title="Marcar como Paga"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        )}
                        {f.status !== 'cancelada' && f.status !== 'paga' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleCancelar(f, e)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                            title="Cancelar Fatura"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Gerar Fatura com Cálculo ao Vivo e Leitura de Contadores */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-blue-600" /> Faturamento com Subtração Automática
              de Leituras
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleGerarFatura} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="fat-cli">Cliente</Label>
                <Select value={selectedClienteId} onValueChange={handleClienteChange}>
                  <SelectTrigger id="fat-cli">
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome_razao_social}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fat-mes">Mês de Referência (YYYY-MM)</Label>
                <Input
                  id="fat-mes"
                  type="month"
                  value={mesReferencia}
                  onChange={(e) => setMesReferencia(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fat-cont">Contrato / Equipamento</Label>
              <Select
                value={selectedContratoId}
                onValueChange={(val) => {
                  const ct = clienteContratos.find((c) => c.id === val)
                  if (ct) handleSelectContrato(ct)
                }}
              >
                <SelectTrigger id="fat-cont">
                  <SelectValue placeholder="Selecione o contrato/equipamento" />
                </SelectTrigger>
                <SelectContent>
                  {clienteContratos.length === 0 ? (
                    <SelectItem value="none" disabled>
                      Nenhum contrato ativo
                    </SelectItem>
                  ) : (
                    clienteContratos.map((ct) => {
                      const eq = equipamentos.find((e) => e.id === ct.equipamento_id)
                      return (
                        <SelectItem key={ct.id} value={ct.id}>
                          {ct.numero_contrato || 'Contrato'} — {eq?.marca} {eq?.modelo} (Pat:{' '}
                          {eq?.numero_patrimonio || 'S/Pat'})
                        </SelectItem>
                      )
                    })
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* SEÇÃO DE LEITURAS COM SUBTRAÇÃO AUTOMÁTICA */}
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                  1. Apuração de Contadores por Equipamento
                </span>
                <span className="text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-semibold">
                  Subtração Automática: Atual − Anterior
                </span>
              </div>

              {/* Leituras Monocromático */}
              <div className="p-3 bg-white rounded-lg border border-gray-200 space-y-2">
                <span className="text-xs font-semibold text-gray-900 block">
                  Contador Monocromático (P&B)
                </span>
                <div className="grid grid-cols-3 gap-3 text-xs items-center">
                  <div>
                    <Label className="text-gray-500 text-[11px]">Leitura Anterior</Label>
                    <Input
                      type="number"
                      value={leituraAnteriorMono}
                      onChange={(e) => setLeituraAnteriorMono(Number(e.target.value))}
                      className="h-8 font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-blue-900 font-semibold text-[11px]">
                      Leitura Atual Informada *
                    </Label>
                    <Input
                      type="number"
                      value={leituraAtualMono}
                      onChange={(e) => setLeituraAtualMono(Number(e.target.value))}
                      className="h-8 font-mono border-blue-400 font-bold"
                      required
                    />
                  </div>
                  <div className="bg-blue-50/70 p-2 rounded text-center border border-blue-100">
                    <span className="text-[10px] text-blue-700 block uppercase font-medium">
                      Consumo Mono
                    </span>
                    <span className="text-sm font-bold text-blue-900 font-mono">
                      {consumoMono.toLocaleString('pt-BR')} págs
                    </span>
                  </div>
                </div>
              </div>

              {/* Leituras Colorido */}
              <div className="p-3 bg-white rounded-lg border border-gray-200 space-y-2">
                <span className="text-xs font-semibold text-gray-900 block">
                  Contador Colorido (Color)
                </span>
                <div className="grid grid-cols-3 gap-3 text-xs items-center">
                  <div>
                    <Label className="text-gray-500 text-[11px]">Leitura Anterior</Label>
                    <Input
                      type="number"
                      value={leituraAnteriorColor}
                      onChange={(e) => setLeituraAnteriorColor(Number(e.target.value))}
                      className="h-8 font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-blue-900 font-semibold text-[11px]">
                      Leitura Atual Informada *
                    </Label>
                    <Input
                      type="number"
                      value={leituraAtualColor}
                      onChange={(e) => setLeituraAtualColor(Number(e.target.value))}
                      className="h-8 font-mono border-blue-400 font-bold"
                      required
                    />
                  </div>
                  <div className="bg-blue-50/70 p-2 rounded text-center border border-blue-100">
                    <span className="text-[10px] text-blue-700 block uppercase font-medium">
                      Consumo Color
                    </span>
                    <span className="text-sm font-bold text-blue-900 font-mono">
                      {consumoColor.toLocaleString('pt-BR')} págs
                    </span>
                  </div>
                </div>
              </div>

              {/* Total Consumido e Franquia */}
              <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                <div className="p-2.5 rounded-lg bg-gray-100 border border-gray-200">
                  <span className="text-[10px] text-gray-500 block uppercase font-medium">
                    Total Consumido no Período
                  </span>
                  <p className="text-base font-bold text-gray-900">
                    {paginasConsumidas.toLocaleString('pt-BR')} págs
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-gray-100 border border-gray-200">
                  <span className="text-[10px] text-gray-500 block uppercase font-medium">
                    Franquia Contratada
                  </span>
                  <p className="text-base font-bold text-gray-900">
                    {isApenasExcedentes
                      ? 'Sem franquia'
                      : `${paginasContratadas.toLocaleString('pt-BR')} págs`}
                  </p>
                </div>
              </div>
            </div>

            {/* DESCONTOS E ACRÉSCIMOS POR EQUIPAMENTO */}
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
              <span className="text-xs font-bold text-gray-800 uppercase tracking-wide block">
                2. Ajustes Financeiros por Equipamento
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <Label htmlFor="fat-desc" className="text-red-700 font-semibold">
                    Desconto no Equipamento (R$)
                  </Label>
                  <Input
                    id="fat-desc"
                    type="number"
                    step="0.01"
                    min={0}
                    value={descontoEquipamento}
                    onChange={(e) => setDescontoEquipamento(Number(e.target.value))}
                    placeholder="0,00"
                    className="h-9"
                  />
                  <span className="text-[10px] text-gray-400">
                    Abatimentos, horas paradas ou bonificação
                  </span>
                </div>

                <div>
                  <Label htmlFor="fat-acresc" className="text-emerald-700 font-semibold">
                    Serviço a Acrescentar (R$)
                  </Label>
                  <Input
                    id="fat-acresc"
                    type="number"
                    step="0.01"
                    min={0}
                    value={acrescimoServicos}
                    onChange={(e) => setAcrescimoServicos(Number(e.target.value))}
                    placeholder="0,00"
                    className="h-9"
                  />
                  <span className="text-[10px] text-gray-400">
                    Suprimentos avulsos, frete ou serviços extras
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <Label htmlFor="fat-obs" className="text-xs text-gray-600">
                  Observações na Fatura
                </Label>
                <Textarea
                  id="fat-obs"
                  rows={2}
                  placeholder="Detalhes adicionais da apuração de contadores..."
                  value={observacoesFatura}
                  onChange={(e) => setObservacoesFatura(e.target.value)}
                  className="text-xs bg-white"
                />
              </div>
            </div>

            {/* RESUMO / CONTABILIDADE GERAL A PAGAR */}
            <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200 space-y-2 text-xs">
              <span className="text-xs font-bold text-blue-950 uppercase tracking-wide block">
                3. Contabilidade Geral do Faturamento
              </span>
              <div className="flex items-center justify-between text-blue-900">
                <span>Valor Base da Locação:</span>
                <span className="font-semibold">{formatCurrency(valorBaseAluguel)}</span>
              </div>
              {valorScanner > 0 && (
                <div className="flex items-center justify-between text-blue-900">
                  <span>Valor Scanner Faturado:</span>
                  <span className="font-semibold">{formatCurrency(valorScanner)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-blue-900">
                <span>
                  Páginas Excedentes ({paginasExcedentesCalculadas.toLocaleString('pt-BR')} págs):
                </span>
                <span className="font-semibold text-amber-800">
                  +{formatCurrency(valorExcedenteCalculado)}
                </span>
              </div>
              {acrescimoServicos > 0 && (
                <div className="flex items-center justify-between text-emerald-800">
                  <span>Serviços / Adicionais:</span>
                  <span className="font-semibold">+{formatCurrency(acrescimoServicos)}</span>
                </div>
              )}
              {descontoEquipamento > 0 && (
                <div className="flex items-center justify-between text-red-700">
                  <span>Descontos Aplicados:</span>
                  <span className="font-semibold">−{formatCurrency(descontoEquipamento)}</span>
                </div>
              )}
              <div className="pt-2.5 border-t border-blue-200 flex items-center justify-between text-blue-950 font-bold text-base">
                <span>Total Geral a Ser Pago:</span>
                <span className="text-xl text-blue-700 font-mono">
                  {formatCurrency(valorTotalCalculado)}
                </span>
              </div>
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !selectedContratoId}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                {isSubmitting ? 'Gerando...' : 'Gravar Fatura e Atualizar Contador'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Detalhes / Impressão de Fatura */}
      <Dialog open={isDetalhesOpen} onOpenChange={setIsDetalhesOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedFatura && (
            <div className="space-y-6 pt-2">
              {/* CABEÇALHO PERSONALIZADO DA EMPRESA */}
              <div className="flex items-start justify-between border-b-2 border-gray-800 pb-4">
                <div className="flex items-center gap-3">
                  {configEmpresa?.logo && (
                    <img
                      src={configuracoesService.getLogoUrl(configEmpresa) || ''}
                      alt="Logo Empresa"
                      className="h-14 w-auto object-contain max-w-[150px]"
                    />
                  )}
                  <div>
                    <h2 className="text-lg font-bold uppercase text-gray-900">
                      {configEmpresa?.razao_social || 'PrintGest Soluções'}
                    </h2>
                    {configEmpresa?.nome_fantasia && (
                      <p className="text-xs text-gray-600">{configEmpresa.nome_fantasia}</p>
                    )}
                    <p className="text-[11px] text-gray-500">
                      CNPJ: {configEmpresa?.cnpj || '-'} • Tel: {configEmpresa?.telefone || '-'}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      {configEmpresa?.endereco || ''}{' '}
                      {configEmpresa?.cidade ? `• ${configEmpresa.cidade}/${configEmpresa.uf}` : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="border border-gray-900 px-3 py-1.5 rounded text-center">
                    <span className="block text-[10px] uppercase font-bold text-gray-600">
                      Fatura de Locação
                    </span>
                    <span className="text-base font-mono font-bold text-gray-900">
                      #{selectedFatura.id.slice(0, 8).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-500 block mt-1">
                    Mês Ref: <strong>{formatMonthYear(selectedFatura.mes_referencia)}</strong>
                  </span>
                  <span
                    className={`mt-1 inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      selectedFatura.status === 'paga'
                        ? 'bg-emerald-100 text-emerald-800'
                        : selectedFatura.status === 'vencida'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {selectedFatura.status}
                  </span>
                </div>
              </div>

              {/* Informações do Cliente */}
              <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-xs">
                <span className="text-gray-400 font-semibold uppercase block">
                  Dados do Cliente Sacado
                </span>
                <p className="text-sm font-bold text-gray-900 mt-0.5">
                  {selectedFatura.expand?.cliente_id?.nome_razao_social}
                </p>
                <div className="grid grid-cols-2 gap-2 text-gray-600 mt-1">
                  <p>CNPJ / CPF: {selectedFatura.expand?.cliente_id?.documento || '-'}</p>
                  <p>E-mail: {selectedFatura.expand?.cliente_id?.email || '-'}</p>
                  <p>
                    Endereço: {selectedFatura.expand?.cliente_id?.endereco || '-'}{' '}
                    {selectedFatura.expand?.cliente_id?.cidade
                      ? ` - ${selectedFatura.expand?.cliente_id?.cidade}/${selectedFatura.expand?.cliente_id?.uf}`
                      : ''}
                  </p>
                  <p>Emissão: {formatDate(selectedFatura.created)}</p>
                </div>
              </div>

              {/* Quebra de Cálculo */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F9FAFB] text-gray-600 font-semibold border-b border-gray-200">
                    <tr>
                      <th className="py-2.5 px-3">Item / Descrição</th>
                      <th className="py-2.5 px-3 text-right">Franquia</th>
                      <th className="py-2.5 px-3 text-right">Consumo</th>
                      <th className="py-2.5 px-3 text-right">Excedente</th>
                      <th className="py-2.5 px-3 text-right">Valor Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr>
                      <td className="py-3 px-3 font-medium text-gray-900">
                        Locação Mensal de Equipamento de Impressão
                      </td>
                      <td className="py-3 px-3 text-right text-gray-600">
                        {selectedFatura.paginas_contratadas > 0
                          ? `${selectedFatura.paginas_contratadas.toLocaleString('pt-BR')} págs`
                          : 'Sem franquia'}
                      </td>
                      <td className="py-3 px-3 text-right text-gray-600">-</td>
                      <td className="py-3 px-3 text-right text-gray-600">-</td>
                      <td className="py-3 px-3 text-right font-semibold text-gray-900">
                        {formatCurrency(selectedFatura.valor_base)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-medium text-gray-900">
                        Páginas Adicionais / Consumo Excedente
                      </td>
                      <td className="py-3 px-3 text-right text-gray-600">-</td>
                      <td className="py-3 px-3 text-right text-gray-600">
                        {selectedFatura.paginas_consumidas.toLocaleString('pt-BR')} págs
                      </td>
                      <td className="py-3 px-3 text-right text-amber-700 font-semibold">
                        +{selectedFatura.paginas_excedentes.toLocaleString('pt-BR')} págs
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-gray-900">
                        {formatCurrency(selectedFatura.valor_excedente)}
                      </td>
                    </tr>
                    {selectedFatura.acrescimo_servicos && selectedFatura.acrescimo_servicos > 0 ? (
                      <tr>
                        <td colSpan={4} className="py-2.5 px-3 text-gray-700 font-medium">
                          Serviços Adicionais / Acréscimos
                        </td>
                        <td className="py-2.5 px-3 text-right text-emerald-700 font-semibold">
                          +{formatCurrency(selectedFatura.acrescimo_servicos)}
                        </td>
                      </tr>
                    ) : null}
                    {selectedFatura.desconto && selectedFatura.desconto > 0 ? (
                      <tr>
                        <td colSpan={4} className="py-2.5 px-3 text-gray-700 font-medium">
                          Descontos Concedidos no Equipamento
                        </td>
                        <td className="py-2.5 px-3 text-right text-red-600 font-semibold">
                          −{formatCurrency(selectedFatura.desconto)}
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                    <tr>
                      <td
                        colSpan={4}
                        className="py-3 px-3 font-bold text-gray-900 text-right uppercase"
                      >
                        TOTAL GERAL A PAGAR:
                      </td>
                      <td className="py-3 px-3 font-bold text-blue-700 text-base text-right font-mono">
                        {formatCurrency(selectedFatura.valor_total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Botões de Ação na visualização */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                  className="flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" /> Imprimir / Exportar
                </Button>

                <div className="flex items-center gap-2">
                  {selectedFatura.status !== 'paga' && selectedFatura.status !== 'cancelada' && (
                    <Button
                      size="sm"
                      onClick={() => handleMarcarPaga(selectedFatura)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
                    >
                      <CheckCircle className="w-4 h-4" /> Marcar como Paga
                    </Button>
                  )}
                  {selectedFatura.status !== 'cancelada' && selectedFatura.status !== 'paga' && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleCancelar(selectedFatura)}
                      className="flex items-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" /> Cancelar Fatura
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => setIsDetalhesOpen(false)}>
                    Fechar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
