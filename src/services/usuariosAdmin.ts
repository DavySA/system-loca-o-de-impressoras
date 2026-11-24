import pb from '@/lib/pocketbase/client'
import type { AppUser } from '@/types'

/**
 * Serviço de administração de usuários via pb_hooks (Skip Cloud).
 *
 * Por que não direto pelo SDK: o PocketBase só aceita alterar senha de OUTRO
 * usuário autenticado com credenciais de superuser (ou regra de update que o
 * SDK cliente não consegue satisfazer). O hook expõe rotas protegidas que só
 * aceitam usuários autenticados com role 'administrador'.
 */

export interface AdminSetPasswordResult {
  ok: boolean
  email?: string
}

export interface AdminUpdateUserResult {
  ok: boolean
  user?: AppUser
}

export interface AdminCreateUserResult {
  ok: boolean
  /** true quando o e-mail já tinha conta (ex.: conta de cliente do portal) e ela foi vinculada */
  vinculado?: boolean
  id?: string
  mensagem?: string
}

async function adminPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  return pb.send<T>(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: pb.authStore.token,
    },
    body: JSON.stringify(body),
  })
}

export const usuariosAdminService = {
  /** Define a senha de um usuário diretamente (admin autenticado). */
  async setSenha(id: string, novaSenha: string, email?: string): Promise<AdminSetPasswordResult> {
    return adminPost<AdminSetPasswordResult>('/backend/v1/std/admin/senha', {
      usuario_id: id,
      // fallback: se o id não resolver no servidor, o hook busca pelo e-mail
      email: (email || '').trim().toLowerCase(),
      nova_senha: novaSenha,
    })
  },

  /** Atualiza nome/role/cliente_id/permissões de um usuário (admin autenticado). */
  async atualizar(
    id: string,
    dados: {
      name?: string
      role?: string
      cliente_id?: string
      permissoes?: string[]
      email?: string
    },
  ): Promise<AdminUpdateUserResult> {
    return adminPost<AdminUpdateUserResult>('/backend/v1/std/admin/usuario', {
      usuario_id: id,
      ...dados,
    })
  },

  /**
   * Cria um usuário interno/cliente via servidor. Se o e-mail já pertencer a
   * uma conta existente (ex.: conta de cliente criada no cadastro do cliente),
   * o hook VINCULA a mesma conta em vez de duplicar (evita "Value must be unique.").
   */
  async criar(dados: {
    name: string
    email: string
    role: string
    cliente_id?: string
    password?: string
    permissoes?: string[]
  }): Promise<AdminCreateUserResult> {
    return adminPost<AdminCreateUserResult>('/backend/v1/std/admin/usuario/criar', {
      ...dados,
      permissoes: Array.isArray(dados.permissoes) ? dados.permissoes : [],
    })
  },
}
