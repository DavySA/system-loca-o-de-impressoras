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
import { ordensServicoService } from '@/services/ordensServico'
import { faturasService } from '@/services/faturas'
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
  const [isLoading, setIsLoading] = useState(true)

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
      const [cData, contData, osData, fatData] = await Promise.all([
        clientesService.getById(id),
        contratosService.getByCliente(id),
        ordensServicoService.getByCliente(id),
        faturasService.getByCliente(id),
      ])
      setCliente(cData)
      setContratos(contData)
      setOrdens(osData)
      setFaturas(fatData)

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
                variant="outline"
                onClick={() => navigate('/equipamentos')}
                className="text-xs"
              >
                + Alocar Equipamento
              </Button>
            </CardHeader>
            <CardContent>
              {contratos.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-500">
                  Nenhum equipamento alocado para este cliente.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-[#F9FAFB] text-gray-600 font-semibold border-b border-gray-200">
                      <tr>
                        <th className="py-2.5 px-3">Modelo / Marca</th>
                        <th className="py-2.5 px-3">Nº de Série</th>
                        <th className="py-2.5 px-3">Vigência</th>
                        <th className="py-2.5 px-3">Valor Mensal</th>
                        <th className="py-2.5 px-3">Franquia Mensal</th>
                        <th className="py-2.5 px-3">Excedente (pág)</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Ver</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {contratos.map((c) => {
                        const eq = c.expand?.equipamento_id
                        return (
                          <tr key={c.id} className="hover:bg-gray-50/80">
                            <td className="py-3 px-3 font-medium text-gray-900">
                              {eq ? `${eq.marca} ${eq.modelo}` : 'Equipamento'}
                            </td>
                            <td className="py-3 px-3 font-mono text-xs text-gray-600">
                              {eq?.numero_serie || '-'}
                            </td>
                            <td className="py-3 px-3 text-xs text-gray-600">
                              {formatDate(c.data_inicio)} até{' '}
                              {c.data_fim ? formatDate(c.data_fim) : 'Indeterminado'}
                            </td>
                            <td className="py-3 px-3 font-semibold text-gray-900">
                              {formatCurrency(c.valor_mensal)}
                            </td>
                            <td className="py-3 px-3 text-gray-600">
                              {c.paginas_contratadas_mensais.toLocaleString('pt-BR')} págs
                            </td>
                            <td className="py-3 px-3 text-gray-600">
                              {formatCurrency(c.valor_pagina_excedente)}
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
                              {eq && (
                                <Link
                                  to={`/equipamentos/${eq.id}`}
                                  className="text-blue-600 hover:text-blue-800 text-xs font-semibold inline-flex items-center gap-1"
                                >
                                  Equipamento <ExternalLink className="w-3 h-3" />
                                </Link>
                              )}
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
