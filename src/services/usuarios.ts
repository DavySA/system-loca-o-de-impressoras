import pb from '@/lib/pocketbase/client'
import type { AppUser, UserRole, ModuloSistema } from '@/types'

export interface CreateUserData {
  email: string
  password?: string
  name: string
  role: UserRole
  cliente_id?: string
  permissoes?: ModuloSistema[]
}

export const usuariosService = {
  async getAll(filter?: string): Promise<AppUser[]> {
    return pb.collection('users').getFullList<AppUser>({
      filter: filter || '',
      sort: '-created',
      expand: 'cliente_id',
    })
  },

  async getById(id: string): Promise<AppUser> {
    return pb.collection('users').getOne<AppUser>(id, {
      expand: 'cliente_id',
    })
  },

  async create(data: CreateUserData): Promise<AppUser> {
    const rawPass = typeof data.password === 'string' ? data.password.trim() : ''
    // PocketBase requer no mínimo 8 caracteres para senhas
    const fallbackPass =
      'TDTech@' + Math.random().toString(36).slice(-6) + Math.random().toString(36).slice(-4)
    const password = rawPass.length >= 8 ? rawPass : fallbackPass

    // Normalizar permissoes: garantir array limpo de strings sem duplicatas nem valores falsos
    const permissoesLimpa = Array.isArray(data.permissoes)
      ? Array.from(new Set(data.permissoes.filter((p): p is ModuloSistema => Boolean(p))))
      : []

    const payload: Record<string, any> = {
      email: data.email.trim().toLowerCase(),
      password: password,
      passwordConfirm: password,
      name: data.name.trim(),
      role: data.role,
      permissoes: permissoesLimpa,
    }

    // Normalizar cliente_id: só envia se houver valor preenchido não-vazio
    const clienteIdTrimmed = typeof data.cliente_id === 'string' ? data.cliente_id.trim() : ''
    if (clienteIdTrimmed) {
      payload.cliente_id = clienteIdTrimmed
    } else {
      payload.cliente_id = ''
    }

    const record = await pb.collection('users').create<AppUser>(payload)

    // Se não tiver senha explícita definida na tela pelo admin, disparar e-mail de recuperação
    if (!rawPass) {
      try {
        await pb.collection('users').requestPasswordReset(payload.email)
      } catch (e) {
        // Falha no envio de e-mail nunca deve propagar erro nem quebrar o fluxo de criação
        console.warn('Aviso: e-mail de definição de senha não enviado pelo servidor:', e)
      }
    }

    return record
  },

  async update(id: string, data: Partial<AppUser>): Promise<AppUser> {
    const payload: Record<string, any> = { ...data }

    if (typeof payload.email === 'string') {
      payload.email = payload.email.trim().toLowerCase()
    }
    if (typeof payload.name === 'string') {
      payload.name = payload.name.trim()
    }

    // Normalizar cliente_id: se vazio ou string vazia, enviar string vazia para limpar campo de relação no PocketBase
    if (
      payload.cliente_id === '' ||
      payload.cliente_id === undefined ||
      payload.cliente_id === null
    ) {
      if ('cliente_id' in data) {
        payload.cliente_id = ''
      }
    } else if (typeof payload.cliente_id === 'string') {
      payload.cliente_id = payload.cliente_id.trim()
    }

    // Garantir que permissoes seja sempre um array válido
    if ('permissoes' in payload) {
      if (Array.isArray(payload.permissoes)) {
        payload.permissoes = Array.from(
          new Set(payload.permissoes.filter((p): p is ModuloSistema => Boolean(p))),
        )
      } else {
        payload.permissoes = []
      }
    }

    return pb.collection('users').update<AppUser>(id, payload)
  },

  async resetPasswordByEmail(email: string): Promise<void> {
    await pb.collection('users').requestPasswordReset(email)
  },

  async adminSetPassword(id: string, newPassword: string): Promise<void> {
    await pb.collection('users').update(id, {
      password: newPassword,
      passwordConfirm: newPassword,
    })
  },

  async delete(id: string): Promise<boolean> {
    return pb.collection('users').delete(id)
  },
}
