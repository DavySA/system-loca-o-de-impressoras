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
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
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
import type { Fatura, Cliente, Contrato } from '@/types'

export default function Faturamento() {
  const location = useLocation()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [faturas, setFaturas] = useState<Fatura[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // KPIs
  const [kpiFaturamentoMes, setKpiFaturamentoMes] = useState(0)
  const [kpiPaginasExcedentes, setKpiPaginasExcedentes] = useState(0)
  const [kpiFaturasPendentes, setKpiFaturasPendentes] = useState(0)

  // Modal Gerar Fatura
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedClienteId, setSelectedClienteId] = useState('')
  const [clienteContratos, setClienteContratos] = useState<Contrato[]>([])
  const [selectedContratoId, setSelectedContratoId] = useState('')
  const [mesReferencia, setMesReferencia] = useState('')
  const [paginasConsumidas, setPaginasConsumidas] = useState<number>(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Modal Detalhes / Impressão de Fatura
  const [selectedFatura, setSelectedFatura] = useState<Fatura | null>(null)
  const [isDetalhesOpen, setIsDetalhesOpen] = useState(false)

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [fatList, clList, contList] = await Promise.all([
        faturasService.getAll(),
        clientesService.getAll('status = "ativo"'),
        contratosService.getAll('status = "ativo"'),
      ])
      setFaturas(fatList)
      setClientes(clList)
      setContratos(contList)

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
      setSelectedContratoId(conts[0].id)
      setPaginasConsumidas(conts[0].paginas_contratadas_mensais || 0)
    } else {
      setSelectedContratoId('')
      setPaginasConsumidas(0)
    }

    setIsModalOpen(true)
  }

  // Quando o cliente selecionado muda
  const handleClienteChange = (cId: string) => {
    setSelectedClienteId(cId)
    const conts = contratos.filter((c) => c.cliente_id === cId)
    setClienteContratos(conts)
    if (conts.length > 0) {
      setSelectedContratoId(conts[0].id)
      setPaginasConsumidas(conts[0].paginas_contratadas_mensais || 0)
    } else {
      setSelectedContratoId('')
      setPaginasConsumidas(0)
    }
  }

  // Contrato atualmente selecionado no modal
  const activeContrato = clienteContratos.find((c) => c.id === selectedContratoId)

  // Cálculos ao vivo da fatura
  const paginasContratadas = activeContrato?.paginas_contratadas_mensais || 0
  const valorBaseAluguel = activeContrato?.valor_mensal || 0
  const valorPorPaginaExcedente = activeContrato?.valor_pagina_excedente || 0

  const paginasExcedentesCalculadas = Math.max(0, paginasConsumidas - paginasContratadas)
  const valorExcedenteCalculado = paginasExcedentesCalculadas * valorPorPaginaExcedente
  const valorTotalCalculado = valorBaseAluguel + valorExcedenteCalculado

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
        valor_base: valorBaseAluguel,
        valor_excedente: valorExcedenteCalculado,
        valor_total: valorTotalCalculado,
        status: 'gerada',
      })

      toast({
        title: 'Fatura gerada com sucesso!',
        description: `Fatura de ${formatCurrency(valorTotalCalculado)} gerada para o mês ${formatMonthYear(mesReferencia)}.`,
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
        <Button
          onClick={() => handleOpenCreate()}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Gerar Fatura
        </Button>
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

      {/* Modal Gerar Fatura com Cálculo ao Vivo */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-blue-600" /> Gerar Fatura de Locação
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleGerarFatura} className="space-y-4 pt-2">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="fat-cont">Contrato Ativo</Label>
                <Select value={selectedContratoId} onValueChange={setSelectedContratoId}>
                  <SelectTrigger id="fat-cont">
                    <SelectValue placeholder="Selecione o contrato" />
                  </SelectTrigger>
                  <SelectContent>
                    {clienteContratos.length === 0 ? (
                      <SelectItem value="none" disabled>
                        Nenhum contrato ativo
                      </SelectItem>
                    ) : (
                      clienteContratos.map((ct) => (
                        <SelectItem key={ct.id} value={ct.id}>
                          Contrato #{ct.id.slice(0, 6)} ({formatCurrency(ct.valor_mensal)}/mês)
                        </SelectItem>
                      ))
                    )}
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

            {/* Leituras e Franquia */}
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
              <span className="text-xs font-semibold text-gray-700 uppercase block">
                Leitura de Contadores e Parâmetros
              </span>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <Label className="text-gray-500">Páginas Contratadas (Franquia)</Label>
                  <Input
                    readOnly
                    disabled
                    value={paginasContratadas.toLocaleString('pt-BR')}
                    className="bg-gray-100 font-semibold"
                  />
                </div>

                <div>
                  <Label htmlFor="p-cons" className="text-gray-900 font-semibold">
                    Páginas Consumidas (Leitura Atual) *
                  </Label>
                  <Input
                    id="p-cons"
                    type="number"
                    min={0}
                    value={paginasConsumidas}
                    onChange={(e) => setPaginasConsumidas(parseInt(e.target.value, 10) || 0)}
                    required
                    className="bg-white border-blue-400 font-bold text-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                <div>
                  <Label className="text-gray-500">Valor Base do Aluguel</Label>
                  <Input
                    readOnly
                    disabled
                    value={formatCurrency(valorBaseAluguel)}
                    className="bg-gray-100 font-semibold"
                  />
                </div>
                <div>
                  <Label className="text-gray-500">Custo da Página Excedente</Label>
                  <Input
                    readOnly
                    disabled
                    value={formatCurrency(valorPorPaginaExcedente)}
                    className="bg-gray-100 font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Cálculo ao vivo */}
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 space-y-2 text-xs">
              <div className="flex items-center justify-between text-blue-900">
                <span>Páginas Excedentes Calculadas:</span>
                <span className="font-bold text-sm">
                  {paginasExcedentesCalculadas.toLocaleString('pt-BR')} págs
                </span>
              </div>
              <div className="flex items-center justify-between text-blue-900">
                <span>Valor Excedente:</span>
                <span className="font-bold text-sm">{formatCurrency(valorExcedenteCalculado)}</span>
              </div>
              <div className="pt-2 border-t border-blue-200 flex items-center justify-between text-blue-950 font-bold text-base">
                <span>Valor Total da Fatura:</span>
                <span className="text-lg text-blue-700">{formatCurrency(valorTotalCalculado)}</span>
              </div>
            </div>

            <DialogFooter className="pt-4 gap-2">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !selectedContratoId}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSubmitting ? 'Gerando...' : 'Gerar Fatura'}
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
              {/* Header da Fatura */}
              <div className="flex items-start justify-between border-b border-gray-200 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Fatura de Locação</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    ID Fatura: #{selectedFatura.id.toUpperCase()} • Mês de Referência:{' '}
                    <strong>{formatMonthYear(selectedFatura.mes_referencia)}</strong>
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      selectedFatura.status === 'paga'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : selectedFatura.status === 'vencida'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : selectedFatura.status === 'cancelada'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}
                  >
                    {selectedFatura.status.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Informações do Cliente & Empresa */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-gray-400 font-semibold uppercase block">
                    Sacado / Cliente
                  </span>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">
                    {selectedFatura.expand?.cliente_id?.nome_razao_social}
                  </p>
                  <p className="text-gray-600">
                    Doc: {selectedFatura.expand?.cliente_id?.documento || '-'}
                  </p>
                  <p className="text-gray-600">
                    Endereço: {selectedFatura.expand?.cliente_id?.endereco || '-'}{' '}
                    {selectedFatura.expand?.cliente_id?.cidade
                      ? ` - ${selectedFatura.expand?.cliente_id?.cidade}/${selectedFatura.expand?.cliente_id?.uf}`
                      : ''}
                  </p>
                </div>

                <div>
                  <span className="text-gray-400 font-semibold uppercase block">
                    Cedente / Prestador
                  </span>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">
                    PrintGest Locação de Impressoras LTDA
                  </p>
                  <p className="text-gray-600">CNPJ: 10.987.654/0001-32</p>
                  <p className="text-gray-600">Emissão: {formatDate(selectedFatura.created)}</p>
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
                        {selectedFatura.paginas_contratadas.toLocaleString('pt-BR')} págs
                      </td>
                      <td className="py-3 px-3 text-right text-gray-600">-</td>
                      <td className="py-3 px-3 text-right text-gray-600">-</td>
                      <td className="py-3 px-3 text-right font-semibold text-gray-900">
                        {formatCurrency(selectedFatura.valor_base)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-medium text-gray-900">
                        Franquia de Páginas Adicionais (Excedentes)
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
                  </tbody>
                  <tfoot className="bg-gray-50 border-t border-gray-200">
                    <tr>
                      <td colSpan={4} className="py-3 px-3 font-bold text-gray-900 text-right">
                        VALOR TOTAL A COBRAR:
                      </td>
                      <td className="py-3 px-3 font-bold text-blue-700 text-sm text-right">
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
