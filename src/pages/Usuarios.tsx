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
} from 'lucide-react'
import { usuariosService } from '@/services/usuarios'
import { clientesService } from '@/services/clientes'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
import type { AppUser, Cliente, UserRole } from '@/types'

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
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'administrador' as UserRole,
    cliente_id: '',
    password: '',
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
    setFormData({
      name: '',
      email: '',
      role: 'tecnico',
      cliente_id: '',
      password: '',
    })
    setIsModalOpen(true)
  }

  const handleOpenEdit = (user: AppUser, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingUser(user)
    setFormData({
      name: user.name || '',
      email: user.email,
      role: user.role || 'administrador',
      cliente_id: user.cliente_id || '',
      password: '',
    })
    setIsModalOpen(true)
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

    if (formData.role === 'cliente' && !formData.cliente_id) {
      toast({
        variant: 'destructive',
        title: 'Vínculo obrigatório',
        description: 'Selecione a empresa/cliente correspondente a esta conta.',
      })
      return
    }

    setIsSubmitting(true)
    try {
      if (editingUser) {
        await usuariosService.update(editingUser.id, {
          name: formData.name,
          role: formData.role,
          cliente_id: formData.role === 'cliente' ? formData.cliente_id : undefined,
        })
        toast({
          title: 'Usuário atualizado!',
          description: 'Dados salvos com sucesso.',
        })
      } else {
        await usuariosService.create({
          name: formData.name,
          email: formData.email,
          role: formData.role,
          cliente_id: formData.role === 'cliente' ? formData.cliente_id : undefined,
          password: formData.password || undefined,
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

  const getRoleBadge = (role?: UserRole) => {
    switch (role) {
      case 'administrador':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            Administrador
          </span>
        )
      case 'tecnico':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            Técnico
          </span>
        )
      case 'cliente':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Cliente
          </span>
        )
      case 'operador':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Operador
          </span>
        )
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
            {role || 'Indefinido'}
          </span>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Gerenciamento de Usuários
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Controle de acessos, papéis (administrador, operador, técnico, cliente) e redefinição de
            senhas
          </p>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Novo Usuário
        </Button>
      </div>

      {/* Explicação dos papéis */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900">Administrador</h4>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Acesso total: clientes, contratos, faturamento em lote, relatórios, configurações e
              usuários.
            </p>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-amber-200 bg-amber-50/30 shadow-xs flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-amber-900">Operador</h4>
            <p className="text-[11px] text-amber-800 mt-0.5">
              Opera caixa da gráfica, cadastra clientes, equipamentos, suprimentos, serviços e O.S.{' '}
              <strong>Sem permissão para apagar dados</strong>.
            </p>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900">Técnico</h4>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Acesso exclusivo às Ordens de Serviço (atendimentos técnicos, peças e laudos).
            </p>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <Building className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900">Cliente</h4>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Visualiza faturas próprias, contrato de locação e abre chamados de assistência
              técnica.
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
              <SelectValue placeholder="Papel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Papéis</SelectItem>
              <SelectItem value="administrador">Administrador</SelectItem>
              <SelectItem value="operador">Operador</SelectItem>
              <SelectItem value="tecnico">Técnico</SelectItem>
              <SelectItem value="cliente">Cliente</SelectItem>
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
                <th className="py-3 px-4">Papel / Perfil</th>
                <th className="py-3 px-4">Cliente Vinculado</th>
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
                  return (
                    <tr key={u.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-gray-900">
                        {u.name || 'Sem nome'}
                      </td>
                      <td className="py-3.5 px-4 text-gray-600 text-xs font-mono">{u.email}</td>
                      <td className="py-3.5 px-4">{getRoleBadge(u.role)}</td>
                      <td className="py-3.5 px-4 text-gray-600 text-xs">
                        {clienteNome ? (
                          <span className="font-medium text-gray-900 flex items-center gap-1">
                            <Building className="w-3.5 h-3.5 text-gray-400" />
                            {clienteNome}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">Não vinculado</span>
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
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleOpenDelete(u, e)}
                            className="h-8 w-8 p-0 text-gray-500 hover:text-red-600"
                            title="Excluir"
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

      {/* Modal Criar/Editar Usuário */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
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
              <Label htmlFor="u-email">E-mail de Acesso</Label>
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
                  O e-mail de login não pode ser alterado diretamente por aqui.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="u-role">Papel no Sistema</Label>
              <Select
                value={formData.role}
                onValueChange={(val: UserRole) => setFormData({ ...formData, role: val })}
              >
                <SelectTrigger id="u-role" className="h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="administrador">Administrador (Acesso total)</SelectItem>
                  <SelectItem value="operador">
                    Operador (Caixa, cadastros, sem exclusão)
                  </SelectItem>
                  <SelectItem value="tecnico">Técnico (Apenas Ordens de Serviço)</SelectItem>
                  <SelectItem value="cliente">Cliente (Faturamento próprio e chamados)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.role === 'cliente' && (
              <div className="space-y-1.5 p-3 rounded-lg bg-blue-50 border border-blue-100">
                <Label htmlFor="u-cliente" className="text-blue-900 font-semibold">
                  Vincular ao Cliente / Empresa
                </Label>
                <Select
                  value={formData.cliente_id}
                  onValueChange={(val: string) => setFormData({ ...formData, cliente_id: val })}
                >
                  <SelectTrigger id="u-cliente" className="h-10 text-sm bg-white">
                    <SelectValue placeholder="Selecione o cliente correspondente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome_razao_social} ({c.documento || 'Sem doc'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-blue-700">
                  O usuário verá somente as faturas e equipamentos desta empresa.
                </p>
              </div>
            )}

            {!editingUser && (
              <div className="space-y-1.5">
                <Label htmlFor="u-pass">
                  Senha Inicial <span className="text-gray-400 font-normal">(Opcional)</span>
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

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSubmitting ? 'Salvando...' : editingUser ? 'Salvar Alterações' : 'Criar Usuário'}
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
                  <strong>Papel:</strong> {userToReset.role}
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
