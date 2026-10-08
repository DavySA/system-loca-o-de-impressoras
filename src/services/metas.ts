import { pb } from '@/lib/pocketbase/client'
import type { MetaColaborador, PeriodoMeta, MetricaMeta, StatusMeta, AppUser } from '@/types'

export interface ProgressoMetaCalculado {
  meta: MetaColaborador
  valor_alcancado: number
  percentual: number
  valor_restante: number
  comissao_estimada: number
  atingida: boolean
}

export const metasService = {
  // Listar metas (admin lista todas; colaborador lista as suas via filtro de user_id)
  async getMetas(filter?: string): Promise<MetaColaborador[]> {
    try {
      const records = await pb.collection('metas').getFullList<MetaColaborador>({
        filter: filter || '',
        sort: '-created',
        expand: 'user_id',
      })
      return records
    } catch {
      return []
    }
  },

  async getMetasPorUsuario(userId: string): Promise<MetaColaborador[]> {
    return this.getMetas(`user_id = "${userId}"`)
  },

  async getById(id: string): Promise<MetaColaborador> {
    return await pb.collection('metas').getOne<MetaColaborador>(id, {
      expand: 'user_id',
    })
  },

  async create(data: Partial<MetaColaborador>): Promise<MetaColaborador> {
    return await pb.collection('metas').create<MetaColaborador>(data)
  },

  async update(id: string, data: Partial<MetaColaborador>): Promise<MetaColaborador> {
    return await pb.collection('metas').update<MetaColaborador>(id, data)
  },

  async delete(id: string): Promise<boolean> {
    return await pb.collection('metas').delete(id)
  },

  // Calcular progresso real somando as vendas/atendimentos do usuário no período da meta
  async calcularProgresso(meta: MetaColaborador): Promise<ProgressoMetaCalculado> {
    const userId = meta.user_id

    // Datas de corte
    let filtroDataInicio = meta.data_inicio
    let filtroDataFim = meta.data_fim

    // Se mes_ano_referencia informado (ex: "2025-05"), define corte automático
    if (!filtroDataInicio && meta.mes_ano_referencia) {
      filtroDataInicio = `${meta.mes_ano_referencia}-01`
      filtroDataFim = `${meta.mes_ano_referencia}-31`
    }

    let valorAlcancado = 0

    try {
      switch (meta.tipo_metrica) {
        case 'vendas_insumos_grafica': {
          // Vendas de balcão da gráfica onde operador_user_id = userId
          let filter = `operador_user_id = "${userId}"`
          if (filtroDataInicio) filter += ` && data_hora >= "${filtroDataInicio} 00:00:00"`
          if (filtroDataFim) filter += ` && data_hora <= "${filtroDataFim} 23:59:59"`

          const vendas = await pb.collection('grafica_vendas').getFullList({ filter })
          valorAlcancado = vendas.reduce((acc, v: any) => acc + (v.valor_total || 0), 0)
          break
        }

        case 'servicos_grafica': {
          // Vendas da gráfica com produto_id != null
          let filter = `operador_user_id = "${userId}" && produto_id != null`
          if (filtroDataInicio) filter += ` && data_hora >= "${filtroDataInicio} 00:00:00"`
          if (filtroDataFim) filter += ` && data_hora <= "${filtroDataFim} 23:59:59"`

          const vendas = await pb.collection('grafica_vendas').getFullList({ filter })
          valorAlcancado = vendas.reduce((acc, v: any) => acc + (v.valor_total || 0), 0)
          break
        }

        case 'os_particulares': {
          // O.S. particulares concluídas pelo técnico (serviço + peças à parte)
          let filter = `tecnico_user_id = "${userId}" && tipo_atendimento = "particular" && status = "concluida"`
          if (filtroDataInicio) filter += ` && data_conclusao >= "${filtroDataInicio} 00:00:00"`
          if (filtroDataFim) filter += ` && data_conclusao <= "${filtroDataFim} 23:59:59"`

          const oss = await pb.collection('ordens_servico').getFullList({ filter })
          valorAlcancado = oss.reduce(
            (acc, os: any) =>
              acc + (os.valor_total_particular || (os.valor_servico || 0) + (os.valor_pecas || 0)),
            0,
          )
          break
        }

        case 'atendimentos_concluidos': {
          // Quantidade de O.S. concluídas pelo técnico
          let filter = `tecnico_user_id = "${userId}" && status = "concluida"`
          if (filtroDataInicio) filter += ` && data_conclusao >= "${filtroDataInicio} 00:00:00"`
          if (filtroDataFim) filter += ` && data_conclusao <= "${filtroDataFim} 23:59:59"`

          const oss = await pb.collection('ordens_servico').getFullList({ filter })
          valorAlcancado = oss.length
          break
        }

        case 'faturamento_gerado': {
          // Faturas de locação geradas pelo usuário
          let filter = `criado_por_user_id = "${userId}" && status != "cancelada"`
          if (meta.mes_ano_referencia) {
            filter += ` && mes_referencia = "${meta.mes_ano_referencia}"`
          }

          const faturas = await pb.collection('faturas').getFullList({ filter })
          valorAlcancado = faturas.reduce((acc, f: any) => acc + (f.valor_total || 0), 0)
          break
        }
      }
    } catch (err) {
      console.warn('Erro ao calcular métrica de meta:', err)
    }

    const objetivo = meta.valor_objetivo || 1
    const percentual = Math.min(100, Math.round((valorAlcancado / objetivo) * 100))
    const valorRestante = Math.max(0, objetivo - valorAlcancado)
    const atingida = valorAlcancado >= objetivo

    // Cálculo da comissão estimada
    let comissaoEstimada = 0
    if (meta.tipo_comissao === 'percentual' && meta.valor_comissao) {
      comissaoEstimada = (valorAlcancado * meta.valor_comissao) / 100
    } else if (meta.tipo_comissao === 'valor_fixo' && meta.valor_comissao && atingida) {
      comissaoEstimada = meta.valor_comissao
    }

    return {
      meta,
      valor_alcancado: valorAlcancado,
      percentual,
      valor_restante: valorRestante,
      comissao_estimada: comissaoEstimada,
      atingida,
    }
  },
}
