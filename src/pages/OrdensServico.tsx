import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  ClipboardList,
  Plus,
  Search,
  Filter,
  Eye,
  AlertCircle,
  Clock,
  Calendar,
  User,
  Wrench,
  CheckCircle2,
} from 'lucide-react'
import { ordensServicoService } from '@/services/ordensServico'
import { clientesService } from '@/services/clientes'
import { faturasService } from '@/services/faturas'
import { equipamentosService } from '@/services/equipamentos'
import { servicosService } from '@/services/servicos'
import { contratosService } from '@/services/contratos'
import { configuracoesService } from '@/services/configuracoes'
import { OrdemServicoPrintDialog } from '@/components/OrdemServicoPrintDialog'
import { formatOSCode, formatDate, formatCurrency } from '@/lib/formatters'
import { extractFieldErrors } from '@/lib/pocketbase/errors'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import type { OrdemServico, Cliente, Equipamento, Servico } from '@/types'

export default function OrdensServico() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { toast } = useToast()

  const isClienteUser = user?.role === 'cliente'
  const clienteIdVinculado = user?.cliente_id

  const [ordens, setOrdens] = useState<OrdemServico[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([])
  const [servicos, setServicos] = useState<Servico[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Estado para impressão direta da listagem
  const [osParaImprimir, setOsParaImprimir] = useState<OrdemServico | null>(null)
  const [configEmpresa, setConfigEmpresa] = useState<any>(null)
  const [ultimosAtendimentosPrint, setUltimosAtendimentosPrint] = useState<OrdemServico[]>([])
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false)

  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('todas')
  const [prioFilter, setPrioFilter] = useState<string>('todas')

  // Modal Nova O.S.
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    cliente_id: '',
    equipamento_id: '',
    servico_id: '',
    prioridade: 'media' as 'baixa' | 'media' | 'alta',
    descricao_problema: '',
    data_agendada: '',
    tecnico_responsavel: '',
  })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Equipamentos filtrados pelo cliente escolhido
  const [availableEquipamentos, setAvailableEquipamentos] = useState<Equipamento[]>([])

  const loadData = async () => {
    try {
      setIsLoading(true)
      let osFilter = ''
      if (isClienteUser && clienteIdVinculado) {
        osFilter = `cliente_id = "${clienteIdVinculado}"`
      }

      const [osList, clList, eqList, svList, cfg] = await Promise.all([
        ordensServicoService.getAll(osFilter),
        clientesService.getAll('status = "ativo"'),
        equipamentosService.getAll(),
        servicosService.getAll(),
        configuracoesService.get(),
      ])
      setOrdens(osList)
      setClientes(clList)
      setEquipamentos(eqList)
      setServicos(svList)
      setConfigEmpresa(cfg)

      // Checar se veio com state de preselect
      const state = location.state as {
        preselectClienteId?: string
        preselectEquipamentoId?: string
      } | null
      if (state?.preselectClienteId || state?.preselectEquipamentoId) {
        setIsModalOpen(true)
        if (state.preselectClienteId) {
          setFormData((prev) => ({ ...prev, cliente_id: state.preselectClienteId! }))
        }
        if (state.preselectEquipamentoId) {
          setFormData((prev) => ({ ...prev, equipamento_id: state.preselectEquipamentoId! }))
        }
      }
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar Ordens de Serviço',
        description: 'Não foi possível buscar a listagem.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('ordens_servico', () => loadData())

  // Quando o cliente_id muda no form, filtrar equipamentos que o cliente possui ou todos disponíveis
  useEffect(() => {
    if (!formData.cliente_id) {
      setAvailableEquipamentos(equipamentos)
      return
    }
    // Filtrar equipamentos com contrato ativo deste cliente
    contratosService.getByCliente(formData.cliente_id).then((conts) => {
      const equipIds = conts.map((c) => c.equipamento_id)
      const matched = equipamentos.filter((eq) => equipIds.includes(eq.id))
      if (matched.length > 0) {
        setAvailableEquipamentos(matched)
        if (!formData.equipamento_id || !equipIds.includes(formData.equipamento_id)) {
          setFormData((prev) => ({ ...prev, equipamento_id: matched[0].id }))
        }
      } else {
        // Se o cliente não tem contrato, mostra todos os disponíveis
        setAvailableEquipamentos(equipamentos.filter((e) => e.status === 'disponivel'))
      }
    })
  }, [formData.cliente_id, equipamentos])

  const handleOpenCreate = async () => {
    // Se o usuário for cliente, verificar antes se está inadimplente
    if (isClienteUser && clienteIdVinculado) {
      try {
        const fatVencidas = await faturasService.getByCliente(clienteIdVinculado)
        const temInadimplencia = fatVencidas.some((f) => f.status === 'vencida')
        if (temInadimplencia) {
          toast({
            variant: 'destructive',
            title: 'Abertura bloqueada por inadimplência',
            description:
              'Constam faturas vencidas em aberto para o seu cadastro. Regularize o faturamento para abrir novos chamados técnicos.',
          })
          return
        }
      } catch (e) {
        console.warn('Erro ao verificar faturas:', e)
      }
    }

    setFormData({
      cliente_id: isClienteUser && clienteIdVinculado ? clienteIdVinculado : clientes[0]?.id || '',
      equipamento_id: '',
      servico_id: servicos[0]?.id || '',
      prioridade: 'media',
      descricao_problema: '',
      data_agendada: new Date().toISOString().split('T')[0],
      tecnico_responsavel: '',
    })
    setFieldErrors({})
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})

    const errors: Record<string, string> = {}
    if (!formData.cliente_id) errors.cliente_id = 'Selecione um cliente.'
    if (!formData.equipamento_id) errors.equipamento_id = 'Selecione um equipamento.'
    if (!formData.servico_id) errors.servico_id = 'Selecione o tipo de serviço.'
    if (!formData.descricao_problema.trim()) {
      errors.descricao_problema = 'Descrição do problema é obrigatória.'
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    // Validação preventiva no frontend: checar se já existe O.S. não concluída para o equipamento
    const osAbertaMesmoEquip = ordens.find(
      (os) => os.equipamento_id === formData.equipamento_id && os.status !== 'concluida',
    )
    if (osAbertaMesmoEquip) {
      toast({
        variant: 'destructive',
        title: 'Equipamento com O.S. em andamento',
        description: `Não é possível abrir nova O.S.: a ordem ${formatOSCode(
          osAbertaMesmoEquip.id,
        )} ainda não foi concluída para este equipamento.`,
      })
      return
    }

    // Se usuário for cliente, validar inadimplência novamente
    if (isClienteUser && clienteIdVinculado) {
      try {
        const faturas = await faturasService.getByCliente(clienteIdVinculado)
        if (faturas.some((f) => f.status === 'vencida')) {
          toast({
            variant: 'destructive',
            title: 'Abertura bloqueada por pendência financeira',
            description: 'Regularize as faturas em atraso para poder solicitar chamados.',
          })
          return
        }
      } catch {
        /* intentionally ignored */
      }
    }

    setIsSubmitting(true)
    try {
      const novaOS = await ordensServicoService.create(
        {
          cliente_id: formData.cliente_id,
          equipamento_id: formData.equipamento_id,
          servico_id: formData.servico_id,
          prioridade: formData.prioridade,
          descricao_problema: formData.descricao_problema,
          data_agendada: formData.data_agendada
            ? new Date(formData.data_agendada).toISOString()
            : undefined,
          tecnico_responsavel: formData.tecnico_responsavel,
          status: 'aberta',
        },
        user?.name || 'Administrador',
      )

      toast({
        title: 'Ordem de Serviço criada!',
        description: `O.S. ${formatOSCode(novaOS.id)} aberta com sucesso.`,
      })
      setIsModalOpen(false)
      loadData()
    } catch (err) {
      const extracted = extractFieldErrors(err)
      if (Object.keys(extracted).length > 0) {
        setFieldErrors(extracted)
      } else {
        toast({
          variant: 'destructive',
          title: 'Não foi possível abrir a O.S.',
          description: (err as any)?.message || 'Verifique as informações preenchidas.',
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filtragem
  const filteredOrdens = ordens.filter((os) => {
    const q = searchTerm.toLowerCase()
    const clienteNome = os.expand?.cliente_id?.nome_razao_social || ''
    const osCode = formatOSCode(os.id)

    const matchesSearch =
      clienteNome.toLowerCase().includes(q) ||
      osCode.toLowerCase().includes(q) ||
      os.id.toLowerCase().includes(q) ||
      (os.descricao_problema && os.descricao_problema.toLowerCase().includes(q))

    const matchesStatus = statusFilter === 'todas' || os.status === statusFilter
    const matchesPrio = prioFilter === 'todas' || os.prioridade === prioFilter

    return matchesSearch && matchesStatus && matchesPrio
  })

  const handleImprimirOsDaLista = async (os: OrdemServico, e: React.MouseEvent) => {
    e.stopPropagation()
    setOsParaImprimir(os)
    if (os.equipamento_id) {
      try {
        const historico = await ordensServicoService.getAll(
          `equipamento_id = "${os.equipamento_id}" && id != "${os.id}"`,
        )
        setUltimosAtendimentosPrint(historico.slice(0, 2))
      } catch {
        setUltimosAtendimentosPrint([])
      }
    } else {
      setUltimosAtendimentosPrint([])
    }
    setIsPrintDialogOpen(true)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'aberta':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            Aberta
          </span>
        )
      case 'em_andamento':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            Em Andamento
          </span>
        )
      case 'aguardando_peca':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Aguardando Peça
          </span>
        )
      case 'concluida':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Concluída
          </span>
        )
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
            {status}
          </span>
        )
    }
  }

  const getPrioBadge = (prio: string) => {
    switch (prio) {
      case 'alta':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-red-100 text-red-800">
            Alta
          </span>
        )
      case 'media':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800">
            Média
          </span>
        )
      case 'baixa':
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 text-gray-700">
            Baixa
          </span>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Ordens de Serviço</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Acompanhamento de chamados técnicos, manutenções preventivas e corretivas
          </p>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Nova Ordem de Serviço
        </Button>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar por ID (ex: OS-0001), cliente ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 text-sm border-gray-200"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="w-44">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 text-xs sm:text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todos os Status</SelectItem>
                <SelectItem value="aberta">Aberta</SelectItem>
                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                <SelectItem value="aguardando_peca">Aguardando Peça</SelectItem>
                <SelectItem value="concluida">Concluída</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-36">
            <Select value={prioFilter} onValueChange={setPrioFilter}>
              <SelectTrigger className="h-10 text-xs sm:text-sm">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="baixa">Baixa</SelectItem>
                <SelectItem value="media">Média</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Tabela de O.S. */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F9FAFB] text-gray-600 font-semibold text-xs border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">Código</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Equipamento</th>
                <th className="py-3 px-4">Serviço</th>
                <th className="py-3 px-4">Prioridade</th>
                <th className="py-3 px-4">Abertura</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-500 text-sm">
                    Carregando ordens de serviço...
                  </td>
                </tr>
              ) : filteredOrdens.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-500 text-sm">
                    Nenhuma ordem de serviço encontrada.
                  </td>
                </tr>
              ) : (
                filteredOrdens.map((os) => (
                  <tr
                    key={os.id}
                    onClick={() => navigate(`/ordens-de-servico/${os.id}`)}
                    className="hover:bg-gray-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4 font-bold text-blue-600 font-mono">
                      {formatOSCode(os.id)}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-gray-900">
                      {os.expand?.cliente_id?.nome_razao_social || 'Cliente'}
                    </td>
                    <td className="py-3.5 px-4 text-gray-700 text-xs">
                      {os.expand?.equipamento_id?.modelo || 'Equipamento'}
                    </td>
                    <td className="py-3.5 px-4 text-gray-600 text-xs max-w-xs truncate">
                      {os.expand?.servico_id?.nome || os.descricao_problema}
                    </td>
                    <td className="py-3.5 px-4">{getPrioBadge(os.prioridade)}</td>
                    <td className="py-3.5 px-4 text-gray-600 text-xs">
                      {formatDate(os.data_abertura || os.created)}
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(os.status)}</td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => handleImprimirOsDaLista(os, e)}
                          className="text-xs text-gray-700 hover:text-blue-600 hover:bg-blue-50 h-8"
                          title="Imprimir O.S."
                        >
                          Imprimir
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/ordens-de-servico/${os.id}`)
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium h-8"
                        >
                          Abrir
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nova O.S. */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Ordem de Serviço</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="os-cli">
                  Cliente <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.cliente_id}
                  onValueChange={(val) => setFormData({ ...formData, cliente_id: val })}
                >
                  <SelectTrigger
                    id="os-cli"
                    className={fieldErrors.cliente_id ? 'border-red-500' : ''}
                  >
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
                {fieldErrors.cliente_id && (
                  <p className="text-xs text-red-600">{fieldErrors.cliente_id}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="os-eq">
                  Equipamento <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.equipamento_id}
                  onValueChange={(val) => setFormData({ ...formData, equipamento_id: val })}
                >
                  <SelectTrigger
                    id="os-eq"
                    className={fieldErrors.equipamento_id ? 'border-red-500' : ''}
                  >
                    <SelectValue placeholder="Selecione o equipamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableEquipamentos.map((eq) => (
                      <SelectItem key={eq.id} value={eq.id}>
                        {eq.marca} {eq.modelo} (S/N: {eq.numero_serie})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.equipamento_id && (
                  <p className="text-xs text-red-600">{fieldErrors.equipamento_id}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="os-serv">
                  Tipo de Serviço <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.servico_id}
                  onValueChange={(val) => setFormData({ ...formData, servico_id: val })}
                >
                  <SelectTrigger
                    id="os-serv"
                    className={fieldErrors.servico_id ? 'border-red-500' : ''}
                  >
                    <SelectValue placeholder="Selecione o serviço" />
                  </SelectTrigger>
                  <SelectContent>
                    {servicos.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.nome} ({formatCurrency(s.preco)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.servico_id && (
                  <p className="text-xs text-red-600">{fieldErrors.servico_id}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="os-prio">Prioridade</Label>
                <Select
                  value={formData.prioridade}
                  onValueChange={(val: any) => setFormData({ ...formData, prioridade: val })}
                >
                  <SelectTrigger id="os-prio">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="os-desc">
                Descrição do Problema / Solicitação <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="os-desc"
                rows={3}
                placeholder="Detalhe o defeito apresentado, ruídos, mensagens no painel..."
                value={formData.descricao_problema}
                onChange={(e) => setFormData({ ...formData, descricao_problema: e.target.value })}
                className={fieldErrors.descricao_problema ? 'border-red-500' : ''}
              />
              {fieldErrors.descricao_problema && (
                <p className="text-xs text-red-600">{fieldErrors.descricao_problema}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="os-dt-ag">Data Agendada</Label>
                <Input
                  id="os-dt-ag"
                  type="date"
                  value={formData.data_agendada}
                  onChange={(e) => setFormData({ ...formData, data_agendada: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="os-tec">Técnico Responsável</Label>
                <Input
                  id="os-tec"
                  placeholder="Nome do técnico"
                  value={formData.tecnico_responsavel}
                  onChange={(e) =>
                    setFormData({ ...formData, tecnico_responsavel: e.target.value })
                  }
                />
              </div>
            </div>

            <DialogFooter className="pt-4 gap-2">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSubmitting ? 'Abrindo O.S....' : 'Abrir Ordem de Serviço'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Impressão da O.S. Selecionada na Lista */}
      <OrdemServicoPrintDialog
        open={isPrintDialogOpen}
        onOpenChange={setIsPrintDialogOpen}
        ordem={osParaImprimir}
        configEmpresa={configEmpresa}
        ultimosAtendimentos={ultimosAtendimentosPrint}
      />
    </div>
  )
}
