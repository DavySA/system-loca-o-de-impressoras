import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Printer,
  Calendar,
  Layers,
  Building,
  ClipboardList,
  FileCheck2,
  AlertCircle,
  ExternalLink,
  Plus,
} from 'lucide-react'
import { equipamentosService } from '@/services/equipamentos'
import { contratosService } from '@/services/contratos'
import { ordensServicoService } from '@/services/ordensServico'
import { clientesService } from '@/services/clientes'
import { suprimentosService } from '@/services/suprimentos'
import { formatCurrency, formatDate, formatOSCode } from '@/lib/formatters'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
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
import type {
  Equipamento,
  Contrato,
  OrdemServico,
  Cliente,
  Suprimento,
  TipoSuprimento,
} from '@/types'
import { Package } from 'lucide-react'

export default function EquipamentoDetalhe() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [equipamento, setEquipamento] = useState<Equipamento | null>(null)
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [ordens, setOrdens] = useState<OrdemServico[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [suprimentos, setSuprimentos] = useState<Suprimento[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Modal Adicionar Suprimento
  const [isSuprimentoModalOpen, setIsSuprimentoModalOpen] = useState(false)
  const [suprimentoForm, setSuprimentoForm] = useState({
    data: new Date().toISOString().split('T')[0],
    tipo: 'toner' as TipoSuprimento,
    item: '',
    quantidade: 1,
    custo: 150,
    observacoes: '',
  })
  const [isSubmittingSuprimento, setIsSubmittingSuprimento] = useState(false)

  // Modal Vincular Contrato
  const [isVincularModalOpen, setIsVincularModalOpen] = useState(false)
  const [contratoForm, setContratoForm] = useState({
    cliente_id: '',
    data_inicio: new Date().toISOString().split('T')[0],
    data_fim: '',
    valor_mensal: 450,
    paginas_contratadas_mensais: 1000,
    valor_pagina_excedente: 0.08,
  })

  const loadData = async () => {
    if (!id) return
    try {
      setIsLoading(true)
      const [eq, contList, osList, clList, supList] = await Promise.all([
        equipamentosService.getById(id),
        contratosService.getByEquipamento(id),
        ordensServicoService.getByEquipamento(id),
        clientesService.getAll('status = "ativo"'),
        suprimentosService.getByEquipamento(id),
      ])
      setEquipamento(eq)
      setContratos(contList)
      setOrdens(osList)
      setClientes(clList)
      setSuprimentos(supList)
      if (clList.length > 0) {
        setContratoForm((prev) => ({ ...prev, cliente_id: clList[0].id }))
      }
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Equipamento não encontrado',
        description: 'Não foi possível carregar os dados deste equipamento.',
      })
      navigate('/equipamentos')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  useRealtime('equipamentos', () => loadData())
  useRealtime('contratos', () => loadData())
  useRealtime('ordens_servico', () => loadData())
  useRealtime('suprimentos', () => loadData())

  const handleSalvarSuprimento = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !suprimentoForm.item.trim()) return

    setIsSubmittingSuprimento(true)
    try {
      await suprimentosService.create({
        equipamento_id: id,
        data: new Date(suprimentoForm.data).toISOString(),
        tipo: suprimentoForm.tipo,
        item: suprimentoForm.item,
        quantidade: Number(suprimentoForm.quantidade),
        custo: Number(suprimentoForm.custo),
        observacoes: suprimentoForm.observacoes,
      })

      toast({
        title: 'Suprimento registrado!',
        description: 'Registro de toner/peça adicionado com sucesso.',
      })
      setIsSuprimentoModalOpen(false)
      setSuprimentoForm({
        data: new Date().toISOString().split('T')[0],
        tipo: 'toner',
        item: '',
        quantidade: 1,
        custo: 150,
        observacoes: '',
      })
      loadData()
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao registrar suprimento',
        description: 'Tente novamente.',
      })
    } finally {
      setIsSubmittingSuprimento(false)
    }
  }

  const handleVincularContrato = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !contratoForm.cliente_id) return

    try {
      await contratosService.create({
        cliente_id: contratoForm.cliente_id,
        equipamento_id: id,
        data_inicio: new Date(contratoForm.data_inicio).toISOString(),
        data_fim: contratoForm.data_fim ? new Date(contratoForm.data_fim).toISOString() : undefined,
        valor_mensal: Number(contratoForm.valor_mensal),
        paginas_contratadas_mensais: Number(contratoForm.paginas_contratadas_mensais),
        valor_pagina_excedente: Number(contratoForm.valor_pagina_excedente),
        status: 'ativo',
      })

      toast({
        title: 'Contrato vinculado',
        description: 'Equipamento locado com sucesso!',
      })
      setIsVincularModalOpen(false)
      loadData()
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao vincular contrato',
        description: 'Tente novamente.',
      })
    }
  }

  if (isLoading) {
    return (
      <div className="py-12 text-center text-sm text-gray-500">
        Carregando detalhes do equipamento...
      </div>
    )
  }

  if (!equipamento) return null

  const contratoAtual = contratos.find((c) => c.status === 'ativo')
  const clienteAtual = contratoAtual?.expand?.cliente_id

  // Cálculo do Custo Médio por Página:
  // total gasto em suprimentos ÷ total de páginas impressas do equipamento
  const totalPaginasImpressas =
    (equipamento.contador_monocromatico || 0) + (equipamento.contador_colorido || 0)

  const totalGastoSuprimentos = suprimentos.reduce(
    (acc, s) => acc + (s.custo || 0) * (s.quantidade || 1),
    0,
  )

  const custoMedioPorPagina =
    totalPaginasImpressas > 0 ? totalGastoSuprimentos / totalPaginasImpressas : 0

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/equipamentos')}
            className="h-9 w-9 p-0"
            title="Voltar"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                {equipamento.marca} {equipamento.modelo}
              </h1>
              <Badge
                variant={
                  equipamento.status === 'disponivel'
                    ? 'outline'
                    : equipamento.status === 'locado'
                      ? 'default'
                      : 'destructive'
                }
              >
                {equipamento.status}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500 font-mono mt-0.5">
              <span>
                Número de Série: <strong>{equipamento.numero_serie}</strong>
              </span>
              {equipamento.numero_patrimonio && (
                <span className="text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  Patrimônio: {equipamento.numero_patrimonio}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {equipamento.status === 'disponivel' && (
            <Button
              onClick={() => setIsVincularModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5"
            >
              <FileCheck2 className="w-4 h-4" /> Vincular Contrato
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              navigate('/ordens-de-servico', { state: { preselectEquipamentoId: equipamento.id } })
            }
          >
            + Abrir O.S.
          </Button>
        </div>
      </div>

      {/* Grid: Contadores e Dados Técnicos com Custo Médio por Página */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-gray-500 uppercase">Contador Mono</span>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {(equipamento.contador_monocromatico || 0).toLocaleString('pt-BR')}
          </p>
          <span className="text-[11px] text-gray-400">Total de páginas P&B</span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-gray-500 uppercase">Contador Color</span>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {(equipamento.contador_colorido || 0).toLocaleString('pt-BR')}
          </p>
          <span className="text-[11px] text-gray-400">Total de páginas coloridas</span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-gray-500 uppercase">Total Páginas</span>
          <p className="text-2xl font-bold text-blue-900 mt-1 font-mono">
            {totalPaginasImpressas.toLocaleString('pt-BR')}
          </p>
          <span className="text-[11px] text-gray-400">Mono + Color registradas</span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-blue-200 bg-blue-50/30 shadow-xs">
          <span className="text-xs font-semibold text-blue-900 uppercase">Custo Médio / Pág</span>
          <p className="text-2xl font-bold text-blue-950 mt-1 font-mono">
            R$ {custoMedioPorPagina.toFixed(4)}
          </p>
          <span className="text-[10px] text-blue-700 font-medium">
            Total suprimentos: {formatCurrency(totalGastoSuprimentos)}
          </span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-gray-500 uppercase">Status Contratual</span>
          <p className="text-lg font-semibold text-gray-800 mt-1 capitalize">
            {equipamento.status.replace('_', ' ')}
          </p>
          <span className="text-[11px] text-gray-400 truncate block">
            {clienteAtual ? clienteAtual.nome_razao_social : 'Em estoque'}
          </span>
        </div>
      </div>

      {/* Seção: Contrato Atual */}
      <Card className="border border-gray-200 shadow-xs">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Building className="w-5 h-5 text-blue-600" /> Contrato Atual
          </CardTitle>
          {contratoAtual && <Badge className="bg-emerald-600 text-white text-xs">Vigente</Badge>}
        </CardHeader>
        <CardContent>
          {!contratoAtual ? (
            <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-500 text-center">
              Este equipamento não possui contrato ativo no momento. Ele está disponível para
              locação.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase">
                  Cliente Locatário
                </span>
                <p className="font-semibold text-gray-900 mt-0.5">
                  <Link
                    to={`/clientes/${clienteAtual?.id}`}
                    className="hover:text-blue-600 inline-flex items-center gap-1"
                  >
                    {clienteAtual?.nome_razao_social} <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{clienteAtual?.cidade || ''}</p>
              </div>

              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase">
                  Período de Vigência
                </span>
                <p className="text-gray-800 mt-0.5">
                  {formatDate(contratoAtual.data_inicio)} até{' '}
                  {contratoAtual.data_fim ? formatDate(contratoAtual.data_fim) : 'Indeterminado'}
                </p>
              </div>

              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase">
                  Condições Contratuais
                </span>
                <p className="text-gray-800 mt-0.5">
                  <strong>{formatCurrency(contratoAtual.valor_mensal)}</strong> / mês
                </p>
                <p className="text-xs text-gray-500">
                  Franquia: {contratoAtual.paginas_contratadas_mensais.toLocaleString('pt-BR')} págs
                  (excedente: {formatCurrency(contratoAtual.valor_pagina_excedente)}/pág)
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Seção: Histórico de Contratos */}
      <Card className="border border-gray-200 shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-900">
            Histórico de Contratos do Equipamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          {contratos.length === 0 ? (
            <div className="py-6 text-center text-sm text-gray-500">
              Nenhum histórico de contratos para este equipamento.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-[#F9FAFB] text-gray-600 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="py-2.5 px-3">Cliente</th>
                    <th className="py-2.5 px-3">Período</th>
                    <th className="py-2.5 px-3">Valor Mensal</th>
                    <th className="py-2.5 px-3">Franquia</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {contratos.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50/80">
                      <td className="py-2.5 px-3 font-medium text-gray-900">
                        {c.expand?.cliente_id?.nome_razao_social || 'Cliente'}
                      </td>
                      <td className="py-2.5 px-3 text-gray-600">
                        {formatDate(c.data_inicio)} até{' '}
                        {c.data_fim ? formatDate(c.data_fim) : 'Indeterminado'}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-gray-900">
                        {formatCurrency(c.valor_mensal)}
                      </td>
                      <td className="py-2.5 px-3 text-gray-600">
                        {c.paginas_contratadas_mensais.toLocaleString('pt-BR')} págs
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge
                          variant={c.status === 'ativo' ? 'default' : 'secondary'}
                          className="text-[11px]"
                        >
                          {c.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Seção: Controle de Suprimentos & Peças do Equipamento */}
      <Card className="border border-gray-200 shadow-xs">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" /> Suprimentos e Peças Registrados
            </CardTitle>
            <p className="text-xs text-gray-500 mt-0.5">
              Toners, cilindros, fusores e peças instaladas neste equipamento
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setIsSuprimentoModalOpen(true)}
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Novo Suprimento
          </Button>
        </CardHeader>
        <CardContent>
          {suprimentos.length === 0 ? (
            <div className="py-6 text-center text-sm text-gray-500">
              Nenhum suprimento ou peça registrado para este equipamento ainda.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-[#F9FAFB] text-gray-600 font-semibold border-b border-gray-200 text-xs">
                  <tr>
                    <th className="py-2.5 px-3">Data</th>
                    <th className="py-2.5 px-3">Tipo</th>
                    <th className="py-2.5 px-3">Item / Peça</th>
                    <th className="py-2.5 px-3 text-center">Quantidade</th>
                    <th className="py-2.5 px-3 text-right">Custo Unitário</th>
                    <th className="py-2.5 px-3 text-right font-bold text-gray-900">Custo Total</th>
                    <th className="py-2.5 px-3">Observações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {suprimentos.map((sup) => {
                    const custoTot = (sup.custo || 0) * (sup.quantidade || 1)
                    return (
                      <tr key={sup.id} className="hover:bg-gray-50/80">
                        <td className="py-2.5 px-3 text-gray-600 font-medium">
                          {formatDate(sup.data)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="capitalize px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-700 border">
                            {sup.tipo.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-gray-900">{sup.item}</td>
                        <td className="py-2.5 px-3 text-center text-gray-700 font-mono">
                          {sup.quantidade}
                        </td>
                        <td className="py-2.5 px-3 text-right text-gray-600">
                          {formatCurrency(sup.custo)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold font-mono text-gray-900">
                          {formatCurrency(custoTot)}
                        </td>
                        <td className="py-2.5 px-3 text-gray-500 max-w-xs truncate">
                          {sup.observacoes || '-'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-200 text-xs font-bold text-gray-900">
                  <tr>
                    <td colSpan={5} className="py-2.5 px-3 uppercase text-right">
                      Total Investido em Suprimentos:
                    </td>
                    <td className="py-2.5 px-3 text-right text-blue-900 font-mono text-sm">
                      {formatCurrency(totalGastoSuprimentos)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Seção: Histórico de Ordens de Serviço */}
      <Card className="border border-gray-200 shadow-xs">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold text-gray-900">
            Histórico de Ordens de Serviço (Manutenções)
          </CardTitle>
          <Button
            size="sm"
            onClick={() =>
              navigate('/ordens-de-servico', { state: { preselectEquipamentoId: equipamento.id } })
            }
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
          >
            + Nova O.S.
          </Button>
        </CardHeader>
        <CardContent>
          {ordens.length === 0 ? (
            <div className="py-6 text-center text-sm text-gray-500">
              Nenhuma ordem de serviço registrada para este equipamento.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-[#F9FAFB] text-gray-600 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="py-2.5 px-3">Código</th>
                    <th className="py-2.5 px-3">Problema Relatado</th>
                    <th className="py-2.5 px-3">Data Abertura</th>
                    <th className="py-2.5 px-3">Técnico</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {ordens.map((os) => (
                    <tr
                      key={os.id}
                      onClick={() => navigate(`/ordens-de-servico/${os.id}`)}
                      className="hover:bg-gray-50/80 cursor-pointer"
                    >
                      <td className="py-2.5 px-3 font-semibold text-blue-600">
                        {formatOSCode(os.id)}
                      </td>
                      <td className="py-2.5 px-3 text-gray-700 max-w-sm truncate">
                        {os.descricao_problema}
                      </td>
                      <td className="py-2.5 px-3 text-gray-600">
                        {formatDate(os.data_abertura || os.created)}
                      </td>
                      <td className="py-2.5 px-3 text-gray-600">
                        {os.tecnico_responsavel || 'A definir'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-700 border">
                          {os.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Adicionar Suprimento */}
      <Dialog open={isSuprimentoModalOpen} onOpenChange={setIsSuprimentoModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" /> Registrar Suprimento / Peça
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSalvarSuprimento} className="space-y-4 pt-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="sup-data">Data de Registro</Label>
                <Input
                  id="sup-data"
                  type="date"
                  value={suprimentoForm.data}
                  onChange={(e) => setSuprimentoForm({ ...suprimentoForm, data: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="sup-tipo">Tipo</Label>
                <Select
                  value={suprimentoForm.tipo}
                  onValueChange={(val: any) => setSuprimentoForm({ ...suprimentoForm, tipo: val })}
                >
                  <SelectTrigger id="sup-tipo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="toner">Toner</SelectItem>
                    <SelectItem value="cartucho_tinta">Cartucho Tinta</SelectItem>
                    <SelectItem value="cilindro">Cilindro / Fotocondutor</SelectItem>
                    <SelectItem value="fusor">Unidade Fusora</SelectItem>
                    <SelectItem value="correia">Correia de Transferência</SelectItem>
                    <SelectItem value="peca">Peça / Rolete / Sensor</SelectItem>
                    <SelectItem value="outro">Outro Suprimento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="sup-item">Descrição do Item / Peça *</Label>
              <Input
                id="sup-item"
                placeholder="Ex: Toner Preto TN-450 / Rolete de Tração"
                value={suprimentoForm.item}
                onChange={(e) => setSuprimentoForm({ ...suprimentoForm, item: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="sup-qtd">Quantidade</Label>
                <Input
                  id="sup-qtd"
                  type="number"
                  min={1}
                  value={suprimentoForm.quantidade}
                  onChange={(e) =>
                    setSuprimentoForm({
                      ...suprimentoForm,
                      quantidade: parseInt(e.target.value, 10) || 1,
                    })
                  }
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="sup-custo">Custo Unitário (R$)</Label>
                <Input
                  id="sup-custo"
                  type="number"
                  step="0.01"
                  min={0}
                  value={suprimentoForm.custo}
                  onChange={(e) =>
                    setSuprimentoForm({
                      ...suprimentoForm,
                      custo: parseFloat(e.target.value) || 0,
                    })
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="sup-obs">Observações (Opcional)</Label>
              <Textarea
                id="sup-obs"
                rows={2}
                placeholder="Ex: Instalação preventiva, lote número 4920..."
                value={suprimentoForm.observacoes}
                onChange={(e) =>
                  setSuprimentoForm({ ...suprimentoForm, observacoes: e.target.value })
                }
              />
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSuprimentoModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingSuprimento}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSubmittingSuprimento ? 'Salvando...' : 'Salvar Suprimento'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Vincular Contrato */}
      <Dialog open={isVincularModalOpen} onOpenChange={setIsVincularModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Vincular Contrato de Locação</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleVincularContrato} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="cliente_select">Cliente Locatário</Label>
              <Select
                value={contratoForm.cliente_id}
                onValueChange={(val) => setContratoForm({ ...contratoForm, cliente_id: val })}
              >
                <SelectTrigger id="cliente_select">
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="data_ini">Data Início</Label>
                <Input
                  id="data_ini"
                  type="date"
                  value={contratoForm.data_inicio}
                  onChange={(e) =>
                    setContratoForm({ ...contratoForm, data_inicio: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="data_term">Data Término</Label>
                <Input
                  id="data_term"
                  type="date"
                  value={contratoForm.data_fim}
                  onChange={(e) => setContratoForm({ ...contratoForm, data_fim: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="vm">Valor Mensal (R$)</Label>
                <Input
                  id="vm"
                  type="number"
                  step="0.01"
                  value={contratoForm.valor_mensal}
                  onChange={(e) =>
                    setContratoForm({
                      ...contratoForm,
                      valor_mensal: parseFloat(e.target.value) || 0,
                    })
                  }
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fr">Franquia Págs</Label>
                <Input
                  id="fr"
                  type="number"
                  value={contratoForm.paginas_contratadas_mensais}
                  onChange={(e) =>
                    setContratoForm({
                      ...contratoForm,
                      paginas_contratadas_mensais: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ve">Excedente (R$)</Label>
                <Input
                  id="ve"
                  type="number"
                  step="0.01"
                  value={contratoForm.valor_pagina_excedente}
                  onChange={(e) =>
                    setContratoForm({
                      ...contratoForm,
                      valor_pagina_excedente: parseFloat(e.target.value) || 0,
                    })
                  }
                  required
                />
              </div>
            </div>

            <DialogFooter className="pt-4 gap-2">
              <Button type="button" variant="outline" onClick={() => setIsVincularModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                Vincular Contrato
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
