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
  async setSenha(id: string, novaSenha: string): Promise<AdminSetPasswordResult> {
    return adminPost<AdminSetPasswordResult>('/api/std/admin/senha', {
      usuario_id: id,
      nova_senha: novaSenha,
    })
  },

  /** Atualiza nome/role/cliente_id/permissões de um usuário (admin autenticado). */
  async atualizar(
    id: string,
    dados: { name?: string; role?: string; cliente_id?: string; permissoes?: string[] },
  ): Promise<AdminUpdateUserResult> {
    return adminPost<AdminUpdateUserResult>('/api/std/admin/usuario', {
      usuario_id: id,
      ...dados,
    })
  },
}
