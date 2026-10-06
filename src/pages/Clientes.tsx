import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin,
  AlertCircle,
  Building,
  User as UserIcon,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { clientesService } from '@/services/clientes'
import { formatCnpjCpf, formatPhone } from '@/lib/formatters'
import { extractFieldErrors } from '@/lib/pocketbase/errors'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import type { Cliente } from '@/types'

import { useAuth } from '@/context/AuthContext'

export default function Clientes() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()
  const isOperador = user?.role === 'operador'

  const [clientes, setClientes] = useState<Cliente[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  // Modal de criação / edição
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null)
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
  const [contratoFile, setContratoFile] = useState<File | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Modal de exclusão
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [clienteToDelete, setClienteToDelete] = useState<Cliente | null>(null)

  const loadClientes = async () => {
    try {
      setIsLoading(true)
      const data = await clientesService.getAll()
      setClientes(data)
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar clientes',
        description: 'Não foi possível buscar a lista de clientes.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadClientes()
  }, [])

  useRealtime('clientes', () => {
    loadClientes()
  })

  const handleOpenCreate = () => {
    setEditingCliente(null)
    setFormData({
      nome_razao_social: '',
      tipo: 'Pessoa Jurídica',
      documento: '',
      email: '',
      telefone: '',
      cidade: '',
      uf: '',
      endereco: '',
      status: 'ativo',
    })
    setContratoFile(null)
    setFieldErrors({})
    setIsModalOpen(true)
  }

  const handleOpenEdit = (cliente: Cliente, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingCliente(cliente)
    setFormData({
      nome_razao_social: cliente.nome_razao_social,
      tipo: cliente.tipo,
      documento: cliente.documento || '',
      email: cliente.email || '',
      telefone: cliente.telefone || '',
      cidade: cliente.cidade || '',
      uf: cliente.uf || '',
      endereco: cliente.endereco || '',
      status: cliente.status,
    })
    setFieldErrors({})
    setIsModalOpen(true)
  }

  const handleOpenDelete = (cliente: Cliente, e: React.MouseEvent) => {
    e.stopPropagation()
    setClienteToDelete(cliente)
    setDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!clienteToDelete) return
    try {
      await clientesService.delete(clienteToDelete.id)
      toast({
        title: 'Cliente excluído com sucesso',
        description: `O cliente ${clienteToDelete.nome_razao_social} foi removido.`,
      })
      setDeleteConfirmOpen(false)
      setClienteToDelete(null)
      loadClientes()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Não foi possível excluir',
        description: err.message || 'Existem registros vinculados a este cliente.',
      })
      setDeleteConfirmOpen(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})

    // Validações básicas front-end
    const errors: Record<string, string> = {}
    if (!formData.nome_razao_social.trim()) {
      errors.nome_razao_social = 'Nome / Razão Social é obrigatório.'
    }
    if (formData.email && !formData.email.includes('@')) {
      errors.email = 'E-mail em formato inválido.'
    }
    if (formData.uf && formData.uf.length > 2) {
      errors.uf = 'UF deve ter no máximo 2 letras.'
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setIsSubmitting(true)
    try {
      if (editingCliente) {
        if (contratoFile) {
          const data = new FormData()
          Object.entries(formData).forEach(([k, v]) => data.append(k, v))
          data.append('contrato_digital', contratoFile)
          await clientesService.update(editingCliente.id, data)
        } else {
          await clientesService.update(editingCliente.id, formData)
        }
        toast({
          title: 'Cliente atualizado',
          description: 'Dados cadastrais salvos com sucesso.',
        })
      } else {
        if (contratoFile) {
          const data = new FormData()
          Object.entries(formData).forEach(([k, v]) => data.append(k, v))
          data.append('contrato_digital', contratoFile)
          await pb.collection('clientes').create(data)
        } else {
          await clientesService.create(formData)
        }
        toast({
          title: 'Cliente cadastrado',
          description: 'Novo cliente registrado no sistema.',
        })
      }
      setIsModalOpen(false)
      setContratoFile(null)
      loadClientes()
    } catch (err) {
      const extracted = extractFieldErrors(err)
      if (Object.keys(extracted).length > 0) {
        setFieldErrors(extracted)
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro ao salvar cliente',
          description: 'Verifique as informações inseridas e tente novamente.',
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filtragem
  const filteredClientes = clientes.filter((c) => {
    const q = searchTerm.toLowerCase()
    return (
      c.nome_razao_social.toLowerCase().includes(q) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.documento && c.documento.toLowerCase().includes(q)) ||
      (c.cidade && c.cidade.toLowerCase().includes(q))
    )
  })

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Clientes</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Gerenciamento de contratos, faturamento e dados de contato das empresas
          </p>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Novo Cliente
        </Button>
      </div>

      {/* Barra de busca */}
      <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar por nome, e-mail, CNPJ/CPF ou cidade..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 text-sm border-gray-200"
          />
        </div>
        <div className="text-xs text-gray-500 pr-2 hidden sm:block">
          Total: <strong>{filteredClientes.length}</strong> clientes
        </div>
      </div>

      {/* Tabela de clientes */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F9FAFB] text-gray-600 font-semibold text-xs border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">Nome / Razão Social</th>
                <th className="py-3 px-4">Documento</th>
                <th className="py-3 px-4">Contato</th>
                <th className="py-3 px-4">Cidade / UF</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500 text-sm">
                    Carregando clientes...
                  </td>
                </tr>
              ) : filteredClientes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500 text-sm">
                    Nenhum cliente encontrado.
                  </td>
                </tr>
              ) : (
                filteredClientes.map((cliente) => (
                  <tr
                    key={cliente.id}
                    onClick={() => navigate(`/clientes/${cliente.id}`)}
                    className="hover:bg-gray-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4 font-semibold text-gray-900">
                      <div className="flex items-center gap-2">
                        {cliente.tipo === 'Pessoa Jurídica' ? (
                          <Building className="w-4 h-4 text-gray-400 shrink-0" />
                        ) : (
                          <UserIcon className="w-4 h-4 text-gray-400 shrink-0" />
                        )}
                        <span className="hover:text-blue-600">{cliente.nome_razao_social}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-gray-600 text-xs font-mono">
                      {cliente.documento || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-gray-600 text-xs">
                      <div>{cliente.email || '-'}</div>
                      <div className="text-gray-400">{cliente.telefone || ''}</div>
                    </td>
                    <td className="py-3.5 px-4 text-gray-600 text-xs">
                      {cliente.cidade
                        ? `${cliente.cidade}${cliente.uf ? `/${cliente.uf}` : ''}`
                        : '-'}
                    </td>
                    <td className="py-3.5 px-4">
                      {cliente.status === 'ativo' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Ativo
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                          Inativo
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleOpenEdit(cliente, e)}
                          className="h-8 w-8 p-0 text-gray-500 hover:text-blue-600"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        {!isOperador && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleOpenDelete(cliente, e)}
                            className="h-8 w-8 p-0 text-gray-500 hover:text-red-600"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Modal Cadastro/Edição */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCliente ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="tipo">Tipo de Pessoa</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(val: 'Pessoa Jurídica' | 'Pessoa Física') =>
                    setFormData({ ...formData, tipo: val })
                  }
                >
                  <SelectTrigger id="tipo" className="h-10 text-sm">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pessoa Jurídica">Pessoa Jurídica</SelectItem>
                    <SelectItem value="Pessoa Física">Pessoa Física</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val: 'ativo' | 'inativo') =>
                    setFormData({ ...formData, status: val })
                  }
                >
                  <SelectTrigger id="status" className="h-10 text-sm">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nome">
                Nome / Razão Social <span className="text-red-500">*</span>
              </Label>
              <Input
                id="nome"
                value={formData.nome_razao_social}
                onChange={(e) => setFormData({ ...formData, nome_razao_social: e.target.value })}
                placeholder="Ex.: Escritório Alfa Contabilidade LTDA"
                className={
                  fieldErrors.nome_razao_social ? 'border-red-500 focus-visible:ring-red-500' : ''
                }
              />
              {fieldErrors.nome_razao_social && (
                <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {fieldErrors.nome_razao_social}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="documento">CNPJ ou CPF</Label>
                <Input
                  id="documento"
                  value={formData.documento}
                  onChange={(e) =>
                    setFormData({ ...formData, documento: formatCnpjCpf(e.target.value) })
                  }
                  placeholder="00.000.000/0000-00"
                  className={fieldErrors.documento ? 'border-red-500' : ''}
                />
                {fieldErrors.documento && (
                  <p className="text-xs text-red-600">{fieldErrors.documento}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={formData.telefone}
                  onChange={(e) =>
                    setFormData({ ...formData, telefone: formatPhone(e.target.value) })
                  }
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail de Contato</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="contato@empresa.com.br"
                className={fieldErrors.email ? 'border-red-500' : ''}
              />
              {fieldErrors.email && (
                <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {fieldErrors.email}
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="cidade">Cidade</Label>
                <Input
                  id="cidade"
                  value={formData.cidade}
                  onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                  placeholder="São Paulo"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="uf">UF</Label>
                <Input
                  id="uf"
                  maxLength={2}
                  value={formData.uf}
                  onChange={(e) => setFormData({ ...formData, uf: e.target.value.toUpperCase() })}
                  placeholder="SP"
                  className={fieldErrors.uf ? 'border-red-500' : ''}
                />
                {fieldErrors.uf && <p className="text-xs text-red-600">{fieldErrors.uf}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="endereco">Endereço Completo</Label>
              <Input
                id="endereco"
                value={formData.endereco}
                onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                placeholder="Rua, número, complemento, bairro"
              />
            </div>

            <div className="space-y-1.5 p-3 rounded-lg border border-gray-200 bg-gray-50">
              <Label htmlFor="contrato" className="text-xs font-semibold text-gray-700 block">
                Contrato Escaneado e Assinado (Opcional - PDF ou Imagem)
              </Label>
              <Input
                id="contrato"
                type="file"
                accept=".pdf,image/png,image/jpeg,image/webp"
                onChange={(e) => setContratoFile(e.target.files?.[0] || null)}
                className="text-xs bg-white"
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
                {isSubmitting ? 'Salvando...' : 'Salvar Cliente'}
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
              <AlertCircle className="w-5 h-5" /> Excluir Cliente
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm text-gray-600 space-y-2">
            <p>
              Tem certeza que deseja excluir o cliente{' '}
              <strong>{clienteToDelete?.nome_razao_social}</strong>?
            </p>
            <p className="text-xs text-red-500 bg-red-50 p-2.5 rounded-lg border border-red-200">
              Esta ação não pode ser desfeita. Se existirem contratos, equipamentos locados ou
              faturas atreladas, a exclusão será impedida para garantir integridade.
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
