import pb from '@/lib/pocketbase/client'
import type { Equipamento, Contrato } from '@/types'

export const equipamentosService = {
  async getAll(filter?: string): Promise<Equipamento[]> {
    const list = await pb.collection('equipamentos').getFullList<Equipamento>({
      filter: filter || '',
      sort: 'modelo',
    })

    // Buscar contratos ativos para popular cliente atual
    const contratos = await pb.collection('contratos').getFullList<Contrato>({
      filter: 'status = "ativo"',
      expand: 'cliente_id',
    })

    const contratoMap = new Map<string, Contrato>()
    for (const c of contratos) {
      contratoMap.set(c.equipamento_id, c)
    }

    return list.map((eq) => ({
      ...eq,
      expand: {
        contrato_atual: contratoMap.get(eq.id),
      },
    }))
  },

  async getById(id: string): Promise<Equipamento> {
    const eq = await pb.collection('equipamentos').getOne<Equipamento>(id)
    try {
      const contrato = await pb
        .collection('contratos')
        .getFirstListItem<Contrato>(`equipamento_id = "${id}" && status = "ativo"`, {
          expand: 'cliente_id',
        })
      eq.expand = { contrato_atual: contrato }
    } catch {
      // Sem contrato ativo
    }
    return eq
  },

  async create(data: Partial<Equipamento>): Promise<Equipamento> {
    return pb.collection('equipamentos').create<Equipamento>(data)
  },

  async update(id: string, data: Partial<Equipamento>): Promise<Equipamento> {
    return pb.collection('equipamentos').update<Equipamento>(id, data)
  },

  async delete(id: string): Promise<boolean> {
    // Verificar se está em contrato ativo
    const contratos = await pb.collection('contratos').getList(1, 1, {
      filter: `equipamento_id = "${id}"`,
    })
    if (contratos.totalItems > 0) {
      throw new Error(
        'Não é possível excluir: existem contratos vinculados a este equipamento. Sugerimos inativá-lo.',
      )
    }
    return pb.collection('equipamentos').delete(id)
  },
}
