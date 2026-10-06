import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Package,
  Plus,
  Search,
  Filter,
  DollarSign,
  Printer,
  Calendar,
  Layers,
  ArrowUpDown,
  Trash2,
  ExternalLink,
} from 'lucide-react'
import { suprimentosService } from '@/services/suprimentos'
import { equipamentosService } from '@/services/equipamentos'
import { formatCurrency, formatDate } from '@/lib/formatters'
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
import type { Suprimento, Equipamento, TipoSuprimento } from '@/types'

export default function Suprimentos() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [suprimentos, setSuprimentos] = useState<Suprimento[]>([])
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState<string>('todos')
  const [equipFiltro, setEquipFiltro] = useState<string>('todos')

  // Modal Novo Suprimento
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    equipamento_id: '',
    data: new Date().toISOString().split('T')[0],
    tipo: 'toner' as TipoSuprimento,
    item: '',
    quantidade: 1,
    custo: 150,
    observacoes: '',
  })

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [supList, eqList] = await Promise.all([
        suprimentosService.getAll(),
        equipamentosService.getAll(),
      ])
      setSuprimentos(supList)
      setEquipamentos(eqList)
      if (eqList.length > 0 && !formData.equipamento_id) {
        setFormData((prev) => ({ ...prev, equipamento_id: eqList[0].id }))
      }
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar suprimentos',
        description: 'Não foi possível carregar a listagem.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('suprimentos', () => loadData())
  useRealtime('equipamentos', () => loadData())

  const handleOpenCreate = () => {
    setFormData({
      equipamento_id: equipamentos[0]?.id || '',
      data: new Date().toISOString().split('T')[0],
      tipo: 'toner',
      item: '',
      quantidade: 1,
      custo: 150,
      observacoes: '',
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.equipamento_id || !formData.item.trim()) {
      toast({
        variant: 'destructive',
        title: 'Campos obrigatórios',
        description: 'Selecione o equipamento e informe a descrição do item.',
      })
      return
    }

    setIsSubmitting(true)
    try {
      await suprimentosService.create({
        equipamento_id: formData.equipamento_id,
        data: new Date(formData.data).toISOString(),
        tipo: formData.tipo,
        item: formData.item,
        quantidade: Number(formData.quantidade),
        custo: Number(formData.custo),
        observacoes: formData.observacoes,
      })

      toast({
        title: 'Suprimento registrado!',
        description: 'Lançamento de suprimento adicionado ao equipamento.',
      })
      setIsModalOpen(false)
      loadData()
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao registrar suprimento',
        description: 'Tente novamente.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Deseja excluir este registro de suprimento?')) return
    try {
      await suprimentosService.delete(id)
      toast({ title: 'Suprimento excluído' })
      loadData()
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: 'Tente novamente.',
      })
    }
  }

  // Filtragem
  const filteredSuprimentos = useMemo(() => {
    return suprimentos.filter((s) => {
      const q = searchTerm.toLowerCase()
      const equip = s.expand?.equipamento_id || equipamentos.find((e) => e.id === s.equipamento_id)
      const equipText = equip
        ? `${equip.marca} ${equip.modelo} ${equip.numero_serie} ${equip.numero_patrimonio || ''}`.toLowerCase()
        : ''
      const itemText = (s.item || '').toLowerCase()

      const matchSearch =
        itemText.includes(q) ||
        equipText.includes(q) ||
        (s.observacoes || '').toLowerCase().includes(q)
      const matchTipo = tipoFiltro === 'todos' || s.tipo === tipoFiltro
      const matchEquip = equipFiltro === 'todos' || s.equipamento_id === equipFiltro

      return matchSearch && matchTipo && matchEquip
    })
  }, [suprimentos, equipamentos, searchTerm, tipoFiltro, equipFiltro])

  // KPIs
  const totalInvestido = useMemo(() => {
    return suprimentos.reduce((acc, s) => acc + (s.custo || 0) * (s.quantidade || 1), 0)
  }, [suprimentos])

  const totalItens = useMemo(() => {
    return suprimentos.reduce((acc, s) => acc + (s.quantidade || 1), 0)
  }, [suprimentos])

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-600" /> Controle de Suprimentos & Peças
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Registro de toners, cartuchos, fotocondutores e peças vinculados por impressora
          </p>
        </div>

        <Button
          onClick={handleOpenCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Registrar Suprimento
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-xs text-gray-500 font-semibold uppercase">
            Total Investido em Suprimentos
          </span>
          <p className="text-2xl font-bold text-gray-900 mt-1 font-mono">
            {formatCurrency(totalInvestido)}
          </p>
          <span className="text-[10px] text-gray-400">Total acumulado de custos</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-xs text-gray-500 font-semibold uppercase">
            Quantidade de Peças / Toners
          </span>
          <p className="text-2xl font-bold text-blue-900 mt-1 font-mono">
            {totalItens.toLocaleString('pt-BR')} itens
          </p>
          <span className="text-[10px] text-gray-400">Distribuídos no parque</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-xs text-gray-500 font-semibold uppercase">
            Equipamentos no Parque
          </span>
          <p className="text-2xl font-bold text-gray-900 mt-1">{equipamentos.length} impressoras</p>
          <span className="text-[10px] text-emerald-600 font-medium">Cadastradas no sistema</span>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar por descrição do item, modelo ou número de série..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="w-44">
          <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Tipos</SelectItem>
              <SelectItem value="toner">Toner</SelectItem>
              <SelectItem value="cartucho_tinta">Cartucho Tinta</SelectItem>
              <SelectItem value="cilindro">Cilindro</SelectItem>
              <SelectItem value="fusor">Fusor</SelectItem>
              <SelectItem value="correia">Correia</SelectItem>
              <SelectItem value="peca">Peça</SelectItem>
              <SelectItem value="outro">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-56">
          <Select value={equipFiltro} onValueChange={setEquipFiltro}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Equipamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Equipamentos</SelectItem>
              {equipamentos.map((eq) => (
                <SelectItem key={eq.id} value={eq.id}>
                  {eq.marca} {eq.modelo} ({eq.numero_serie})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabela de Suprimentos */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F9FAFB] text-gray-600 font-semibold border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">Data</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Item / Suprimento</th>
                <th className="py-3 px-4">Equipamento Vinculado</th>
                <th className="py-3 px-4 text-center">Qtd</th>
                <th className="py-3 px-4 text-right">Custo Unitário</th>
                <th className="py-3 px-4 text-right font-bold text-gray-900">Total</th>
                <th className="py-3 px-4">Observações</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-500">
                    Carregando suprimentos...
                  </td>
                </tr>
              ) : filteredSuprimentos.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-500">
                    Nenhum suprimento encontrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredSuprimentos.map((s) => {
                  const eq =
                    s.expand?.equipamento_id || equipamentos.find((e) => e.id === s.equipamento_id)
                  const total = (s.custo || 0) * (s.quantidade || 1)
                  return (
                    <tr key={s.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3 px-4 text-gray-600 font-medium">{formatDate(s.data)}</td>
                      <td className="py-3 px-4">
                        <span className="capitalize px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-700 border">
                          {s.tipo.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-gray-900">{s.item}</td>
                      <td className="py-3 px-4">
                        {eq ? (
                          <Link
                            to={`/equipamentos/${eq.id}`}
                            className="text-blue-600 hover:underline font-medium flex items-center gap-1"
                          >
                            <span>
                              {eq.marca} {eq.modelo}
                            </span>
                            <span className="text-gray-400 font-mono text-[10.5px]">
                              ({eq.numero_serie})
                            </span>
                          </Link>
                        ) : (
                          <span className="text-gray-400">Equipamento não encontrado</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-medium text-gray-800">
                        {s.quantidade}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-gray-600">
                        {formatCurrency(s.custo)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-blue-900">
                        {formatCurrency(total)}
                      </td>
                      <td className="py-3 px-4 text-gray-500 max-w-xs truncate">
                        {s.observacoes || '-'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleDelete(s.id, e)}
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Novo Suprimento */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" /> Registrar Suprimento / Peça
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2 text-xs">
            <div className="space-y-1">
              <Label htmlFor="cad-eq">Equipamento Destino *</Label>
              <Select
                value={formData.equipamento_id}
                onValueChange={(val) => setFormData({ ...formData, equipamento_id: val })}
              >
                <SelectTrigger id="cad-eq">
                  <SelectValue placeholder="Selecione o equipamento" />
                </SelectTrigger>
                <SelectContent>
                  {equipamentos.map((eq) => (
                    <SelectItem key={eq.id} value={eq.id}>
                      {eq.marca} {eq.modelo} (S/N: {eq.numero_serie}{' '}
                      {eq.numero_patrimonio ? `• Pat: ${eq.numero_patrimonio}` : ''})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="cad-data">Data de Aplicação</Label>
                <Input
                  id="cad-data"
                  type="date"
                  value={formData.data}
                  onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="cad-tipo">Tipo</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(val: any) => setFormData({ ...formData, tipo: val })}
                >
                  <SelectTrigger id="cad-tipo">
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
              <Label htmlFor="cad-item">Descrição do Item / Peça *</Label>
              <Input
                id="cad-item"
                placeholder="Ex: Toner Preto TN-3472 / Rolo Pressor"
                value={formData.item}
                onChange={(e) => setFormData({ ...formData, item: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="cad-qtd">Quantidade</Label>
                <Input
                  id="cad-qtd"
                  type="number"
                  min={1}
                  value={formData.quantidade}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      quantidade: parseInt(e.target.value, 10) || 1,
                    })
                  }
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="cad-custo">Custo Unitário (R$)</Label>
                <Input
                  id="cad-custo"
                  type="number"
                  step="0.01"
                  min={0}
                  value={formData.custo}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      custo: parseFloat(e.target.value) || 0,
                    })
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="cad-obs">Observações (Opcional)</Label>
              <Textarea
                id="cad-obs"
                rows={2}
                placeholder="Ex: Substituição em garantia, reposição preventiva..."
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              />
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSubmitting ? 'Salvando...' : 'Gravar Registro'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
