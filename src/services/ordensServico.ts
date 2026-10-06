import pb from '@/lib/pocketbase/client'
import type { OrdemServico, AtualizacaoOS, OSPeca } from '@/types'

export const ordensServicoService = {
  async getAll(filter?: string): Promise<OrdemServico[]> {
    return pb.collection('ordens_servico').getFullList<OrdemServico>({
      filter: filter || '',
      sort: '-created',
      expand: 'cliente_id,equipamento_id,servico_id',
    })
  },

  async getById(id: string): Promise<OrdemServico> {
    return pb.collection('ordens_servico').getOne<OrdemServico>(id, {
      expand: 'cliente_id,equipamento_id,servico_id',
    })
  },

  async getByCliente(clienteId: string): Promise<OrdemServico[]> {
    return pb.collection('ordens_servico').getFullList<OrdemServico>({
      filter: `cliente_id = "${clienteId}"`,
      sort: '-created',
      expand: 'equipamento_id,servico_id',
    })
  },

  async getByEquipamento(equipamentoId: string): Promise<OrdemServico[]> {
    return pb.collection('ordens_servico').getFullList<OrdemServico>({
      filter: `equipamento_id = "${equipamentoId}"`,
      sort: '-created',
      expand: 'cliente_id,servico_id',
    })
  },

  async create(data: Partial<OrdemServico>, autorNome?: string): Promise<OrdemServico> {
    const payload = {
      ...data,
      data_abertura: data.data_abertura || new Date().toISOString(),
      status: data.status || 'aberta',
    }
    const os = await pb.collection('ordens_servico').create<OrdemServico>(payload)

    // Criar primeira atualização no histórico
    try {
      await pb.collection('atualizacoes_os').create({
        os_id: os.id,
        autor: autorNome || 'Sistema',
        comentario: 'Ordem de serviço aberta no sistema.',
        status_na_ocasiao: 'aberta',
      })
    } catch (e) {
      console.error('Erro ao criar atualização inicial de OS:', e)
    }

    return os
  },

  async update(id: string, data: Partial<OrdemServico>): Promise<OrdemServico> {
    return pb.collection('ordens_servico').update<OrdemServico>(id, data)
  },

  async getAtualizacoes(osId: string): Promise<AtualizacaoOS[]> {
    return pb.collection('atualizacoes_os').getFullList<AtualizacaoOS>({
      filter: `os_id = "${osId}"`,
      sort: '-created',
    })
  },

  async addAtualizacao(
    osId: string,
    autor: string,
    comentario: string,
    statusNaOcasiao: 'aberta' | 'em_andamento' | 'aguardando_peca' | 'concluida',
  ): Promise<AtualizacaoOS> {
    const atualizacao = await pb.collection('atualizacoes_os').create<AtualizacaoOS>({
      os_id: osId,
      autor,
      comentario,
      status_na_ocasiao: statusNaOcasiao,
    })

    // Se houve mudança de status, atualizar também na tabela de O.S.
    await pb.collection('ordens_servico').update(osId, {
      status: statusNaOcasiao,
      ...(statusNaOcasiao === 'concluida' ? { data_conclusao: new Date().toISOString() } : {}),
    })

    return atualizacao
  },

  async marcarConcluida(osId: string, autor: string, comentario?: string): Promise<OrdemServico> {
    const updatedOS = await pb.collection('ordens_servico').update<OrdemServico>(osId, {
      status: 'concluida',
      data_conclusao: new Date().toISOString(),
    })

    await pb.collection('atualizacoes_os').create({
      os_id: osId,
      autor,
      comentario: comentario || 'Ordem de serviço marcada como concluída.',
      status_na_ocasiao: 'concluida',
    })

    return updatedOS
  },

  async delete(id: string): Promise<boolean> {
    return pb.collection('ordens_servico').delete(id)
  },

  // --------------------------------------------------------------------------
  // Gestão de Peças e Baixa Automática de Estoque na O.S.
  // --------------------------------------------------------------------------
  async getPecas(osId: string): Promise<OSPeca[]> {
    return pb.collection('os_pecas').getFullList<OSPeca>({
      filter: `os_id = "${osId}"`,
      sort: '-created',
      expand: 'suprimento_id',
    })
  },

  async adicionarPeca(data: {
    os_id: string
    suprimento_id: string
    descricao_item: string
    quantidade: number
    custo_unitario?: number
    valor_cobrado?: number
  }): Promise<OSPeca> {
    // 1. Criar registro da peça vinculada à O.S.
    const peca = await pb.collection('os_pecas').create<OSPeca>(data)

    // 2. Dar baixa automática na quantidade do suprimento
    try {
      const sup = await pb.collection('suprimentos').getOne(data.suprimento_id)
      const novoEstoque = Math.max(0, (sup.quantidade || 0) - Number(data.quantidade))
      await pb.collection('suprimentos').update(data.suprimento_id, {
        quantidade: novoEstoque,
      })
    } catch (err) {
      console.error('Erro ao dar baixa no estoque do suprimento:', err)
    }

    return peca
  },

  async removerPeca(pecaId: string): Promise<boolean> {
    try {
      const peca = await pb.collection('os_pecas').getOne<OSPeca>(pecaId)
      // 1. Devolver quantidade ao estoque do suprimento correspondente
      if (peca.suprimento_id && peca.quantidade > 0) {
        try {
          const sup = await pb.collection('suprimentos').getOne(peca.suprimento_id)
          const estoqueRestaurado = (sup.quantidade || 0) + Number(peca.quantidade)
          await pb.collection('suprimentos').update(peca.suprimento_id, {
            quantidade: estoqueRestaurado,
          })
        } catch (e) {
          console.error('Erro ao restaurar estoque do suprimento:', e)
        }
      }
      // 2. Excluir registro da peça
      return await pb.collection('os_pecas').delete(pecaId)
    } catch (e) {
      console.error('Erro ao remover peça da O.S.:', e)
      throw e
    }
  },
}
