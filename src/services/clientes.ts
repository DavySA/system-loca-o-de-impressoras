import pb from '@/lib/pocketbase/client'
import type { Cliente } from '@/types'

export const clientesService = {
  async getAll(filter?: string): Promise<Cliente[]> {
    return pb.collection('clientes').getFullList<Cliente>({
      filter: filter || '',
      sort: 'nome_razao_social',
    })
  },

  async getById(id: string): Promise<Cliente> {
    return pb.collection('clientes').getOne<Cliente>(id)
  },

  async create(data: Partial<Cliente>): Promise<Cliente> {
    return pb.collection('clientes').create<Cliente>(data)
  },

  async update(id: string, data: Partial<Cliente> | FormData): Promise<Cliente> {
    return pb.collection('clientes').update<Cliente>(id, data)
  },

  /**
   * Busca a conta de usuário vinculada ao cliente (role = 'cliente' e cliente_id = id)
   * ou pelo e-mail do cliente caso já exista conta de usuário.
   */
  async getUsuarioVinculado(clienteId: string, email?: string): Promise<any | null> {
    try {
      if (clienteId) {
        const porId = await pb.collection('users').getList(1, 1, {
          filter: `cliente_id = "${clienteId}"`,
        })
        if (porId.items.length > 0) {
          return porId.items[0]
        }
      }

      const emailTrim = (email || '').trim().toLowerCase()
      if (emailTrim) {
        const porEmail = await pb.collection('users').getList(1, 1, {
          filter: `email = "${emailTrim}"`,
        })
        if (porEmail.items.length > 0) {
          return porEmail.items[0]
        }
      }
    } catch (e) {
      console.warn('Erro ao verificar usuário vinculado ao cliente:', e)
    }
    return null
  },

  /**
   * Sincroniza conta de usuário para clientes do tipo "Locação".
   * Regras:
   * - Apenas executa se tipo_cliente for 'locacao' (ou padrão) e houver e-mail válido
   * - Se já existir conta com esse e-mail: vincula cliente_id e atualiza papel para cliente (se necessário)
   * - Se não existir: cria novo usuário com papel 'cliente', vincula cliente_id e permissoes restritas
   * - Ao concluir: dispara requestPasswordReset para enviar link de criação/definição de senha
   * - Falhas de e-mail não quebram o fluxo, retornando status descritivo
   */
  async syncUsuarioParaClienteLocacao(cliente: Cliente): Promise<{
    user: any | null
    created: boolean
    alreadyExisted: boolean
    resetEmailSent: boolean
    errorMessage?: string
  }> {
    const emailLimpo = (cliente.email || '').trim().toLowerCase()
    const tipoCliente = cliente.tipo_cliente || 'locacao'

    // Se for particular ou não tiver e-mail, não cria conta
    if (tipoCliente === 'particular' || !emailLimpo || !emailLimpo.includes('@')) {
      return {
        user: null,
        created: false,
        alreadyExisted: false,
        resetEmailSent: false,
      }
    }

    try {
      // 1. Verificar se já existe conta de usuário com este e-mail
      let existingUser: any = null
      try {
        const found = await pb.collection('users').getList(1, 1, {
          filter: `email = "${emailLimpo}"`,
        })
        if (found.items.length > 0) {
          existingUser = found.items[0]
        }
      } catch {
        /* intentionally ignored */
      }

      const permissoesCliente = ['dashboard', 'ordens_servico', 'faturamento', 'meu_contrato']

      if (existingUser) {
        // Já existia: apenas garantir o vínculo cliente_id e se papel for vazio ou cliente
        const payloadUpdate: Record<string, any> = {}
        if (existingUser.cliente_id !== cliente.id) {
          payloadUpdate.cliente_id = cliente.id
        }
        if (!existingUser.role || existingUser.role === 'cliente') {
          payloadUpdate.role = 'cliente'
          payloadUpdate.permissoes = permissoesCliente
        }

        let updatedUser = existingUser
        if (Object.keys(payloadUpdate).length > 0) {
          updatedUser = await pb.collection('users').update(existingUser.id, payloadUpdate)
        }

        // Tentar enviar reset de senha
        let resetSent = false
        try {
          await pb.collection('users').requestPasswordReset(emailLimpo)
          resetSent = true
        } catch (err) {
          console.warn('Aviso: e-mail de redefinição de senha não enviado pelo servidor:', err)
        }

        return {
          user: updatedUser,
          created: false,
          alreadyExisted: true,
          resetEmailSent: resetSent,
        }
      }

      // 2. Não existia: criar conta de usuário cliente
      const fallbackPass =
        'TDTech@' + Math.random().toString(36).slice(-6) + Math.random().toString(36).slice(-4)

      const newUser = await pb.collection('users').create({
        email: emailLimpo,
        password: fallbackPass,
        passwordConfirm: fallbackPass,
        name: cliente.nome_razao_social || 'Cliente',
        role: 'cliente',
        cliente_id: cliente.id,
        permissoes: permissoesCliente,
      })

      // 3. Disparar link de definição de senha
      let resetSent = false
      try {
        await pb.collection('users').requestPasswordReset(emailLimpo)
        resetSent = true
      } catch (err) {
        console.warn('Aviso: e-mail de redefinição de senha não enviado pelo servidor:', err)
      }

      return {
        user: newUser,
        created: true,
        alreadyExisted: false,
        resetEmailSent: resetSent,
      }
    } catch (err: any) {
      console.error('Erro ao sincronizar usuário do cliente:', err)
      return {
        user: null,
        created: false,
        alreadyExisted: false,
        resetEmailSent: false,
        errorMessage: err?.message || 'Falha ao vincular usuário do cliente.',
      }
    }
  },

  /**
   * Dispara reenvio do link de senha para o e-mail do usuário/cliente
   */
  async reenviarLinkSenha(email: string): Promise<boolean> {
    const emailLimpo = (email || '').trim().toLowerCase()
    if (!emailLimpo) {
      throw new Error('E-mail não informado.')
    }
    await pb.collection('users').requestPasswordReset(emailLimpo)
    return true
  },

  getContratoUrl(cliente: Cliente): string | null {
    if (!cliente.contrato_digital) return null
    return pb.files.getURL(cliente, cliente.contrato_digital)
  },

  async delete(id: string): Promise<boolean> {
    // Verificar se possui contratos ou faturas antes de excluir
    const contratos = await pb.collection('contratos').getList(1, 1, {
      filter: `cliente_id = "${id}"`,
    })
    if (contratos.totalItems > 0) {
      throw new Error(
        'Não é possível excluir: existem contratos vinculados a este cliente. Sugerimos inativá-lo.',
      )
    }

    const faturas = await pb.collection('faturas').getList(1, 1, {
      filter: `cliente_id = "${id}"`,
    })
    if (faturas.totalItems > 0) {
      throw new Error(
        'Não é possível excluir: existem faturas vinculadas a este cliente. Sugerimos inativá-lo.',
      )
    }

    const os = await pb.collection('ordens_servico').getList(1, 1, {
      filter: `cliente_id = "${id}"`,
    })
    if (os.totalItems > 0) {
      throw new Error(
        'Não é possível excluir: existem ordens de serviço vinculadas a este cliente. Sugerimos inativá-lo.',
      )
    }

    return pb.collection('clientes').delete(id)
  },
}
