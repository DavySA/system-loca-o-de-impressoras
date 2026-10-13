import pb from '@/lib/pocketbase/client'
import type { Equipamento, Contrato } from '@/types'

export const equipamentosService = {
  async getAll(filter?: string): Promise<Equipamento[]> {
    const list = await pb.collection('equipamentos').getFullList<Equipamento>({
      filter: filter || '',
      sort: 'modelo',
      expand: 'cliente_id',
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
    const eq = await pb.collection('equipamentos').getOne<Equipamento>(id, {
      expand: 'cliente_id',
    })
    try {
      const contrato = await pb
        .collection('contratos')
        .getFirstListItem<Contrato>(`equipamento_id = "${id}" && status = "ativo"`, {
          expand: 'cliente_id',
        })
      eq.expand = {
        ...eq.expand,
        contrato_atual: contrato,
      }
    } catch {
      // Sem contrato ativo
    }
    return eq
  },

  async create(data: Partial<Equipamento>): Promise<Equipamento> {
    const payload: Record<string, any> = { ...data }
    // Normalizar cliente_id vazio para null no PocketBase relation
    if (!payload.cliente_id) {
      delete payload.cliente_id
    }
    return pb.collection('equipamentos').create<Equipamento>(payload)
  },

  async update(id: string, data: Partial<Equipamento>): Promise<Equipamento> {
    const payload: Record<string, any> = { ...data }
    // Se cliente_id for string vazia ou explicitamente nulo/desvinculado, enviar null para limpar
    if (payload.cliente_id === '' || payload.cliente_id === undefined) {
      if ('cliente_id' in data) {
        payload.cliente_id = null
      }
    }
    return pb.collection('equipamentos').update<Equipamento>(id, payload)
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
