import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Edit,
  Building,
  User as UserIcon,
  Phone,
  Mail,
  MapPin,
  Printer,
  ClipboardList,
  Receipt,
  FileText,
  Plus,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'
import { clientesService } from '@/services/clientes'
import { contratosService } from '@/services/contratos'
import { equipamentosService } from '@/services/equipamentos'
import { ordensServicoService } from '@/services/ordensServico'
import { faturasService } from '@/services/faturas'
import { Textarea } from '@/components/ui/textarea'
import {
  formatCurrency,
  formatDate,
  formatOSCode,
  formatMonthYear,
  formatCnpjCpf,
  formatPhone,
} from '@/lib/formatters'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import type { Cliente, Contrato, OrdemServico, Fatura } from '@/types'

export default function ClienteDetalhe() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [ordens, setOrdens] = useState<OrdemServico[]>([])
  const [faturas, setFaturas] = useState<Fatura[]>([])
  const [equipamentosDisponiveis, setEquipamentosDisponiveis] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Modal Cadastro / Edição de Contrato
  const [isContratoModalOpen, setIsContratoModalOpen] = useState(false)
  const [editingContrato, setEditingContrato] = useState<Contrato | null>(null)
  const [contratoForm, setContratoForm] = useState({
    numero_contrato: '',
    equipamento_id: '',
    data_inicio: new Date().toISOString().split('T')[0],
    duracao_meses: 12,
    modalidade: 'com_franquia' as 'com_franquia' | 'apenas_excedentes',
    valor_mensal: 450,
    paginas_contratadas_mensais: 1000,
    valor_pagina_excedente: 0.08,
    valor_scanner: 0,
    outros_servicos: '',
    status: 'ativo' as 'ativo' | 'inativo' | 'encerrado',
  })
  const [isSubmittingContrato, setIsSubmittingContrato] = useState(false)

  // Modal Edição Cliente
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    nome_razao_social: '',
    tipo: 'Pessoa Jurídica' as 'Pessoa Jurídica' | 'Pessoa Física',
    documento: '',
    email: '',
    telefone: '',
    cidade: '',
    uf: '',
    endereco: '',
    status: 'ativo' as 'ativo' | 'inativo',
  })

  const loadData = async () => {
    if (!id) return
    try {
      setIsLoading(true)
      const [cData, contData, osData, fatData, eqData] = await Promise.all([
        clientesService.getById(id),
        contratosService.getByCliente(id),
        ordensServicoService.getByCliente(id),
        faturasService.getByCliente(id),
        equipamentosService.getAll(),
      ])
      setCliente(cData)
      setContratos(contData)
      setOrdens(osData)
      setFaturas(fatData)
      setEquipamentosDisponiveis(eqData)

      setFormData({
        nome_razao_social: cData.nome_razao_social,
        tipo: cData.tipo,
        documento: cData.documento || '',
        email: cData.email || '',
        telefone: cData.telefone || '',
        cidade: cData.cidade || '',
        uf: cData.uf || '',
        endereco: cData.endereco || '',
        status: cData.status,
      })
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar dados do cliente',
        description: 'Cliente não encontrado ou removido.',
      })
      navigate('/clientes')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  useRealtime('clientes', () => loadData())
  useRealtime('contratos', () => loadData())
  useRealtime('ordens_servico', () => loadData())
  useRealtime('faturas', () => loadData())

  const handleOpenNewContrato = () => {
    setEditingContrato(null)
    const nextNum = 'CTR-' + Math.floor(1000 + Math.random() * 9000)
    setContratoForm({
      numero_contrato: nextNum,
      equipamento_id: equipamentosDisponiveis[0]?.id || '',
      data_inicio: new Date().toISOString().split('T')[0],
      duracao_meses: 12,
      modalidade: 'com_franquia',
      valor_mensal: 450,
      paginas_contratadas_mensais: 1000,
      valor_pagina_excedente: 0.08,
      valor_scanner: 0,
      outros_servicos: '',
      status: 'ativo',
    })
    setIsContratoModalOpen(true)
  }

  const handleOpenEditContrato = (c: Contrato, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingContrato(c)
    setContratoForm({
      numero_contrato: c.numero_contrato || '',
      equipamento_id: c.equipamento_id,
      data_inicio: c.data_inicio ? c.data_inicio.split('T')[0] : '',
      duracao_meses: c.duracao_meses || 12,
      modalidade: c.modalidade || 'com_franquia',
      valor_mensal: c.valor_mensal,
      paginas_contratadas_mensais: c.paginas_contratadas_mensais,
      valor_pagina_excedente: c.valor_pagina_excedente,
      valor_scanner: c.valor_scanner || 0,
      outros_servicos: c.outros_servicos || '',
      status: c.status,
    })
    setIsContratoModalOpen(true)
  }

  const handleSaveContrato = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !contratoForm.equipamento_id) {
      toast({
        variant: 'destructive',
        title: 'Selecione um equipamento',
        description: 'É necessário vincular um equipamento ao contrato.',
      })
      return
    }

    setIsSubmittingContrato(true)
    try {
      // Calcular data_fim baseada na data_inicio + duracao_meses
      let dataFim: string | undefined = undefined
      if (contratoForm.data_inicio && contratoForm.duracao_meses) {
        const d = new Date(contratoForm.data_inicio)
        d.setMonth(d.getMonth() + Number(contratoForm.duracao_meses))
        dataFim = d.toISOString()
      }

      const payload: Partial<Contrato> = {
        cliente_id: id,
        equipamento_id: contratoForm.equipamento_id,
        numero_contrato: contratoForm.numero_contrato || undefined,
        duracao_meses: Number(contratoForm.duracao_meses),
        modalidade: contratoForm.modalidade,
        data_inicio: new Date(contratoForm.data_inicio).toISOString(),
        data_fim: dataFim,
        valor_mensal: Number(contratoForm.valor_mensal) || 0,
        paginas_contratadas_mensais:
          contratoForm.modalidade === 'apenas_excedentes'
            ? 0
            : Number(contratoForm.paginas_contratadas_mensais) || 0,
        valor_pagina_excedente: Number(contratoForm.valor_pagina_excedente) || 0,
        valor_scanner: Number(contratoForm.valor_scanner) || 0,
        outros_servicos: contratoForm.outros_servicos,
        status: contratoForm.status,
      }

      if (editingContrato) {
        await contratosService.update(editingContrato.id, payload)
        toast({
          title: 'Contrato atualizado',
          description: 'Alterações no contrato salvas com sucesso.',
        })
      } else {
        await contratosService.create(payload)
        toast({
          title: 'Contrato cadastrado',
          description: 'Novo contrato vinculado ao cliente e equipamento.',
        })
      }
      setIsContratoModalOpen(false)
      loadData()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar contrato',
        description: err.message || 'Verifique as informações preenchidas.',
      })
    } finally {
      setIsSubmittingContrato(false)
    }
  }

  const handleUpdateCliente = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    try {
      await clientesService.update(id, formData)
      toast({
        title: 'Cliente atualizado',
        description: 'Dados salvos com sucesso.',
      })
      setIsEditModalOpen(false)
      loadData()
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: 'Não foi possível atualizar o cliente.',
      })
    }
  }

  if (isLoading) {
    return (
      <div className="py-12 text-center text-sm text-gray-500">
        Carregando detalhes do cliente...
      </div>
    )
  }

  if (!cliente) return null

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/clientes')}
            className="h-9 w-9 p-0"
            title="Voltar para Clientes"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                {cliente.nome_razao_social}
              </h1>
              {cliente.status === 'ativo' ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Ativo
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                  Inativo
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 font-mono mt-0.5">
              Doc: {cliente.documento || 'Sem documento cadastrado'} • Tipo: {cliente.tipo}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-1.5"
          >
            <Edit className="w-4 h-4" /> Editar Cliente
          </Button>
          <Button
            size="sm"
            onClick={() => navigate('/faturamento', { state: { preselectClienteId: cliente.id } })}
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5"
          >
            <Receipt className="w-4 h-4" /> Gerar Nova Fatura
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="equipamentos" className="space-y-4">
        <TabsList className="bg-white border border-gray-200 p-1 rounded-xl shadow-xs">
          <TabsTrigger
            value="equipamentos"
            className="flex items-center gap-1.5 text-xs sm:text-sm"
          >
            <Printer className="w-4 h-4" /> Equipamentos ({contratos.length})
          </TabsTrigger>
          <TabsTrigger value="ordens" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <ClipboardList className="w-4 h-4" /> Ordens de Serviço ({ordens.length})
          </TabsTrigger>
          <TabsTrigger value="faturamento" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Receipt className="w-4 h-4" /> Faturamento ({faturas.length})
          </TabsTrigger>
          <TabsTrigger value="resumo" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <FileText className="w-4 h-4" /> Resumo Cadastral
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Equipamentos / Contratos */}
        <TabsContent value="equipamentos" className="space-y-4">
          <Card className="border border-gray-200 shadow-xs">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-gray-900">
                  Equipamentos Locados & Contratos
                </CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">
                  Lista de impressoras alocadas neste cliente e planos vigentes
                </p>
              </div>
              <Button
                size="sm"
                onClick={handleOpenNewContrato}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Novo Contrato
              </Button>
            </CardHeader>
            <CardContent>
              {contratos.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-500">
                  Nenhum contrato/equipamento cadastrado para este cliente.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-[#F9FAFB] text-gray-600 font-semibold border-b border-gray-200">
                      <tr>
                        <th className="py-2.5 px-3">Nº Contrato</th>
                        <th className="py-2.5 px-3">Equipamento</th>
                        <th className="py-2.5 px-3">Modalidade</th>
                        <th className="py-2.5 px-3">Vigência / Duração</th>
                        <th className="py-2.5 px-3">Valor Mensal</th>
                        <th className="py-2.5 px-3">Franquia</th>
                        <th className="py-2.5 px-3">Excedente</th>
                        <th className="py-2.5 px-3">Scanner</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {contratos.map((c) => {
                        const eq = c.expand?.equipamento_id
                        return (
                          <tr key={c.id} className="hover:bg-gray-50/80">
                            <td className="py-3 px-3 font-bold text-blue-600 font-mono">
                              {c.numero_contrato || 'S/Nº'}
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-medium text-gray-900">
                                {eq ? `${eq.marca} ${eq.modelo}` : 'Equipamento'}
                              </div>
                              <div className="font-mono text-[11px] text-gray-500">
                                S/N: {eq?.numero_serie || '-'}
                                {eq?.numero_patrimonio ? ` • Pat: ${eq.numero_patrimonio}` : ''}
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                  c.modalidade === 'apenas_excedentes'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {c.modalidade === 'apenas_excedentes'
                                  ? 'Apenas Excedentes'
                                  : 'Com Franquia'}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-xs text-gray-600">
                              <div>{formatDate(c.data_inicio)}</div>
                              <div className="text-[11px] text-gray-400">
                                {c.duracao_meses ? `${c.duracao_meses} meses` : '12 meses'}
                                {c.data_fim ? ` (até ${formatDate(c.data_fim)})` : ''}
                              </div>
                            </td>
                            <td className="py-3 px-3 font-semibold text-gray-900">
                              {formatCurrency(c.valor_mensal)}
                            </td>
                            <td className="py-3 px-3 text-gray-600">
                              {c.modalidade === 'apenas_excedentes'
                                ? 'Sem franquia'
                                : `${(c.paginas_contratadas_mensais || 0).toLocaleString('pt-BR')} págs`}
                            </td>
                            <td className="py-3 px-3 text-gray-600">
                              {formatCurrency(c.valor_pagina_excedente || 0)}/pág
                            </td>
                            <td className="py-3 px-3 text-gray-600">
                              {c.valor_scanner && c.valor_scanner > 0
                                ? formatCurrency(c.valor_scanner)
                                : 'Incluso / Não fat.'}
                            </td>
                            <td className="py-3 px-3">
                              <Badge
                                variant={c.status === 'ativo' ? 'default' : 'secondary'}
                                className="text-[11px]"
                              >
                                {c.status}
                              </Badge>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => handleOpenEditContrato(c, e)}
                                  className="h-8 w-8 p-0 text-gray-500 hover:text-blue-600"
                                  title="Editar Contrato"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </Button>
                                {eq && (
                                  <Link
                                    to={`/equipamentos/${eq.id}`}
                                    className="p-1.5 text-gray-500 hover:text-blue-600 inline-flex items-center"
                                    title="Ver Equipamento"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </Link>
                                )}
                              </div>
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
        </TabsContent>

        {/* Tab 2: Ordens de Serviço */}
        <TabsContent value="ordens" className="space-y-4">
          <Card className="border border-gray-200 shadow-xs">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-gray-900">
                  Histórico de Ordens de Serviço
                </CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">
                  Atendimentos técnicos e manutenções registradas para este cliente
                </p>
              </div>
              <Button
                size="sm"
                onClick={() =>
                  navigate('/ordens-de-servico', { state: { preselectClienteId: cliente.id } })
                }
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
              >
                + Nova O.S.
              </Button>
            </CardHeader>
            <CardContent>
              {ordens.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-500">
                  Nenhuma ordem de serviço registrada para este cliente.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-[#F9FAFB] text-gray-600 font-semibold border-b border-gray-200">
                      <tr>
                        <th className="py-2.5 px-3">Código</th>
                        <th className="py-2.5 px-3">Equipamento</th>
                        <th className="py-2.5 px-3">Problema / Serviço</th>
                        <th className="py-2.5 px-3">Abertura</th>
                        <th className="py-2.5 px-3">Técnico</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {ordens.map((os) => (
                        <tr
                          key={os.id}
                          onClick={() => navigate(`/ordens-de-servico/${os.id}`)}
                          className="hover:bg-gray-50/80 cursor-pointer transition-colors"
                        >
                          <td className="py-3 px-3 font-semibold text-blue-600">
                            {formatOSCode(os.id)}
                          </td>
                          <td className="py-3 px-3 text-gray-700">
                            {os.expand?.equipamento_id?.modelo || 'Equipamento'}
                          </td>
                          <td className="py-3 px-3 text-gray-600 max-w-xs truncate">
                            {os.descricao_problema}
                          </td>
                          <td className="py-3 px-3 text-gray-600 text-xs">
                            {formatDate(os.data_abertura || os.created)}
                          </td>
                          <td className="py-3 px-3 text-gray-600 text-xs">
                            {os.tecnico_responsavel || 'A definir'}
                          </td>
                          <td className="py-3 px-3">
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
        </TabsContent>

        {/* Tab 3: Faturamento */}
        <TabsContent value="faturamento" className="space-y-4">
          <Card className="border border-gray-200 shadow-xs">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-gray-900">
                  Histórico de Faturas
                </CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">
                  Demonstrativo de faturas geradas, leituras de páginas e status de quitação
                </p>
              </div>
              <Button
                size="sm"
                onClick={() =>
                  navigate('/faturamento', { state: { preselectClienteId: cliente.id } })
                }
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Gerar Nova Fatura
              </Button>
            </CardHeader>
            <CardContent>
              {faturas.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-500">
                  Nenhuma fatura registrada para este cliente.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-[#F9FAFB] text-gray-600 font-semibold border-b border-gray-200">
                      <tr>
                        <th className="py-2.5 px-3">Mês Ref.</th>
                        <th className="py-2.5 px-3">Valor Base (Aluguel)</th>
                        <th className="py-2.5 px-3">Páginas Excedentes</th>
                        <th className="py-2.5 px-3">Valor Excedente</th>
                        <th className="py-2.5 px-3">Valor Total</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {faturas.map((f) => (
                        <tr key={f.id} className="hover:bg-gray-50/80">
                          <td className="py-3 px-3 font-semibold text-gray-900">
                            {formatMonthYear(f.mes_referencia)}
                          </td>
                          <td className="py-3 px-3 text-gray-700">
                            {formatCurrency(f.valor_base)}
                          </td>
                          <td className="py-3 px-3 text-gray-600">+{f.paginas_excedentes} págs</td>
                          <td className="py-3 px-3 text-gray-600">
                            {formatCurrency(f.valor_excedente)}
                          </td>
                          <td className="py-3 px-3 font-bold text-gray-900">
                            {formatCurrency(f.valor_total)}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Resumo */}
        <TabsContent value="resumo" className="space-y-4">
          <Card className="border border-gray-200 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-gray-900">
                Informações de Contato e Endereço
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div className="space-y-3">
                  <div>
                    <span className="text-xs font-semibold text-gray-500 uppercase">
                      Razão Social / Nome
                    </span>
                    <p className="text-gray-900 font-medium mt-0.5">{cliente.nome_razao_social}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-gray-500 uppercase">Documento</span>
                    <p className="text-gray-900 font-mono mt-0.5">
                      {cliente.documento || 'Não informado'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-gray-500 uppercase">
                      E-mail de Contato
                    </span>
                    <p className="text-gray-900 mt-0.5 flex items-center gap-1.5">
                      <Mail className="w-4 h-4 text-gray-400" />
                      {cliente.email || 'Não informado'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-gray-500 uppercase">Telefone</span>
                    <p className="text-gray-900 mt-0.5 flex items-center gap-1.5">
                      <Phone className="w-4 h-4 text-gray-400" />
                      {cliente.telefone || 'Não informado'}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="text-xs font-semibold text-gray-500 uppercase">
                      Cidade / UF
                    </span>
                    <p className="text-gray-900 mt-0.5">
                      {cliente.cidade || 'Não informada'}
                      {cliente.uf ? ` - ${cliente.uf}` : ''}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-gray-500 uppercase">
                      Endereço Completo
                    </span>
                    <p className="text-gray-900 mt-0.5 flex items-start gap-1.5">
                      <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                      {cliente.endereco || 'Não informado'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-gray-500 uppercase">
                      Data de Cadastro
                    </span>
                    <p className="text-gray-900 mt-0.5">{formatDate(cliente.created)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal Cadastro/Edição de Contrato */}
      <Dialog open={isContratoModalOpen} onOpenChange={setIsContratoModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingContrato ? 'Editar Contrato de Locação' : 'Cadastrar Novo Contrato'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveContrato} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ctr-numero">Número do Contrato</Label>
                <Input
                  id="ctr-numero"
                  value={contratoForm.numero_contrato}
                  onChange={(e) =>
                    setContratoForm({ ...contratoForm, numero_contrato: e.target.value })
                  }
                  placeholder="Ex: CTR-2025-001"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ctr-status">Status do Contrato</Label>
                <Select
                  value={contratoForm.status}
                  onValueChange={(val: any) => setContratoForm({ ...contratoForm, status: val })}
                >
                  <SelectTrigger id="ctr-status" className="h-10 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                    <SelectItem value="encerrado">Encerrado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ctr-equipamento">Equipamento Alocado</Label>
              <Select
                value={contratoForm.equipamento_id}
                onValueChange={(val: string) =>
                  setContratoForm({ ...contratoForm, equipamento_id: val })
                }
              >
                <SelectTrigger id="ctr-equipamento" className="h-10 text-sm">
                  <SelectValue placeholder="Selecione o equipamento..." />
                </SelectTrigger>
                <SelectContent>
                  {equipamentosDisponiveis.map((eq) => (
                    <SelectItem key={eq.id} value={eq.id}>
                      {eq.marca} {eq.modelo} — S/N: {eq.numero_serie}
                      {eq.numero_patrimonio ? ` (Pat: ${eq.numero_patrimonio})` : ''} [{eq.status}]
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ctr-inicio">Data de Início</Label>
                <Input
                  id="ctr-inicio"
                  type="date"
                  value={contratoForm.data_inicio}
                  onChange={(e) =>
                    setContratoForm({ ...contratoForm, data_inicio: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ctr-duracao">Duração (Meses)</Label>
                <Input
                  id="ctr-duracao"
                  type="number"
                  min={1}
                  value={contratoForm.duracao_meses}
                  onChange={(e) =>
                    setContratoForm({ ...contratoForm, duracao_meses: Number(e.target.value) })
                  }
                  placeholder="Ex: 12, 24, 36"
                  required
                />
              </div>
            </div>

            {/* Modalidade */}
            <div className="space-y-1.5 p-3.5 rounded-lg bg-gray-50 border border-gray-200">
              <Label className="text-gray-900 font-semibold block mb-2">Modalidade do Plano</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setContratoForm({ ...contratoForm, modalidade: 'com_franquia' })}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    contratoForm.modalidade === 'com_franquia'
                      ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="font-semibold text-xs sm:text-sm text-gray-900">
                    Com Franquia Contratada
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    Pacote mensal fixo de páginas inclusas + excedente
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setContratoForm({ ...contratoForm, modalidade: 'apenas_excedentes' })
                  }
                  className={`p-3 rounded-lg border text-left transition-all ${
                    contratoForm.modalidade === 'apenas_excedentes'
                      ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="font-semibold text-xs sm:text-sm text-gray-900">
                    Apenas Excedentes
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    Sem franquia; fatura somente o que for consumido
                  </div>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ctr-valor">Valor Mensal do Contrato (R$)</Label>
                <Input
                  id="ctr-valor"
                  type="number"
                  step="0.01"
                  value={contratoForm.valor_mensal}
                  onChange={(e) =>
                    setContratoForm({ ...contratoForm, valor_mensal: Number(e.target.value) })
                  }
                  required
                />
              </div>

              {contratoForm.modalidade === 'com_franquia' && (
                <div className="space-y-1.5">
                  <Label htmlFor="ctr-franquia">Franquia Mensal (Págs)</Label>
                  <Input
                    id="ctr-franquia"
                    type="number"
                    value={contratoForm.paginas_contratadas_mensais}
                    onChange={(e) =>
                      setContratoForm({
                        ...contratoForm,
                        paginas_contratadas_mensais: Number(e.target.value),
                      })
                    }
                    required
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="ctr-excedente">Página Excedente (R$)</Label>
                <Input
                  id="ctr-excedente"
                  type="number"
                  step="0.001"
                  value={contratoForm.valor_pagina_excedente}
                  onChange={(e) =>
                    setContratoForm({
                      ...contratoForm,
                      valor_pagina_excedente: Number(e.target.value),
                    })
                  }
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ctr-scanner">
                  Valor Scanner se faturado (R$){' '}
                  <span className="text-gray-400 font-normal">(opcional)</span>
                </Label>
                <Input
                  id="ctr-scanner"
                  type="number"
                  step="0.01"
                  value={contratoForm.valor_scanner}
                  onChange={(e) =>
                    setContratoForm({ ...contratoForm, valor_scanner: Number(e.target.value) })
                  }
                  placeholder="0,00 se não cobrado à parte"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ctr-outros">
                  Fornecimento de outros serviços neste contrato{' '}
                  <span className="text-gray-400 font-normal">(opcional)</span>
                </Label>
                <Input
                  id="ctr-outros"
                  value={contratoForm.outros_servicos}
                  onChange={(e) =>
                    setContratoForm({ ...contratoForm, outros_servicos: e.target.value })
                  }
                  placeholder="Ex: Suporte presencial 24/7, Toner reserva, Software GED"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsContratoModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingContrato}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSubmittingContrato
                  ? 'Salvando...'
                  : editingContrato
                    ? 'Salvar Alterações'
                    : 'Cadastrar Contrato'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Edição Cliente */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Informações do Cliente</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleUpdateCliente} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-tipo">Tipo</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(val: 'Pessoa Jurídica' | 'Pessoa Física') =>
                    setFormData({ ...formData, tipo: val })
                  }
                >
                  <SelectTrigger id="edit-tipo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pessoa Jurídica">Pessoa Jurídica</SelectItem>
                    <SelectItem value="Pessoa Física">Pessoa Física</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val: 'ativo' | 'inativo') =>
                    setFormData({ ...formData, status: val })
                  }
                >
                  <SelectTrigger id="edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-nome">Nome / Razão Social</Label>
              <Input
                id="edit-nome"
                value={formData.nome_razao_social}
                onChange={(e) => setFormData({ ...formData, nome_razao_social: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-doc">CNPJ ou CPF</Label>
                <Input
                  id="edit-doc"
                  value={formData.documento}
                  onChange={(e) =>
                    setFormData({ ...formData, documento: formatCnpjCpf(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-tel">Telefone</Label>
                <Input
                  id="edit-tel"
                  value={formData.telefone}
                  onChange={(e) =>
                    setFormData({ ...formData, telefone: formatPhone(e.target.value) })
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-email">E-mail</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="edit-cidade">Cidade</Label>
                <Input
                  id="edit-cidade"
                  value={formData.cidade}
                  onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-uf">UF</Label>
                <Input
                  id="edit-uf"
                  maxLength={2}
                  value={formData.uf}
                  onChange={(e) => setFormData({ ...formData, uf: e.target.value.toUpperCase() })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-endereco">Endereço</Label>
              <Input
                id="edit-endereco"
                value={formData.endereco}
                onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
              />
            </div>

            <DialogFooter className="pt-4 gap-2">
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                Salvar Alterações
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
