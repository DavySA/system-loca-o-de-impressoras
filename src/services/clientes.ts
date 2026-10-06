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
