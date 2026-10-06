import pb from '@/lib/pocketbase/client'
import type { Suprimento } from '@/types'

export const suprimentosService = {
  async getAll(filter?: string): Promise<Suprimento[]> {
    return pb.collection('suprimentos').getFullList<Suprimento>({
      filter: filter || '',
      sort: '-data,-created',
      expand: 'equipamento_id',
    })
  },

  async getById(id: string): Promise<Suprimento> {
    return pb.collection('suprimentos').getOne<Suprimento>(id, {
      expand: 'equipamento_id',
    })
  },

  async getByEquipamento(equipamentoId: string): Promise<Suprimento[]> {
    return pb.collection('suprimentos').getFullList<Suprimento>({
      filter: `equipamento_id = "${equipamentoId}"`,
      sort: '-data,-created',
      expand: 'equipamento_id',
    })
  },

  async create(data: Partial<Suprimento>): Promise<Suprimento> {
    return pb.collection('suprimentos').create<Suprimento>(data)
  },

  async update(id: string, data: Partial<Suprimento>): Promise<Suprimento> {
    return pb.collection('suprimentos').update<Suprimento>(id, data)
  },

  async delete(id: string): Promise<boolean> {
    return pb.collection('suprimentos').delete(id)
  },
}
