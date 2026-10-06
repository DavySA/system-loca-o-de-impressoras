import pb from '@/lib/pocketbase/client'
import type { Servico } from '@/types'

export const servicosService = {
  async getAll(filter?: string): Promise<Servico[]> {
    return pb.collection('servicos').getFullList<Servico>({
      filter: filter || '',
      sort: 'nome',
    })
  },

  async getById(id: string): Promise<Servico> {
    return pb.collection('servicos').getOne<Servico>(id)
  },

  async create(data: Partial<Servico>): Promise<Servico> {
    return pb.collection('servicos').create<Servico>(data)
  },

  async update(id: string, data: Partial<Servico>): Promise<Servico> {
    return pb.collection('servicos').update<Servico>(id, data)
  },

  async delete(id: string): Promise<boolean> {
    const os = await pb.collection('ordens_servico').getList(1, 1, {
      filter: `servico_id = "${id}"`,
    })
    if (os.totalItems > 0) {
      throw new Error(
        'Não é possível excluir: existem ordens de serviço vinculadas a este serviço.',
      )
    }
    return pb.collection('servicos').delete(id)
  },
}
