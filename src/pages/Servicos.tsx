import React, { useState, useEffect } from 'react'
import {
  Wrench,
  Plus,
  Edit,
  Trash2,
  Clock,
  CheckCircle,
  Tag,
  AlertCircle,
  Layers,
  Settings,
} from 'lucide-react'
import { servicosService } from '@/services/servicos'
import { formatCurrency } from '@/lib/formatters'
import { extractFieldErrors } from '@/lib/pocketbase/errors'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import type { Servico } from '@/types'

export default function Servicos() {
  const { toast } = useToast()

  const [servicos, setServicos] = useState<Servico[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Modal Cadastro/Edição
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingServico, setEditingServico] = useState<Servico | null>(null)
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    categoria: 'Manutenção Preventiva' as
      | 'Manutenção Preventiva'
      | 'Manutenção Corretiva'
      | 'Instalação'
      | 'Suprimentos'
      | 'Visita Técnica',
    preco: 150,
    duracao_estimada: '1 hora',
  })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Modal Exclusão
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [servicoToDelete, setServicoToDelete] = useState<Servico | null>(null)

  const loadServicos = async () => {
    try {
      setIsLoading(true)
      const data = await servicosService.getAll()
      setServicos(data)
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar serviços',
        description: 'Não foi possível buscar o catálogo.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadServicos()
  }, [])

  useRealtime('servicos', () => loadServicos())

  const handleOpenCreate = () => {
    setEditingServico(null)
    setFormData({
      nome: '',
      descricao: '',
      categoria: 'Manutenção Preventiva',
      preco: 150,
      duracao_estimada: '1 hora',
    })
    setFieldErrors({})
    setIsModalOpen(true)
  }

  const handleOpenEdit = (servico: Servico) => {
    setEditingServico(servico)
    setFormData({
      nome: servico.nome,
      descricao: servico.descricao || '',
      categoria: servico.categoria,
      preco: servico.preco || 0,
      duracao_estimada: servico.duracao_estimada || '',
    })
    setFieldErrors({})
    setIsModalOpen(true)
  }

  const handleOpenDelete = (servico: Servico) => {
    setServicoToDelete(servico)
    setDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!servicoToDelete) return
    try {
      await servicosService.delete(servicoToDelete.id)
      toast({
        title: 'Serviço excluído',
        description: 'O item foi removido do catálogo.',
      })
      setDeleteConfirmOpen(false)
      setServicoToDelete(null)
      loadServicos()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Não foi possível excluir',
        description: err.message || 'Existem ordens de serviço vinculadas a este serviço.',
      })
      setDeleteConfirmOpen(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})

    const errors: Record<string, string> = {}
    if (!formData.nome.trim()) errors.nome = 'Nome do serviço é obrigatório.'

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setIsSubmitting(true)
    try {
      if (editingServico) {
        await servicosService.update(editingServico.id, {
          ...formData,
          preco: Number(formData.preco),
        })
        toast({
          title: 'Serviço atualizado',
          description: 'Alterações gravadas no catálogo.',
        })
      } else {
        await servicosService.create({
          ...formData,
          preco: Number(formData.preco),
        })
        toast({
          title: 'Serviço cadastrado',
          description: 'Novo serviço adicionado ao catálogo.',
        })
      }
      setIsModalOpen(false)
      loadServicos()
    } catch (err) {
      const extracted = extractFieldErrors(err)
      if (Object.keys(extracted).length > 0) {
        setFieldErrors(extracted)
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro ao salvar serviço',
          description: 'Verifique as informações preenchidas.',
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const getCategoriaBadge = (cat: string) => {
    switch (cat) {
      case 'Manutenção Preventiva':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'Manutenção Corretiva':
        return 'bg-amber-50 text-amber-700 border-amber-200'
      case 'Instalação':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'Suprimentos':
        return 'bg-purple-50 text-purple-700 border-purple-200'
      case 'Visita Técnica':
      default:
        return 'bg-indigo-50 text-indigo-700 border-indigo-200'
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Catálogo de Serviços</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Tabela de preços, manutenções padronizadas e tempos estimados de atendimento
          </p>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Novo Serviço
        </Button>
      </div>

      {/* Grid de Cards de Serviços */}
      {isLoading ? (
        <div className="py-12 text-center text-sm text-gray-500">
          Carregando catálogo de serviços...
        </div>
      ) : servicos.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-sm text-gray-500">
          Nenhum serviço cadastrado no catálogo.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {servicos.map((servico) => (
            <Card
              key={servico.id}
              className="border border-gray-200 shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all duration-150 flex flex-col justify-between"
            >
              <div>
                {/* Header Card */}
                <div className="p-4 border-b border-gray-100 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                      <Wrench className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900 leading-tight">
                        {servico.nome}
                      </h3>
                      <span
                        className={`inline-block mt-1 px-2 py-0.2 rounded-full text-[11px] font-semibold border ${getCategoriaBadge(
                          servico.categoria,
                        )}`}
                      >
                        {servico.categoria}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Body Card */}
                <div className="p-4 space-y-3">
                  <p className="text-xs text-gray-600 min-h-[3rem] line-clamp-3 leading-relaxed">
                    {servico.descricao || 'Sem descrição cadastrada para este serviço técnico.'}
                  </p>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1 text-gray-500">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span>{servico.duracao_estimada || 'Não informada'}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-gray-400 uppercase block font-semibold">
                        Preço Base
                      </span>
                      <span className="text-lg font-bold text-gray-900">
                        {formatCurrency(servico.preco)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-3 bg-gray-50/60 border-t border-gray-100 flex items-center justify-end gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenEdit(servico)}
                  className="h-8 w-8 p-0 text-gray-500 hover:text-blue-600"
                  title="Editar"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenDelete(servico)}
                  className="h-8 w-8 p-0 text-gray-500 hover:text-red-600"
                  title="Excluir"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Cadastro/Edição de Serviço */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingServico ? 'Editar Serviço' : 'Novo Serviço no Catálogo'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="serv-nome">
                Nome do Serviço <span className="text-red-500">*</span>
              </Label>
              <Input
                id="serv-nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex.: Troca de Cilindro"
                className={fieldErrors.nome ? 'border-red-500' : ''}
              />
              {fieldErrors.nome && <p className="text-xs text-red-600">{fieldErrors.nome}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="serv-cat">Categoria</Label>
              <Select
                value={formData.categoria}
                onValueChange={(val: any) => setFormData({ ...formData, categoria: val })}
              >
                <SelectTrigger id="serv-cat">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Manutenção Preventiva">Manutenção Preventiva</SelectItem>
                  <SelectItem value="Manutenção Corretiva">Manutenção Corretiva</SelectItem>
                  <SelectItem value="Instalação">Instalação</SelectItem>
                  <SelectItem value="Suprimentos">Suprimentos</SelectItem>
                  <SelectItem value="Visita Técnica">Visita Técnica</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="serv-desc">Descrição do Procedimento</Label>
              <Textarea
                id="serv-desc"
                rows={3}
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Detalhes técnicos sobre as peças inclusas, mão de obra..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="serv-preco">Preço Padrão (R$)</Label>
                <Input
                  id="serv-preco"
                  type="number"
                  step="0.01"
                  value={formData.preco}
                  onChange={(e) =>
                    setFormData({ ...formData, preco: parseFloat(e.target.value) || 0 })
                  }
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="serv-dur">Duração Estimada</Label>
                <Input
                  id="serv-dur"
                  value={formData.duracao_estimada}
                  onChange={(e) => setFormData({ ...formData, duracao_estimada: e.target.value })}
                  placeholder="Ex.: 2 horas, 1 dia"
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
                {isSubmitting ? 'Salvando...' : 'Salvar Serviço'}
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
              <AlertCircle className="w-5 h-5" /> Excluir Serviço
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm text-gray-600 space-y-2">
            <p>
              Tem certeza que deseja excluir o serviço <strong>{servicoToDelete?.nome}</strong>?
            </p>
            <p className="text-xs text-red-500 bg-red-50 p-2.5 rounded-lg border border-red-200">
              Esta ação não pode ser desfeita. Se o serviço já estiver registrado em ordens de
              serviço anteriores, a exclusão será bloqueada.
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
