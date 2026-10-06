import pb from '@/lib/pocketbase/client'
import type { AppUser, UserRole } from '@/types'

export interface CreateUserData {
  email: string
  password?: string
  name: string
  role: UserRole
  cliente_id?: string
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
    const password = data.password || 'PrintGest@' + Math.random().toString(36).slice(-8)
    const payload: Record<string, any> = {
      email: data.email,
      password: password,
      passwordConfirm: password,
      name: data.name,
      role: data.role,
    }
    if (data.cliente_id) {
      payload.cliente_id = data.cliente_id
    }

    const record = await pb.collection('users').create<AppUser>(payload)

    // Se for cliente e não tiver senha explícita definida na tela, disparar e-mail de recuperação
    if (!data.password) {
      try {
        await pb.collection('users').requestPasswordReset(data.email)
      } catch (e) {
        console.warn('Erro ao solicitar reset inicial:', e)
      }
    }

    return record
  },

  async update(id: string, data: Partial<AppUser>): Promise<AppUser> {
    return pb.collection('users').update<AppUser>(id, data)
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
