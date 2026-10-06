import React, { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Package,
  Plus,
  Search,
  Filter,
  DollarSign,
  AlertTriangle,
  ArrowUpDown,
  Trash2,
  ExternalLink,
  Percent,
  TrendingUp,
  AlertCircle,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
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

  // Seletor do operador: exibição do lucro em % ou em R$
  const [lucroModo, setLucroModo] = useState<'percentual' | 'valor'>('percentual')

  // Modal Novo Suprimento
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    equipamento_id: '', // OPCIONAL
    data: new Date().toISOString().split('T')[0],
    tipo: 'toner' as TipoSuprimento,
    item: '',
    quantidade: 1,
    custo: 100,
    valor_venda: 150,
    estoque_minimo: 2,
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
      equipamento_id: '', // Equipamento passa a ser opcional
      data: new Date().toISOString().split('T')[0],
      tipo: 'toner',
      item: '',
      quantidade: 1,
      custo: 100,
      valor_venda: 150,
      estoque_minimo: 2,
      observacoes: '',
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.item.trim()) {
      toast({
        variant: 'destructive',
        title: 'Campo obrigatório',
        description: 'Informe a descrição do suprimento ou peça.',
      })
      return
    }

    setIsSubmitting(true)
    try {
      await suprimentosService.create({
        equipamento_id: formData.equipamento_id || undefined,
        data: new Date(formData.data).toISOString(),
        tipo: formData.tipo,
        item: formData.item,
        quantidade: Number(formData.quantidade),
        custo: Number(formData.custo),
        valor_venda: Number(formData.valor_venda) || undefined,
        estoque_minimo: Number(formData.estoque_minimo) || undefined,
        observacoes: formData.observacoes,
      })

      toast({
        title: 'Suprimento registrado!',
        description: 'Lançamento adicionado ao estoque/histórico com sucesso.',
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
        : 'estoque geral sem equipamento destino'
      const itemText = (s.item || '').toLowerCase()

      const matchSearch =
        itemText.includes(q) ||
        equipText.includes(q) ||
        (s.observacoes || '').toLowerCase().includes(q)
      const matchTipo = tipoFiltro === 'todos' || s.tipo === tipoFiltro
      const matchEquip =
        equipFiltro === 'todos' ||
        (equipFiltro === 'sem_equipamento' ? !s.equipamento_id : s.equipamento_id === equipFiltro)

      return matchSearch && matchTipo && matchEquip
    })
  }, [suprimentos, equipamentos, searchTerm, tipoFiltro, equipFiltro])

  // KPIs
  const totalInvestido = useMemo(() => {
    return suprimentos.reduce((acc, s) => acc + (s.custo || 0) * (s.quantidade || 1), 0)
  }, [suprimentos])

  const totalPotencialVenda = useMemo(() => {
    return suprimentos.reduce(
      (acc, s) => acc + (s.valor_venda || (s.custo || 0) * 1.5) * (s.quantidade || 1),
      0,
    )
  }, [suprimentos])

  const totalItens = useMemo(() => {
    return suprimentos.reduce((acc, s) => acc + (s.quantidade || 0), 0)
  }, [suprimentos])

  const itensAbaixoMinimo = useMemo(() => {
    return suprimentos.filter(
      (s) => s.estoque_minimo !== undefined && s.quantidade <= s.estoque_minimo,
    )
  }, [suprimentos])

  // Cálculo de Lucro por item com base no modo escolhido (percentual ou valor)
  const getLucroFormatado = (custo: number, valorVenda?: number) => {
    if (!valorVenda || valorVenda <= 0) {
      return { texto: 'N/D', positivo: true }
    }
    const lucroValor = valorVenda - custo
    const lucroPct = custo > 0 ? (lucroValor / custo) * 100 : 100

    if (lucroModo === 'percentual') {
      return {
        texto: `${lucroPct >= 0 ? '+' : ''}${lucroPct.toFixed(1)}%`,
        positivo: lucroValor >= 0,
      }
    } else {
      return {
        texto: `${lucroValor >= 0 ? '+' : ''}${formatCurrency(lucroValor)}`,
        positivo: lucroValor >= 0,
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-600" /> Controle de Suprimentos & Peças
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Gerenciamento de estoque, custos, preços de venda, margem de lucro e alertas de compra
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Seletor / Toggle do operador: Porcentagem ou Valor R$ */}
          <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200">
            <span className="text-xs font-semibold text-gray-600 px-2 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-blue-600" /> Lucro:
            </span>
            <button
              type="button"
              onClick={() => setLucroModo('percentual')}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors flex items-center gap-1 ${
                lucroModo === 'percentual'
                  ? 'bg-white text-blue-700 shadow-2xs font-semibold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Percent className="w-3 h-3" /> Porcentagem (%)
            </button>
            <button
              type="button"
              onClick={() => setLucroModo('valor')}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors flex items-center gap-1 ${
                lucroModo === 'valor'
                  ? 'bg-white text-blue-700 shadow-2xs font-semibold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <DollarSign className="w-3 h-3" /> Valor (R$)
            </button>
          </div>

          <Button
            onClick={handleOpenCreate}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Registrar Suprimento
          </Button>
        </div>
      </div>

      {/* Alerta de Estoque Mínimo / Alerta de Compra */}
      {itensAbaixoMinimo.length > 0 && (
        <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 flex items-start gap-3 shadow-2xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-amber-900 flex items-center gap-1.5">
              Alerta de Compra: {itensAbaixoMinimo.length} item(ns) atingiram o estoque mínimo!
            </h4>
            <p className="text-xs text-amber-800 mt-0.5">
              Recomendada a reposição imediata para evitar paralisação nos atendimentos:{' '}
              <span className="font-semibold">
                {itensAbaixoMinimo
                  .map((i) => `${i.item} (Estoque: ${i.quantidade} | Mín: ${i.estoque_minimo})`)
                  .join(' • ')}
              </span>
            </p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-xs text-gray-500 font-semibold uppercase">Total em Estoque</span>
          <p className="text-2xl font-bold text-blue-900 mt-1 font-mono">
            {totalItens.toLocaleString('pt-BR')} un.
          </p>
          <span className="text-[10px] text-gray-400">
            Distribuídos em {suprimentos.length} itens
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-xs text-gray-500 font-semibold uppercase">
            Custo Total do Estoque
          </span>
          <p className="text-2xl font-bold text-gray-900 mt-1 font-mono">
            {formatCurrency(totalInvestido)}
          </p>
          <span className="text-[10px] text-gray-400">Investimento acumulado</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-xs text-gray-500 font-semibold uppercase">Potencial de Venda</span>
          <p className="text-2xl font-bold text-emerald-700 mt-1 font-mono">
            {formatCurrency(totalPotencialVenda)}
          </p>
          <span className="text-[10px] text-emerald-600 font-medium">Preço de venda estimado</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold uppercase text-amber-700 flex items-center justify-between">
            Abaixo do Mínimo
            {itensAbaixoMinimo.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            )}
          </span>
          <p
            className={`text-2xl font-bold mt-1 font-mono ${
              itensAbaixoMinimo.length > 0 ? 'text-amber-600' : 'text-gray-900'
            }`}
          >
            {itensAbaixoMinimo.length}
          </p>
          <span className="text-[10px] text-gray-400">Itens com alerta de compra</span>
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
              <SelectItem value="sem_equipamento">Estoque Geral (Sem Destino Fixo)</SelectItem>
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
                <th className="py-3 px-4">Equipamento Destino</th>
                <th className="py-3 px-4 text-center">Estoque Atual</th>
                <th className="py-3 px-4 text-center">Est. Mínimo</th>
                <th className="py-3 px-4 text-right">Custo Un.</th>
                <th className="py-3 px-4 text-right">Valor Venda</th>
                <th className="py-3 px-4 text-right font-bold text-gray-900">
                  Lucro ({lucroModo === 'percentual' ? '%' : 'R$'})
                </th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-gray-500">
                    Carregando suprimentos...
                  </td>
                </tr>
              ) : filteredSuprimentos.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-gray-500">
                    Nenhum suprimento encontrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredSuprimentos.map((s) => {
                  const eq =
                    s.expand?.equipamento_id || equipamentos.find((e) => e.id === s.equipamento_id)
                  const isAbaixo =
                    s.estoque_minimo !== undefined && s.quantidade <= s.estoque_minimo
                  const infoLucro = getLucroFormatado(s.custo, s.valor_venda)

                  return (
                    <tr
                      key={s.id}
                      className={`hover:bg-gray-50/80 transition-colors ${
                        isAbaixo ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-gray-600 font-medium">{formatDate(s.data)}</td>
                      <td className="py-3 px-4">
                        <span className="capitalize px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-700 border">
                          {s.tipo.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-gray-900">{s.item}</div>
                        {s.observacoes && (
                          <div className="text-[10px] text-gray-400 truncate max-w-xs">
                            {s.observacoes}
                          </div>
                        )}
                      </td>
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
                          <span className="text-gray-400 italic">Estoque Geral (Livre)</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold">
                        <span
                          className={`px-2 py-0.5 rounded ${
                            isAbaixo
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'text-gray-800'
                          }`}
                        >
                          {s.quantidade}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-gray-500">
                        {s.estoque_minimo !== undefined ? s.estoque_minimo : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-gray-600">
                        {formatCurrency(s.custo)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-gray-900">
                        {s.valor_venda ? formatCurrency(s.valor_venda) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        <span className={infoLucro.positivo ? 'text-emerald-600' : 'text-red-600'}>
                          {infoLucro.texto}
                        </span>
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
            {/* Equipamento Opcional */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="cad-eq">Equipamento de Destino (Opcional)</Label>
                <span className="text-[10px] text-gray-400">Deixe em branco p/ estoque geral</span>
              </div>
              <Select
                value={formData.equipamento_id}
                onValueChange={(val) =>
                  setFormData({ ...formData, equipamento_id: val === 'nenhum' ? '' : val })
                }
              >
                <SelectTrigger id="cad-eq">
                  <SelectValue placeholder="Selecione um equipamento ou deixe livre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhum">Nenhum (Estoque Geral Livre)</SelectItem>
                  {equipamentos.map((eq) => (
                    <SelectItem key={eq.id} value={eq.id}>
                      {eq.marca} {eq.modelo} (S/N: {eq.numero_serie}
                      {eq.numero_patrimonio ? ` • Pat: ${eq.numero_patrimonio}` : ''})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="cad-data">Data de Entrada</Label>
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
                <Label htmlFor="cad-qtd">Quantidade em Estoque *</Label>
                <Input
                  id="cad-qtd"
                  type="number"
                  min={0}
                  value={formData.quantidade}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      quantidade: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="cad-min">Estoque Mínimo (Alerta de Compra)</Label>
                <Input
                  id="cad-min"
                  type="number"
                  min={0}
                  value={formData.estoque_minimo}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      estoque_minimo: parseInt(e.target.value, 10) || 0,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="cad-custo">Custo Unitário (R$) *</Label>
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

              <div className="space-y-1">
                <Label htmlFor="cad-venda">Valor de Venda (R$)</Label>
                <Input
                  id="cad-venda"
                  type="number"
                  step="0.01"
                  min={0}
                  value={formData.valor_venda}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      valor_venda: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>

            {/* Prévia do Lucro */}
            {formData.valor_venda > 0 && (
              <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-between">
                <span className="text-gray-600 font-medium">Margem de Lucro Estimada:</span>
                <span className="font-bold text-emerald-700 font-mono">
                  {formatCurrency(formData.valor_venda - formData.custo)} (
                  {formData.custo > 0
                    ? `${(((formData.valor_venda - formData.custo) / formData.custo) * 100).toFixed(1)}%`
                    : '100%'}
                  )
                </span>
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="cad-obs">Observações (Opcional)</Label>
              <Textarea
                id="cad-obs"
                rows={2}
                placeholder="Ex: Fornecedor, código original do fabricante..."
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
