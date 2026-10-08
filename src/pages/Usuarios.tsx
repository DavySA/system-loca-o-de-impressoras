import React, { useState, useEffect } from 'react'
import {
  Users,
  Plus,
  Search,
  KeyRound,
  Edit,
  Trash2,
  Shield,
  Building,
  CheckCircle2,
  Mail,
  AlertCircle,
  Sliders,
  Check,
  X,
  FileCheck,
} from 'lucide-react'
import { usuariosService } from '@/services/usuarios'
import { clientesService } from '@/services/clientes'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
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
import type { AppUser, Cliente, ModuloSistema, UserRole } from '@/types'
import { TODOS_MODULOS, PRESETS_PERMISSOES, resolverPermissoesUsuario } from '@/lib/permissoes'

export default function Usuarios() {
  const { toast } = useToast()

  const [usuarios, setUsuarios] = useState<AppUser[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState<string>('todos')

  // Modal Criar / Editar Usuário
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<AppUser | null>(null)
  const [isClienteAccount, setIsClienteAccount] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    cliente_id: '',
    password: '',
    permissoes: [] as ModuloSistema[],
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Modal Reset de Senha
  const [isResetModalOpen, setIsResetModalOpen] = useState(false)
  const [userToReset, setUserToReset] = useState<AppUser | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [isResetting, setIsResetting] = useState(false)

  // Modal Exclusão
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<AppUser | null>(null)

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [uList, cList] = await Promise.all([usuariosService.getAll(), clientesService.getAll()])
      setUsuarios(uList)
      setClientes(cList)
    } catch {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar usuários',
        description: 'Não foi possível carregar a listagem de usuários.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleOpenCreate = () => {
    setEditingUser(null)
    setIsClienteAccount(false)
    // Pré-marcar funções padrão para um novo usuário operador/técnico
    setFormData({
      name: '',
      email: '',
      cliente_id: '',
      password: '',
      permissoes: [...PRESETS_PERMISSOES.operador],
    })
    setIsModalOpen(true)
  }

  const handleOpenEdit = (user: AppUser, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingUser(user)
    const isCli = user.role === 'cliente'
    setIsClienteAccount(isCli)

    const resolved = resolverPermissoesUsuario(user)
    setFormData({
      name: user.name || '',
      email: user.email,
      cliente_id: user.cliente_id || '',
      password: '',
      permissoes: isCli ? [...PRESETS_PERMISSOES.cliente] : [...resolved],
    })
    setIsModalOpen(true)
  }

  const handleToggleModulo = (modId: ModuloSistema) => {
    if (isClienteAccount) return // Conta de cliente é restrita
    setFormData((prev) => {
      const exists = prev.permissoes.includes(modId)
      if (exists) {
        return {
          ...prev,
          permissoes: prev.permissoes.filter((id) => id !== modId),
        }
      } else {
        return {
          ...prev,
          permissoes: [...prev.permissoes, modId],
        }
      }
    })
  }

  const handleSelectAllModulos = () => {
    if (isClienteAccount) return
    // Selecionar todos os módulos exceto 'meu_contrato' (específico de cliente)
    const todosExcetoCliente = TODOS_MODULOS.filter((m) => m.id !== 'meu_contrato').map((m) => m.id)
    setFormData((prev) => ({
      ...prev,
      permissoes: todosExcetoCliente,
    }))
  }

  const handleClearAllModulos = () => {
    if (isClienteAccount) return
    setFormData((prev) => ({
      ...prev,
      permissoes: [],
    }))
  }

  const handleApplyPreset = (preset: 'admin' | 'operador' | 'tecnico') => {
    if (isClienteAccount) return
    if (preset === 'admin') {
      setFormData((prev) => ({
        ...prev,
        permissoes: [...PRESETS_PERMISSOES.administrador],
      }))
    } else if (preset === 'operador') {
      setFormData((prev) => ({
        ...prev,
        permissoes: [...PRESETS_PERMISSOES.operador],
      }))
    } else if (preset === 'tecnico') {
      setFormData((prev) => ({
        ...prev,
        permissoes: [...PRESETS_PERMISSOES.tecnico],
      }))
    }
  }

  // Define o papel que será gravado no banco de acordo com as permissões marcadas
  const inferRoleFromPermissions = (isCli: boolean, perms: ModuloSistema[]): UserRole => {
    if (isCli) return 'cliente'
    const temUsuarios = perms.includes('usuarios')
    const temPersonalizar = perms.includes('personalizar')
    const temRelatorios = perms.includes('relatorios')

    // Se tiver acesso a usuários e configurações/personalização, é administrador
    if (temUsuarios && temPersonalizar) {
      return 'administrador'
    }

    // Se só tem ordens de serviço, é técnico
    if (perms.length === 1 && perms.includes('ordens_servico')) {
      return 'tecnico'
    }

    // Se tem outros módulos mas sem admin de usuários, classifica como operador
    return 'operador'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.email.trim() || !formData.name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Campos obrigatórios',
        description: 'Informe o nome e o e-mail do usuário.',
      })
      return
    }

    if (isClienteAccount && !formData.cliente_id) {
      toast({
        variant: 'destructive',
        title: 'Vínculo obrigatório',
        description: 'Selecione a empresa/cliente correspondente a esta conta.',
      })
      return
    }

    if (!isClienteAccount && formData.permissoes.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Nenhuma função marcada',
        description: 'Selecione pelo menos uma função/módulo do sistema para este usuário.',
      })
      return
    }

    const calculatedRole = inferRoleFromPermissions(isClienteAccount, formData.permissoes)
    const finalPermissoes = isClienteAccount ? PRESETS_PERMISSOES.cliente : formData.permissoes

    setIsSubmitting(true)
    try {
      if (editingUser) {
        await usuariosService.update(editingUser.id, {
          name: formData.name,
          role: calculatedRole,
          cliente_id: isClienteAccount ? formData.cliente_id : undefined,
          permissoes: finalPermissoes,
        })
        toast({
          title: 'Usuário atualizado!',
          description: 'Funções e acessos salvos com sucesso.',
        })
      } else {
        await usuariosService.create({
          name: formData.name,
          email: formData.email,
          role: calculatedRole,
          cliente_id: isClienteAccount ? formData.cliente_id : undefined,
          password: formData.password || undefined,
          permissoes: finalPermissoes,
        })
        toast({
          title: 'Usuário cadastrado com sucesso!',
          description: formData.password
            ? 'Acesso criado com a senha informada.'
            : 'Acesso criado e link de recuperação enviado por e-mail.',
        })
      }
      setIsModalOpen(false)
      loadData()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar usuário',
        description: err.message || 'Verifique se o e-mail já não está cadastrado.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenResetModal = (user: AppUser, e: React.MouseEvent) => {
    e.stopPropagation()
    setUserToReset(user)
    setNewPassword('')
    setIsResetModalOpen(true)
  }

  const handleSendResetEmail = async () => {
    if (!userToReset) return
    setIsResetting(true)
    try {
      await usuariosService.resetPasswordByEmail(userToReset.email)
      toast({
        title: 'E-mail de redefinição enviado!',
        description: `Link de redefinição enviado para ${userToReset.email}.`,
      })
      setIsResetModalOpen(false)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao enviar e-mail',
        description: err.message || 'Não foi possível disparar o e-mail de redefinição.',
      })
    } finally {
      setIsResetting(false)
    }
  }

  const handleDirectSetPassword = async () => {
    if (!userToReset || !newPassword || newPassword.length < 8) {
      toast({
        variant: 'destructive',
        title: 'Senha muito curta',
        description: 'A nova senha deve possuir no mínimo 8 caracteres.',
      })
      return
    }
    setIsResetting(true)
    try {
      await usuariosService.adminSetPassword(userToReset.id, newPassword)
      toast({
        title: 'Senha redefinida!',
        description: `Nova senha aplicada com sucesso para ${userToReset.name || userToReset.email}.`,
      })
      setIsResetModalOpen(false)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao definir senha',
        description: err.message || 'Não foi possível alterar a senha diretamente.',
      })
    } finally {
      setIsResetting(false)
    }
  }

  const handleOpenDelete = (user: AppUser, e: React.MouseEvent) => {
    e.stopPropagation()
    setUserToDelete(user)
    setDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!userToDelete) return
    try {
      await usuariosService.delete(userToDelete.id)
      toast({
        title: 'Usuário removido',
        description: 'Acesso excluído do sistema.',
      })
      setDeleteConfirmOpen(false)
      setUserToDelete(null)
      loadData()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir usuário',
        description: err.message || 'Não foi possível remover este usuário.',
      })
    }
  }

  const filteredUsuarios = usuarios.filter((u) => {
    const q = searchTerm.toLowerCase()
    const matchesSearch =
      (u.name && u.name.toLowerCase().includes(q)) ||
      u.email.toLowerCase().includes(q) ||
      (u.expand?.cliente_id?.nome_razao_social &&
        u.expand.cliente_id.nome_razao_social.toLowerCase().includes(q))

    const matchesRole = filterRole === 'todos' || u.role === filterRole
    return matchesSearch && matchesRole
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Gerenciamento de Usuários
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Cadastre novos usuários e defina exatamente quais funções e módulos cada um terá acesso
            no sistema
          </p>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Novo Usuário
        </Button>
      </div>

      {/* Cards de orientação das funções */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900">Funções Marcáveis</h4>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Defina na lista de funções exatamente o que cada usuário interno pode ver: Dashboard,
              Clientes, Equipamentos, O.S., Faturamento, Suprimentos e Gráfica.
            </p>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-amber-200 bg-amber-50/20 shadow-xs flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-amber-900">Proteção de Dados & Exclusão</h4>
            <p className="text-[11px] text-amber-800 mt-0.5">
              Usuários sem função de Administrador têm botões de exclusão ocultos e restrições
              validadas pelo servidor.
            </p>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <Building className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-emerald-900">Acesso Restrito do Cliente</h4>
            <p className="text-[11px] text-emerald-800 mt-0.5">
              O cliente continua restrito ao seu portal: abertura de chamados técnicos,
              histórico/faturamento e scanner do contrato.
            </p>
          </div>
        </div>
      </div>

      {/* Barra de Busca e Filtros */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar por nome, e-mail ou empresa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 text-sm border-gray-200"
          />
        </div>

        <div className="w-48">
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="h-10 text-xs sm:text-sm">
              <SelectValue placeholder="Tipo de Acesso" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Usuários</SelectItem>
              <SelectItem value="administrador">Administrador</SelectItem>
              <SelectItem value="operador">Operador Personalizado</SelectItem>
              <SelectItem value="tecnico">Técnico</SelectItem>
              <SelectItem value="cliente">Conta de Cliente</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabela de Usuários */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F9FAFB] text-gray-600 font-semibold text-xs border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">Nome do Usuário</th>
                <th className="py-3 px-4">E-mail de Login</th>
                <th className="py-3 px-4">Tipo / Vínculo</th>
                <th className="py-3 px-4">Funções Habilitadas</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500 text-sm">
                    Carregando usuários...
                  </td>
                </tr>
              ) : filteredUsuarios.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500 text-sm">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              ) : (
                filteredUsuarios.map((u) => {
                  const clienteNome =
                    u.expand?.cliente_id?.nome_razao_social ||
                    clientes.find((c) => c.id === u.cliente_id)?.nome_razao_social

                  const perms = resolverPermissoesUsuario(u)
                  const isCliente = u.role === 'cliente'
                  const isAdmin = u.role === 'administrador'

                  return (
                    <tr key={u.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-gray-900">
                        <div className="flex items-center gap-2">
                          <span>{u.name || 'Sem nome'}</span>
                          {isAdmin && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-700">
                              Admin
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-gray-600 text-xs font-mono">{u.email}</td>
                      <td className="py-3.5 px-4 text-xs">
                        {isCliente ? (
                          <div className="flex flex-col">
                            <span className="font-semibold text-emerald-700 flex items-center gap-1">
                              <Building className="w-3.5 h-3.5 text-emerald-600" />
                              Portal do Cliente
                            </span>
                            <span className="text-gray-500 text-[11px] truncate max-w-[180px]">
                              {clienteNome || 'Cliente não associado'}
                            </span>
                          </div>
                        ) : (
                          <span className="font-medium text-gray-700 flex items-center gap-1">
                            <Shield className="w-3.5 h-3.5 text-blue-600" />
                            Usuário Interno
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {isCliente ? (
                          <div className="flex flex-wrap gap-1">
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Chamados (O.S.)
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Faturamento Próprio
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Contrato Digitalizado
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-w-md">
                            {perms.length === 0 ? (
                              <span className="text-xs text-gray-400 italic">Sem funções</span>
                            ) : isAdmin ? (
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                                Todas as funções liberadas ({perms.length})
                              </span>
                            ) : (
                              perms.slice(0, 4).map((p) => {
                                const mod = TODOS_MODULOS.find((m) => m.id === p)
                                return (
                                  <span
                                    key={p}
                                    className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${mod?.corBadge || 'bg-gray-100 text-gray-700'}`}
                                  >
                                    {mod?.nome.split(' ')[0] || p}
                                  </span>
                                )
                              })
                            )}
                            {!isAdmin && perms.length > 4 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-semibold">
                                +{perms.length - 4} funções
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleOpenResetModal(u, e)}
                            className="h-8 px-2 text-xs text-amber-700 hover:text-amber-800 hover:bg-amber-50"
                            title="Resetar / Definir Senha"
                          >
                            <KeyRound className="w-3.5 h-3.5 mr-1" /> Senha
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleOpenEdit(u, e)}
                            className="h-8 w-8 p-0 text-gray-500 hover:text-blue-600"
                            title="Editar Funções do Usuário"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleOpenDelete(u, e)}
                            className="h-8 w-8 p-0 text-gray-500 hover:text-red-600"
                            title="Excluir Usuário"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Criar / Editar Usuário com Lista de Funções Marcáveis */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-blue-600" />
              {editingUser ? 'Editar Usuário e Funções' : 'Cadastrar Novo Usuário'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {/* Dados básicos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="u-name">Nome Completo</Label>
                <Input
                  id="u-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Carlos Eduardo da Silva"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="u-email">E-mail de Acesso (Login)</Label>
                <Input
                  id="u-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Ex: carlos@empresa.com.br"
                  disabled={!!editingUser}
                  required
                />
                {editingUser && (
                  <p className="text-[11px] text-gray-400">
                    O e-mail de login não pode ser alterado diretamente.
                  </p>
                )}
              </div>
            </div>

            {/* Alternador de Tipo de Conta: Usuário Interno (Colaborador) vs Cliente Externo */}
            <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/70 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-bold text-gray-900 block">Tipo de Conta</Label>
                  <p className="text-[11px] text-gray-500">
                    Selecione se o usuário é um colaborador interno ou um cliente da locadora
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={!isClienteAccount ? 'default' : 'outline'}
                    className={!isClienteAccount ? 'bg-blue-600 text-white' : 'text-gray-700'}
                    onClick={() => {
                      setIsClienteAccount(false)
                      if (formData.permissoes.length === 0) {
                        setFormData((prev) => ({
                          ...prev,
                          permissoes: [...PRESETS_PERMISSOES.operador],
                        }))
                      }
                    }}
                  >
                    Colaborador Interno
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={isClienteAccount ? 'default' : 'outline'}
                    className={isClienteAccount ? 'bg-emerald-600 text-white' : 'text-gray-700'}
                    onClick={() => {
                      setIsClienteAccount(true)
                      setFormData((prev) => ({
                        ...prev,
                        permissoes: [...PRESETS_PERMISSOES.cliente],
                      }))
                    }}
                  >
                    Cliente Externo
                  </Button>
                </div>
              </div>

              {/* Vínculo de Cliente quando for conta de cliente */}
              {isClienteAccount && (
                <div className="pt-2 border-t border-gray-200 mt-2 space-y-1.5">
                  <Label htmlFor="u-cliente" className="text-emerald-900 font-semibold text-xs">
                    Empresa / Cliente Vinculado
                  </Label>
                  <Select
                    value={formData.cliente_id}
                    onValueChange={(val: string) => setFormData({ ...formData, cliente_id: val })}
                  >
                    <SelectTrigger id="u-cliente" className="h-10 text-sm bg-white">
                      <SelectValue placeholder="Selecione o cliente da lista..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome_razao_social} ({c.documento || 'Sem doc'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-800 text-[11px] space-y-1">
                    <p className="font-semibold flex items-center gap-1">
                      <Building className="w-3.5 h-3.5 text-emerald-600" /> Regra do Cliente (Portal
                      Exclusivo):
                    </p>
                    <p>
                      O cliente terá acesso exclusivo à abertura de chamados (O.S.), histórico de
                      faturas e visualização do contrato digitalizado anexado. Módulos gerenciais
                      internos permanecem bloqueados.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* SEÇÃO PRINCIPAL: LISTA DE FUNÇÕES NO SISTEMA PARA O ADMINISTRADOR MARCAR */}
            {!isClienteAccount && (
              <div className="space-y-3 p-4 rounded-xl border border-blue-200 bg-blue-50/30">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                      <Sliders className="w-4 h-4 text-blue-600" />
                      Funções e Módulos do Sistema
                    </h3>
                    <p className="text-[11px] text-gray-600">
                      Marque as funções que este usuário terá permissão para acessar no ERP:
                    </p>
                  </div>

                  {/* Atalhos rápidos de preenchimento */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-gray-500 font-medium">Modelos:</span>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('admin')}
                      className="px-2 py-0.5 rounded text-[11px] font-medium bg-purple-100 hover:bg-purple-200 text-purple-800 transition-colors"
                      title="Marcar todas as funções"
                    >
                      Admin Completo
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('operador')}
                      className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-100 hover:bg-amber-200 text-amber-800 transition-colors"
                      title="Operação: Parque, Suprimentos, Gráfica, O.S., Serviços"
                    >
                      Operador
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('tecnico')}
                      className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-100 hover:bg-blue-200 text-blue-800 transition-colors"
                      title="Apenas Ordens de Serviço"
                    >
                      Técnico
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectAllModulos}
                      className="px-1.5 py-0.5 rounded text-[11px] text-gray-600 hover:text-gray-900 hover:bg-gray-200"
                    >
                      Marcar Todos
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAllModulos}
                      className="px-1.5 py-0.5 rounded text-[11px] text-gray-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Limpar
                    </button>
                  </div>
                </div>

                {/* Grid com todas as funções marcáveis */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {TODOS_MODULOS.filter((m) => m.id !== 'meu_contrato').map((modulo) => {
                    const isChecked = formData.permissoes.includes(modulo.id)
                    const Icon = modulo.icon
                    return (
                      <div
                        key={modulo.id}
                        onClick={() => handleToggleModulo(modulo.id)}
                        className={`p-3 rounded-lg border transition-all cursor-pointer flex items-start gap-2.5 select-none ${
                          isChecked
                            ? 'bg-white border-blue-500 shadow-xs ring-1 ring-blue-500/20'
                            : 'bg-white/60 border-gray-200 hover:border-gray-300 opacity-80'
                        }`}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => handleToggleModulo(modulo.id)}
                          className="mt-0.5 data-[state=checked]:bg-blue-600"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <Icon
                              className={`w-4 h-4 ${isChecked ? 'text-blue-600' : 'text-gray-400'}`}
                            />
                            <span
                              className={`text-xs font-semibold ${
                                isChecked ? 'text-gray-900' : 'text-gray-600'
                              }`}
                            >
                              {modulo.nome}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-500 mt-0.5 leading-snug">
                            {modulo.descricao}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
                  <span>
                    Funções selecionadas:{' '}
                    <strong className="text-blue-700">{formData.permissoes.length}</strong> de{' '}
                    {TODOS_MODULOS.filter((m) => m.id !== 'meu_contrato').length}
                  </span>
                  <span>
                    Papel gerado:{' '}
                    <strong className="text-gray-800 uppercase">
                      {inferRoleFromPermissions(false, formData.permissoes)}
                    </strong>
                  </span>
                </div>
              </div>
            )}

            {/* Senha Inicial se for novo usuário */}
            {!editingUser && (
              <div className="space-y-1.5 pt-1">
                <Label htmlFor="u-pass">
                  Senha Inicial de Acesso{' '}
                  <span className="text-gray-400 font-normal">(Opcional)</span>
                </Label>
                <Input
                  id="u-pass"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Mínimo 8 caracteres (se vazio, envia e-mail de definição)"
                />
                <p className="text-[11px] text-gray-500">
                  Se você deixar em branco, o sistema dispara um e-mail para o usuário criar sua
                  própria senha.
                </p>
              </div>
            )}

            <DialogFooter className="pt-3 border-t border-gray-100">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSubmitting
                  ? 'Salvando...'
                  : editingUser
                    ? 'Salvar Funções'
                    : 'Cadastrar Usuário'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Reset / Definir Senha */}
      <Dialog open={isResetModalOpen} onOpenChange={setIsResetModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-amber-600" />
              Gerenciar Senha do Usuário
            </DialogTitle>
          </DialogHeader>

          {userToReset && (
            <div className="space-y-5 pt-2">
              <div className="p-3 bg-gray-50 rounded-lg text-xs space-y-1 border border-gray-200">
                <p>
                  <strong>Usuário:</strong> {userToReset.name || 'Sem nome'}
                </p>
                <p>
                  <strong>E-mail:</strong> {userToReset.email}
                </p>
                <p>
                  <strong>Tipo:</strong> {userToReset.role}
                </p>
              </div>

              {/* Opção 1: Enviar link por e-mail */}
              <div className="p-3.5 rounded-lg border border-gray-200 space-y-2">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-600" />
                  <h4 className="text-xs font-bold text-gray-900">
                    Opção 1: Enviar Link por E-mail
                  </h4>
                </div>
                <p className="text-xs text-gray-500">
                  Dispara um e-mail oficial com token seguro para o usuário redefinir sua senha
                  diretamente.
                </p>
                <Button
                  type="button"
                  onClick={handleSendResetEmail}
                  disabled={isResetting}
                  variant="outline"
                  size="sm"
                  className="w-full text-xs text-blue-700 border-blue-200 hover:bg-blue-50"
                >
                  {isResetting
                    ? 'Enviando...'
                    : 'Enviar Link de Redefinição para ' + userToReset.email}
                </Button>
              </div>

              {/* Opção 2: Definir senha diretamente (Admin) */}
              <div className="p-3.5 rounded-lg border border-gray-200 space-y-2.5">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-amber-600" />
                  <h4 className="text-xs font-bold text-gray-900">
                    Opção 2: Definir Senha Diretamente
                  </h4>
                </div>
                <p className="text-xs text-gray-500">
                  Como administrador, você pode definir imediatamente uma nova senha sem necessidade
                  de verificação.
                </p>
                <div className="space-y-1.5">
                  <Input
                    type="password"
                    placeholder="Nova senha (mínimo 8 caracteres)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleDirectSetPassword}
                  disabled={isResetting || !newPassword || newPassword.length < 8}
                  size="sm"
                  className="w-full text-xs bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {isResetting ? 'Gravando...' : 'Aplicar Nova Senha Imediatamente'}
                </Button>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsResetModalOpen(false)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmação Exclusão */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" /> Excluir Usuário
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm text-gray-600">
            Tem certeza de que deseja remover o usuário{' '}
            <strong>{userToDelete?.name || userToDelete?.email}</strong>?
            <p className="mt-2 text-xs text-gray-500">
              Esta ação revogará imediatamente o acesso ao sistema.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Confirmar Exclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
