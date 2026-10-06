import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Printer,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  SlidersHorizontal,
  Building,
  Calendar,
  Layers,
  AlertCircle,
  FileCheck2,
} from 'lucide-react'
import { equipamentosService } from '@/services/equipamentos'
import { clientesService } from '@/services/clientes'
import { contratosService } from '@/services/contratos'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { extractFieldErrors } from '@/lib/pocketbase/errors'
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
import type { Equipamento, Cliente } from '@/types'

export default function Equipamentos() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMarca, setSelectedMarca] = useState<string>('todas')
  const [selectedStatus, setSelectedStatus] = useState<string>('todos')

  // Modal Cadastro / Edição Equipamento
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEquipamento, setEditingEquipamento] = useState<Equipamento | null>(null)
  const [formData, setFormData] = useState({
    marca: '',
    modelo: '',
    numero_serie: '',
    numero_patrimonio: '',
    contador_monocromatico: 0,
    contador_colorido: 0,
    data_aquisicao: '',
    status: 'disponivel' as 'disponivel' | 'locado' | 'em_manutencao' | 'inativo',
  })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Modal Vincular Contrato Rápido
  const [isVincularModalOpen, setIsVincularModalOpen] = useState(false)
  const [selectedEquipamentoForContrato, setSelectedEquipamentoForContrato] =
    useState<Equipamento | null>(null)
  const [contratoForm, setContratoForm] = useState({
    cliente_id: '',
    data_inicio: new Date().toISOString().split('T')[0],
    data_fim: '',
    valor_mensal: 450,
    paginas_contratadas_mensais: 1000,
    valor_pagina_excedente: 0.08,
  })

  // Modal Exclusão
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [equipamentoToDelete, setEquipamentoToDelete] = useState<Equipamento | null>(null)

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [eqList, clList] = await Promise.all([
        equipamentosService.getAll(),
        clientesService.getAll('status = "ativo"'),
      ])
      setEquipamentos(eqList)
      setClientes(clList)
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar equipamentos',
        description: 'Não foi possível carregar a listagem.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('equipamentos', () => loadData())
  useRealtime('contratos', () => loadData())

  // Obter lista única de marcas para o filtro
  const marcasDisponiveis = Array.from(new Set(equipamentos.map((e) => e.marca))).filter(Boolean)

  const handleOpenCreate = () => {
    setEditingEquipamento(null)
    setFormData({
      marca: '',
      modelo: '',
      numero_serie: '',
      numero_patrimonio: '',
      contador_monocromatico: 0,
      contador_colorido: 0,
      data_aquisicao: new Date().toISOString().split('T')[0],
      status: 'disponivel',
    })
    setFieldErrors({})
    setIsModalOpen(true)
  }

  const handleOpenEdit = (eq: Equipamento, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingEquipamento(eq)
    setFormData({
      marca: eq.marca,
      modelo: eq.modelo,
      numero_serie: eq.numero_serie,
      numero_patrimonio: eq.numero_patrimonio || '',
      contador_monocromatico: eq.contador_monocromatico || 0,
      contador_colorido: eq.contador_colorido || 0,
      data_aquisicao: eq.data_aquisicao ? eq.data_aquisicao.split('T')[0] : '',
      status: eq.status,
    })
    setFieldErrors({})
    setIsModalOpen(true)
  }

  const handleOpenDelete = (eq: Equipamento, e: React.MouseEvent) => {
    e.stopPropagation()
    setEquipamentoToDelete(eq)
    setDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!equipamentoToDelete) return
    try {
      await equipamentosService.delete(equipamentoToDelete.id)
      toast({
        title: 'Equipamento excluído',
        description: 'O equipamento foi removido do sistema.',
      })
      setDeleteConfirmOpen(false)
      setEquipamentoToDelete(null)
      loadData()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Não foi possível excluir',
        description: err.message || 'Existem contratos vinculados a este equipamento.',
      })
      setDeleteConfirmOpen(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})

    const errors: Record<string, string> = {}
    if (!formData.marca.trim()) errors.marca = 'Marca é obrigatória.'
    if (!formData.modelo.trim()) errors.modelo = 'Modelo é obrigatório.'
    if (!formData.numero_serie.trim()) errors.numero_serie = 'Número de série é obrigatório.'

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setIsSubmitting(true)
    try {
      if (editingEquipamento) {
        await equipamentosService.update(editingEquipamento.id, formData)
        toast({
          title: 'Equipamento atualizado',
          description: 'Dados salvos com sucesso.',
        })
      } else {
        await equipamentosService.create(formData)
        toast({
          title: 'Equipamento cadastrado',
          description: 'Novo equipamento adicionado ao estoque.',
        })
      }
      setIsModalOpen(false)
      loadData()
    } catch (err) {
      const extracted = extractFieldErrors(err)
      if (Object.keys(extracted).length > 0) {
        setFieldErrors(extracted)
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro ao salvar equipamento',
          description: 'Verifique se o número de série já não está cadastrado.',
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Vincular contrato
  const handleOpenVincularContrato = (eq: Equipamento, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedEquipamentoForContrato(eq)
    setContratoForm({
      cliente_id: clientes[0]?.id || '',
      data_inicio: new Date().toISOString().split('T')[0],
      data_fim: '',
      valor_mensal: 450,
      paginas_contratadas_mensais: 1000,
      valor_pagina_excedente: 0.08,
    })
    setIsVincularModalOpen(true)
  }

  const handleSubmitContrato = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEquipamentoForContrato || !contratoForm.cliente_id) {
      toast({
        variant: 'destructive',
        title: 'Selecione um cliente',
        description: 'É necessário selecionar um cliente para vincular o contrato.',
      })
      return
    }

    try {
      await contratosService.create({
        cliente_id: contratoForm.cliente_id,
        equipamento_id: selectedEquipamentoForContrato.id,
        data_inicio: new Date(contratoForm.data_inicio).toISOString(),
        data_fim: contratoForm.data_fim ? new Date(contratoForm.data_fim).toISOString() : undefined,
        valor_mensal: Number(contratoForm.valor_mensal),
        paginas_contratadas_mensais: Number(contratoForm.paginas_contratadas_mensais),
        valor_pagina_excedente: Number(contratoForm.valor_pagina_excedente),
        status: 'ativo',
      })

      toast({
        title: 'Contrato vinculado!',
        description: 'O equipamento foi alocado e seu status atualizado para "Locado".',
      })
      setIsVincularModalOpen(false)
      loadData()
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar contrato',
        description: 'Verifique as informações preenchidas.',
      })
    }
  }

  // Filtragem
  const filteredEquipamentos = equipamentos.filter((eq) => {
    const q = searchTerm.toLowerCase()
    const matchesSearch =
      eq.modelo.toLowerCase().includes(q) ||
      eq.marca.toLowerCase().includes(q) ||
      eq.numero_serie.toLowerCase().includes(q) ||
      (eq.numero_patrimonio && eq.numero_patrimonio.toLowerCase().includes(q))

    const matchesMarca = selectedMarca === 'todas' || eq.marca === selectedMarca
    const matchesStatus = selectedStatus === 'todos' || eq.status === selectedStatus

    return matchesSearch && matchesMarca && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'disponivel':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Disponível
          </span>
        )
      case 'locado':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            Locado
          </span>
        )
      case 'em_manutencao':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Em Manutenção
          </span>
        )
      case 'inativo':
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
            Inativo
          </span>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Equipamentos</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Gestão do parque de impressoras, números de série e contadores de páginas
          </p>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Novo Equipamento
        </Button>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar por modelo, marca, número de série ou patrimônio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 text-sm border-gray-200"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="w-40">
            <Select value={selectedMarca} onValueChange={setSelectedMarca}>
              <SelectTrigger className="h-10 text-xs sm:text-sm">
                <SelectValue placeholder="Marca" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as Marcas</SelectItem>
                {marcasDisponiveis.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-44">
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="h-10 text-xs sm:text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Status</SelectItem>
                <SelectItem value="disponivel">Disponível</SelectItem>
                <SelectItem value="locado">Locado</SelectItem>
                <SelectItem value="em_manutencao">Em Manutenção</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Grade de Cards (3 por linha no desktop, 1 no mobile) */}
      {isLoading ? (
        <div className="py-12 text-center text-sm text-gray-500">Carregando equipamentos...</div>
      ) : filteredEquipamentos.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-sm text-gray-500 shadow-xs">
          Nenhum equipamento encontrado com os filtros aplicados.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEquipamentos.map((eq) => {
            const clienteAtual = eq.expand?.contrato_atual?.expand?.cliente_id
            return (
              <Card
                key={eq.id}
                onClick={() => navigate(`/equipamentos/${eq.id}`)}
                className="hover:-translate-y-0.5 hover:shadow-md transition-all duration-150 cursor-pointer border border-gray-200 overflow-hidden flex flex-col justify-between"
              >
                <div>
                  {/* Top Header Card */}
                  <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                        <Printer className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                          {eq.marca}
                        </span>
                        <h2 className="text-base font-bold text-gray-900 leading-tight">
                          {eq.modelo}
                        </h2>
                      </div>
                    </div>
                    {getStatusBadge(eq.status)}
                  </div>

                  {/* Card Body */}
                  <div className="p-4 space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-gray-400 block font-medium">Nº de Série:</span>
                        <span className="font-mono text-gray-800 font-semibold truncate block">
                          {eq.numero_serie}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 block font-medium">Patrimônio:</span>
                        <span className="font-mono text-blue-700 font-semibold truncate block">
                          {eq.numero_patrimonio || '-'}
                        </span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100 flex items-center gap-2">
                      <Building className="w-4 h-4 text-gray-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] text-gray-400 block uppercase font-medium">
                          Locatário Atual
                        </span>
                        <p className="font-semibold text-gray-800 truncate">
                          {clienteAtual?.nome_razao_social || (
                            <span className="text-emerald-600 font-medium">
                              Equipamento Disponível
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Contadores */}
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-100">
                      <div className="bg-gray-50/80 p-2 rounded-md">
                        <span className="text-[10px] text-gray-500 uppercase font-medium">
                          Contador Mono
                        </span>
                        <p className="text-sm font-bold text-gray-900 mt-0.5">
                          {(eq.contador_monocromatico || 0).toLocaleString('pt-BR')}
                        </p>
                      </div>
                      <div className="bg-gray-50/80 p-2 rounded-md">
                        <span className="text-[10px] text-gray-500 uppercase font-medium">
                          Contador Color
                        </span>
                        <p className="text-sm font-bold text-gray-900 mt-0.5">
                          {(eq.contador_colorido || 0).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="p-3 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between gap-1">
                  {eq.status === 'disponivel' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => handleOpenVincularContrato(eq, e)}
                      className="text-xs text-blue-700 bg-blue-50/50 hover:bg-blue-100/70 border-blue-200 h-8"
                    >
                      Vincular Contrato
                    </Button>
                  )}
                  <div className="flex items-center gap-1 ml-auto">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/equipamentos/${eq.id}`)
                      }}
                      className="h-8 w-8 p-0 text-gray-500 hover:text-blue-600"
                      title="Visualizar detalhes"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleOpenEdit(eq, e)}
                      className="h-8 w-8 p-0 text-gray-500 hover:text-blue-600"
                      title="Editar"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleOpenDelete(eq, e)}
                      className="h-8 w-8 p-0 text-gray-500 hover:text-red-600"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal Cadastro/Edição de Equipamento */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingEquipamento ? 'Editar Equipamento' : 'Novo Equipamento'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="marca">
                  Marca <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="marca"
                  value={formData.marca}
                  onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                  placeholder="Ex.: HP, Epson, Xerox, Brother"
                  className={fieldErrors.marca ? 'border-red-500' : ''}
                />
                {fieldErrors.marca && <p className="text-xs text-red-600">{fieldErrors.marca}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="modelo">
                  Modelo <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="modelo"
                  value={formData.modelo}
                  onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                  placeholder="Ex.: LaserJet Pro M404"
                  className={fieldErrors.modelo ? 'border-red-500' : ''}
                />
                {fieldErrors.modelo && <p className="text-xs text-red-600">{fieldErrors.modelo}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="serie">
                  Número de Série <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="serie"
                  value={formData.numero_serie}
                  onChange={(e) => setFormData({ ...formData, numero_serie: e.target.value })}
                  placeholder="Ex.: HP-M404-98421"
                  className={fieldErrors.numero_serie ? 'border-red-500' : ''}
                />
                {fieldErrors.numero_serie && (
                  <p className="text-xs text-red-600">{fieldErrors.numero_serie}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="patrimonio">Número de Patrimônio</Label>
                <Input
                  id="patrimonio"
                  value={formData.numero_patrimonio}
                  onChange={(e) => setFormData({ ...formData, numero_patrimonio: e.target.value })}
                  placeholder="Ex.: PAT-00123"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="status">Status Operacional</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val: any) => setFormData({ ...formData, status: val })}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disponivel">Disponível</SelectItem>
                    <SelectItem value="locado">Locado</SelectItem>
                    <SelectItem value="em_manutencao">Em Manutenção</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="mono">Contador Monocromático</Label>
                <Input
                  id="mono"
                  type="number"
                  min={0}
                  value={formData.contador_monocromatico}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      contador_monocromatico: parseInt(e.target.value, 10) || 0,
                    })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="color">Contador Colorido</Label>
                <Input
                  id="color"
                  type="number"
                  min={0}
                  value={formData.contador_colorido}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      contador_colorido: parseInt(e.target.value, 10) || 0,
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="data_aq">Data de Aquisição</Label>
              <Input
                id="data_aq"
                type="date"
                value={formData.data_aquisicao}
                onChange={(e) => setFormData({ ...formData, data_aquisicao: e.target.value })}
              />
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
                {isSubmitting ? 'Salvando...' : 'Salvar Equipamento'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Vincular Contrato */}
      <Dialog open={isVincularModalOpen} onOpenChange={setIsVincularModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-blue-600" /> Vincular Contrato de Locação
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmitContrato} className="space-y-4 pt-2">
            <div className="p-3 bg-blue-50/60 rounded-lg text-xs border border-blue-100">
              <span className="font-semibold text-blue-900 block">Equipamento Selecionado:</span>
              <p className="text-blue-800">
                {selectedEquipamentoForContrato?.marca} {selectedEquipamentoForContrato?.modelo}{' '}
                (S/N: {selectedEquipamentoForContrato?.numero_serie})
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cliente_cont">Cliente Locatário</Label>
              <Select
                value={contratoForm.cliente_id}
                onValueChange={(val) => setContratoForm({ ...contratoForm, cliente_id: val })}
              >
                <SelectTrigger id="cliente_cont">
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
                <Label htmlFor="dt_ini">Início do Contrato</Label>
                <Input
                  id="dt_ini"
                  type="date"
                  value={contratoForm.data_inicio}
                  onChange={(e) =>
                    setContratoForm({ ...contratoForm, data_inicio: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dt_fim">Término Previsto</Label>
                <Input
                  id="dt_fim"
                  type="date"
                  value={contratoForm.data_fim}
                  onChange={(e) => setContratoForm({ ...contratoForm, data_fim: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="v_mensal">Valor Mensal (R$)</Label>
                <Input
                  id="v_mensal"
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
                <Label htmlFor="p_franquia">Franquia Págs</Label>
                <Input
                  id="p_franquia"
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
                <Label htmlFor="v_exc">Excedente (R$)</Label>
                <Input
                  id="v_exc"
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
                Vincular e Ativar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmação Exclusão */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" /> Excluir Equipamento
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm text-gray-600 space-y-2">
            <p>
              Tem certeza que deseja excluir o equipamento{' '}
              <strong>
                {equipamentoToDelete?.marca} {equipamentoToDelete?.modelo} (S/N:{' '}
                {equipamentoToDelete?.numero_serie})
              </strong>
              ?
            </p>
            <p className="text-xs text-red-500 bg-red-50 p-2.5 rounded-lg border border-red-200">
              Esta ação não pode ser desfeita. Se o equipamento estiver alocado em algum contrato, a
              exclusão será bloqueada.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Confirmar Exclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
