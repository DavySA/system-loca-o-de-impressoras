import pb from '@/lib/pocketbase/client'
import type { Contrato } from '@/types'

export const contratosService = {
  async getAll(filter?: string): Promise<Contrato[]> {
    return pb.collection('contratos').getFullList<Contrato>({
      filter: filter || '',
      sort: '-created',
      expand: 'cliente_id,equipamento_id',
    })
  },

  async getByCliente(clienteId: string): Promise<Contrato[]> {
    return pb.collection('contratos').getFullList<Contrato>({
      filter: `cliente_id = "${clienteId}"`,
      sort: '-created',
      expand: 'equipamento_id',
    })
  },

  async getByEquipamento(equipamentoId: string): Promise<Contrato[]> {
    return pb.collection('contratos').getFullList<Contrato>({
      filter: `equipamento_id = "${equipamentoId}"`,
      sort: '-created',
      expand: 'cliente_id',
    })
  },

  async create(data: Partial<Contrato>): Promise<Contrato> {
    const contrato = await pb.collection('contratos').create<Contrato>(data)
    // Atualizar status do equipamento para 'locado'
    if (data.equipamento_id && data.status === 'ativo') {
      try {
        await pb.collection('equipamentos').update(data.equipamento_id, {
          status: 'locado',
        })
      } catch (err) {
        console.error('Erro ao atualizar status do equipamento:', err)
      }
    }
    return contrato
  },

  async update(id: string, data: Partial<Contrato>): Promise<Contrato> {
    return pb.collection('contratos').update<Contrato>(id, data)
  },

  async delete(id: string): Promise<boolean> {
    return pb.collection('contratos').delete(id)
  },
}
