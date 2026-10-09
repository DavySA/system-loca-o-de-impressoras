import pb from '@/lib/pocketbase/client'
import type {
  GraficaProduto,
  GraficaCaixa,
  GraficaCaixaContador,
  GraficaVenda,
  GraficaConfiguracao,
} from '@/types'

export const graficaService = {
  // --------------------------------------------------------------------------
  // 0. Configuração do Ambiente da Gráfica (Lotação de Equipamentos)
  // --------------------------------------------------------------------------
  async getConfiguracao(): Promise<GraficaConfiguracao | null> {
    try {
      const records = await pb
        .collection('grafica_configuracao')
        .getList<GraficaConfiguracao>(1, 1, {
          sort: '-created',
          expand: 'equipamentos_lotados_ids',
        })
      return records.items[0] || null
    } catch {
      return null
    }
  },

  async salvarConfiguracao(data: {
    equipamentos_lotados_ids: string[]
    observacoes?: string
  }): Promise<GraficaConfiguracao> {
    const existing = await this.getConfiguracao()
    if (existing) {
      return pb.collection('grafica_configuracao').update<GraficaConfiguracao>(existing.id, {
        equipamentos_lotados_ids: data.equipamentos_lotados_ids,
        observacoes: data.observacoes || '',
      })
    } else {
      return pb.collection('grafica_configuracao').create<GraficaConfiguracao>({
        equipamentos_lotados_ids: data.equipamentos_lotados_ids,
        observacoes: data.observacoes || '',
      })
    }
  },

  // --------------------------------------------------------------------------
  // 1. Produtos / Insumos de Papel / Adesivos / Serviços
  // --------------------------------------------------------------------------
  async getProdutos(filter?: string): Promise<GraficaProduto[]> {
    return pb.collection('grafica_produtos').getFullList<GraficaProduto>({
      filter: filter || '',
      sort: 'categoria,nome',
      expand: 'suprimento_insumo_id',
    })
  },

  async getProdutoById(id: string): Promise<GraficaProduto> {
    return pb.collection('grafica_produtos').getOne<GraficaProduto>(id, {
      expand: 'suprimento_insumo_id',
    })
  },

  async createProduto(data: Partial<GraficaProduto>): Promise<GraficaProduto> {
    return pb.collection('grafica_produtos').create<GraficaProduto>(data)
  },

  async updateProduto(id: string, data: Partial<GraficaProduto>): Promise<GraficaProduto> {
    return pb.collection('grafica_produtos').update<GraficaProduto>(id, data)
  },

  async deleteProduto(id: string): Promise<boolean> {
    return pb.collection('grafica_produtos').delete(id)
  },

  // --------------------------------------------------------------------------
  // 2. Caixas Diários (Abertura e Fechamento)
  // --------------------------------------------------------------------------
  async getCaixas(filter?: string): Promise<GraficaCaixa[]> {
    return pb.collection('grafica_caixas').getFullList<GraficaCaixa>({
      filter: filter || '',
      sort: '-data,-created',
      expand: 'equipamento_id,equipamentos_ids',
    })
  },

  async getCaixaAberto(): Promise<GraficaCaixa | null> {
    try {
      const records = await pb.collection('grafica_caixas').getList<GraficaCaixa>(1, 1, {
        filter: 'status = "aberto"',
        sort: '-data_abertura',
        expand: 'equipamento_id,equipamentos_ids',
      })
      return records.items[0] || null
    } catch {
      return null
    }
  },

  async getCaixaById(id: string): Promise<GraficaCaixa> {
    return pb.collection('grafica_caixas').getOne<GraficaCaixa>(id, {
      expand: 'equipamento_id,equipamentos_ids',
    })
  },

  // Busca os contadores do último fechamento de um equipamento (seja pelo campo legado ou por grafica_caixa_contadores)
  async getUltimosContadoresEquipamento(equipamentoId: string): Promise<{
    mono: number
    color: number
    copias: number
    scanner: number
    total: number
  }> {
    // 1. Tenta buscar em grafica_caixa_contadores vinculada a um caixa fechado
    try {
      const contadores = await pb
        .collection('grafica_caixa_contadores')
        .getList<GraficaCaixaContador>(1, 1, {
          filter: `equipamento_id = "${equipamentoId}" && caixa_id.status = "fechado"`,
          sort: '-created',
        })
      if (contadores.items.length > 0) {
        const c = contadores.items[0]
        const mono = c.fechamento_mono ?? c.abertura_mono ?? 0
        const color = c.fechamento_color ?? c.abertura_color ?? 0
        const copias = c.fechamento_copias ?? c.abertura_copias ?? 0
        const scanner = c.fechamento_scanner ?? c.abertura_scanner ?? 0
        const total = c.fechamento_total ?? mono + color
        return { mono, color, copias, scanner, total }
      }
    } catch {
      /* fallback */
    }

    // 2. Tenta buscar pelo caixa legado onde equipamento_id era o principal
    try {
      const records = await pb.collection('grafica_caixas').getList<GraficaCaixa>(1, 1, {
        filter: `equipamento_id = "${equipamentoId}" && status = "fechado"`,
        sort: '-data_fechamento,-created',
      })
      if (records.items.length > 0) {
        const cx = records.items[0]
        const mono = cx.contador_fechamento_mono ?? cx.contador_abertura_mono ?? 0
        const color = cx.contador_fechamento_color ?? cx.contador_abertura_color ?? 0
        return { mono, color, copias: 0, scanner: 0, total: mono + color }
      }
    } catch {
      /* fallback */
    }

    // 3. Fallback: contadores atuais do cadastro do equipamento
    try {
      const eq = await pb.collection('equipamentos').getOne(equipamentoId)
      const mono = eq.contador_monocromatico || 0
      const color = eq.contador_colorido || 0
      return { mono, color, copias: 0, scanner: 0, total: mono + color }
    } catch {
      return { mono: 0, color: 0, copias: 0, scanner: 0, total: 0 }
    }
  },

  async getUltimoCaixaFechadoPorEquipamento(equipamentoId: string): Promise<GraficaCaixa | null> {
    try {
      const records = await pb.collection('grafica_caixas').getList<GraficaCaixa>(1, 1, {
        filter: `equipamento_id = "${equipamentoId}" && status = "fechado"`,
        sort: '-data_fechamento,-created',
      })
      return records.items[0] || null
    } catch {
      return null
    }
  },

  async abrirCaixa(data: {
    operador: string
    operador_user_id?: string
    saldo_inicial: number
    equipamento_id?: string
    equipamentos_ids?: string[]
    contador_anterior_mono?: number
    contador_anterior_color?: number
    contador_abertura_mono?: number
    contador_abertura_color?: number
    observacoes_abertura?: string
    contadoresIniciais?: {
      equipamento_id: string
      abertura_mono: number
      abertura_color: number
      abertura_copias: number
      abertura_scanner: number
      abertura_total: number
    }[]
  }): Promise<GraficaCaixa> {
    const hojeStr = new Date().toISOString()
    const equipsIds = data.equipamentos_ids || (data.equipamento_id ? [data.equipamento_id] : [])
    const principalId = data.equipamento_id || equipsIds[0] || undefined

    const novoCaixa = await pb.collection('grafica_caixas').create<GraficaCaixa>({
      data: hojeStr,
      operador: data.operador,
      operador_user_id: data.operador_user_id || undefined,
      status: 'aberto',
      data_abertura: hojeStr,
      equipamento_id: principalId,
      equipamentos_ids: equipsIds,
      saldo_inicial: Number(data.saldo_inicial) || 0,
      total_entradas: 0,
      total_custo_insumos: 0,
      lucro_total: 0,
      contador_anterior_mono: Number(data.contador_anterior_mono) || 0,
      contador_anterior_color: Number(data.contador_anterior_color) || 0,
      contador_abertura_mono: Number(data.contador_abertura_mono) || 0,
      contador_abertura_color: Number(data.contador_abertura_color) || 0,
      observacoes_abertura: data.observacoes_abertura || '',
    })

    // Gravar contadores iniciais de cada impressora selecionada para o caixa
    if (data.contadoresIniciais && data.contadoresIniciais.length > 0) {
      for (const cnt of data.contadoresIniciais) {
        await pb.collection('grafica_caixa_contadores').create({
          caixa_id: novoCaixa.id,
          equipamento_id: cnt.equipamento_id,
          abertura_mono: Number(cnt.abertura_mono) || 0,
          abertura_color: Number(cnt.abertura_color) || 0,
          abertura_copias: Number(cnt.abertura_copias) || 0,
          abertura_scanner: Number(cnt.abertura_scanner) || 0,
          abertura_total:
            Number(cnt.abertura_total) ||
            (Number(cnt.abertura_mono) || 0) + (Number(cnt.abertura_color) || 0),
        })
      }
    }

    return novoCaixa
  },

  async fecharCaixa(
    caixaId: string,
    data: {
      observacoes_fechamento?: string
      saldo_final_dinheiro?: number
      contador_fechamento_mono?: number
      contador_fechamento_color?: number
      contadoresFinais?: {
        contador_id?: string
        equipamento_id: string
        fechamento_mono: number
        fechamento_color: number
        fechamento_copias: number
        fechamento_scanner: number
        fechamento_total: number
      }[]
    },
  ): Promise<GraficaCaixa> {
    // 1. Calcular vendas do caixa para somatórios precisos
    const vendas = await this.getVendas(caixaId)
    const totalEntradas = vendas.reduce((acc, v) => acc + (v.valor_total || 0), 0)
    const totalCustos = vendas.reduce((acc, v) => acc + (v.custo_total || 0), 0)
    const lucroTotal = totalEntradas - totalCustos

    const caixaAtual = await pb.collection('grafica_caixas').getOne<GraficaCaixa>(caixaId)
    const saldoFinal =
      data.saldo_final_dinheiro !== undefined
        ? data.saldo_final_dinheiro
        : (caixaAtual.saldo_inicial || 0) + totalEntradas

    // Apuração acumulada de todos os equipamentos
    let somaDeltaMonoTotal = 0
    let somaDeltaColorTotal = 0

    // Atualizar contadores finais e calcular deltas de cada equipamento do caixa
    if (data.contadoresFinais && data.contadoresFinais.length > 0) {
      for (const finalCnt of data.contadoresFinais) {
        let contadorRecord: GraficaCaixaContador | null = null
        if (finalCnt.contador_id) {
          try {
            contadorRecord = await pb
              .collection('grafica_caixa_contadores')
              .getOne<GraficaCaixaContador>(finalCnt.contador_id)
          } catch {
            contadorRecord = null
          }
        }
        if (!contadorRecord) {
          const list = await pb
            .collection('grafica_caixa_contadores')
            .getList<GraficaCaixaContador>(1, 1, {
              filter: `caixa_id = "${caixaId}" && equipamento_id = "${finalCnt.equipamento_id}"`,
            })
          contadorRecord = list.items[0] || null
        }

        const abMono = contadorRecord?.abertura_mono || 0
        const abColor = contadorRecord?.abertura_color || 0
        const abCopias = contadorRecord?.abertura_copias || 0
        const abScan = contadorRecord?.abertura_scanner || 0
        const abTotal = contadorRecord?.abertura_total || 0

        const fMono = Number(finalCnt.fechamento_mono) || abMono
        const fColor = Number(finalCnt.fechamento_color) || abColor
        const fCopias = Number(finalCnt.fechamento_copias) || abCopias
        const fScan = Number(finalCnt.fechamento_scanner) || abScan
        const fTotal = Number(finalCnt.fechamento_total) || fMono + fColor

        const deltaMono = Math.max(0, fMono - abMono)
        const deltaColor = Math.max(0, fColor - abColor)
        const deltaCopias = Math.max(0, fCopias - abCopias)
        const deltaScan = Math.max(0, fScan - abScan)
        const deltaTotal = Math.max(0, fTotal - abTotal)

        somaDeltaMonoTotal += deltaMono
        somaDeltaColorTotal += deltaColor

        if (contadorRecord) {
          await pb.collection('grafica_caixa_contadores').update(contadorRecord.id, {
            fechamento_mono: fMono,
            fechamento_color: fColor,
            fechamento_copias: fCopias,
            fechamento_scanner: fScan,
            fechamento_total: fTotal,
            delta_mono: deltaMono,
            delta_color: deltaColor,
            delta_copias: deltaCopias,
            delta_scanner: deltaScan,
            delta_total: deltaTotal,
          })
        } else {
          await pb.collection('grafica_caixa_contadores').create({
            caixa_id: caixaId,
            equipamento_id: finalCnt.equipamento_id,
            abertura_mono: abMono,
            abertura_color: abColor,
            abertura_copias: abCopias,
            abertura_scanner: abScan,
            abertura_total: abTotal,
            fechamento_mono: fMono,
            fechamento_color: fColor,
            fechamento_copias: fCopias,
            fechamento_scanner: fScan,
            fechamento_total: fTotal,
            delta_mono: deltaMono,
            delta_color: deltaColor,
            delta_copias: deltaCopias,
            delta_scanner: deltaScan,
            delta_total: deltaTotal,
          })
        }

        // Atualizar também o contador do equipamento individual no módulo Equipamentos
        try {
          await pb.collection('equipamentos').update(finalCnt.equipamento_id, {
            contador_monocromatico: fMono,
            contador_colorido: fColor,
          })
        } catch (errEq) {
          console.warn('Aviso ao sincronizar contadores do equipamento:', errEq)
        }
      }
    }

    // Contadores principais do registro do caixa (legado e compatibilidade)
    const fMonoPrincipal =
      data.contador_fechamento_mono !== undefined
        ? Number(data.contador_fechamento_mono)
        : Number(caixaAtual.contador_abertura_mono || 0)
    const fColorPrincipal =
      data.contador_fechamento_color !== undefined
        ? Number(data.contador_fechamento_color)
        : Number(caixaAtual.contador_abertura_color || 0)

    const prodMono =
      somaDeltaMonoTotal > 0
        ? somaDeltaMonoTotal
        : Math.max(0, fMonoPrincipal - (caixaAtual.contador_abertura_mono || 0))
    const prodColor =
      somaDeltaColorTotal > 0
        ? somaDeltaColorTotal
        : Math.max(0, fColorPrincipal - (caixaAtual.contador_abertura_color || 0))

    const agora = new Date().toISOString()
    return pb.collection('grafica_caixas').update<GraficaCaixa>(caixaId, {
      status: 'fechado',
      data_fechamento: agora,
      contador_fechamento_mono: fMonoPrincipal,
      contador_fechamento_color: fColorPrincipal,
      producao_mono: prodMono,
      producao_color: prodColor,
      total_entradas: totalEntradas,
      total_custo_insumos: totalCustos,
      lucro_total: lucroTotal,
      saldo_final_dinheiro: saldoFinal,
      observacoes_fechamento: data.observacoes_fechamento || '',
    })
  },

  async getContadoresPorCaixa(caixaId: string): Promise<GraficaCaixaContador[]> {
    return pb.collection('grafica_caixa_contadores').getFullList<GraficaCaixaContador>({
      filter: `caixa_id = "${caixaId}"`,
      expand: 'equipamento_id',
    })
  },

  // --------------------------------------------------------------------------
  // 3. Vendas / Serviços do Caixa com Baixa Automática de Estoque
  // --------------------------------------------------------------------------
  async getVendas(caixaId?: string): Promise<GraficaVenda[]> {
    const filter = caixaId ? `caixa_id = "${caixaId}"` : ''
    return pb.collection('grafica_vendas').getFullList<GraficaVenda>({
      filter,
      sort: '-data_hora,-created',
      expand: 'produto_id,suprimento_baixado_id',
    })
  },

  async registrarVenda(data: {
    caixa_id: string
    operador_user_id?: string
    produto_id?: string
    descricao: string
    quantidade: number
    preco_unitario: number
    custo_unitario?: number
    forma_pagamento?: GraficaVenda['forma_pagamento']
    cliente_nome?: string
    observacoes?: string
    darBaixaInsumo?: boolean
  }): Promise<GraficaVenda> {
    const quantidade = Number(data.quantidade) || 1
    const precoUnitario = Number(data.preco_unitario) || 0
    const valorTotal = quantidade * precoUnitario
    let custoTotal = (Number(data.custo_unitario) || 0) * quantidade

    let suprimentoBaixadoId: string | undefined = undefined
    let qtdInsumoBaixada = 0

    // Se vinculado a um produto da gráfica, buscar detalhes e efetuar baixa automática no estoque
    if (data.produto_id) {
      try {
        const prod = await pb.collection('grafica_produtos').getOne<GraficaProduto>(data.produto_id)
        if (!data.custo_unitario && prod.custo_unitario) {
          custoTotal = prod.custo_unitario * quantidade
        }

        // Baixa no estoque do próprio produto da gráfica
        if (prod.estoque_atual !== undefined) {
          const novoEstoqueProd = Math.max(0, (prod.estoque_atual || 0) - quantidade)
          await pb.collection('grafica_produtos').update(prod.id, {
            estoque_atual: novoEstoqueProd,
          })
        }

        // Se o produto consome um insumo vinculado em Suprimentos (ex: papel sulfite A4 comum)
        if (prod.suprimento_insumo_id && data.darBaixaInsumo !== false) {
          suprimentoBaixadoId = prod.suprimento_insumo_id
          const fator = prod.consumo_insumo_por_unidade || 1
          qtdInsumoBaixada = quantidade * fator
          try {
            const sup = await pb.collection('suprimentos').getOne(suprimentoBaixadoId)
            const novoEstoqueSup = Math.max(0, (sup.quantidade || 0) - qtdInsumoBaixada)
            await pb.collection('suprimentos').update(suprimentoBaixadoId, {
              quantidade: novoEstoqueSup,
            })
          } catch (errSup) {
            console.error('Erro ao baixar suprimento vinculado:', errSup)
          }
        }
      } catch (err) {
        console.error('Erro ao processar produto da venda:', err)
      }
    }

    const lucroTotal = valorTotal - custoTotal

    const novaVenda = await pb.collection('grafica_vendas').create<GraficaVenda>({
      caixa_id: data.caixa_id,
      operador_user_id: data.operador_user_id || undefined,
      data_hora: new Date().toISOString(),
      produto_id: data.produto_id || undefined,
      descricao: data.descricao,
      quantidade,
      preco_unitario: precoUnitario,
      valor_total: valorTotal,
      custo_total: custoTotal,
      lucro_total: lucroTotal,
      forma_pagamento: data.forma_pagamento || 'dinheiro',
      suprimento_baixado_id: suprimentoBaixadoId,
      quantidade_insumo_baixada: qtdInsumoBaixada,
      cliente_nome: data.cliente_nome,
      observacoes: data.observacoes,
    })

    // Atualizar acumulados do caixa atual
    try {
      const caixa = await pb.collection('grafica_caixas').getOne<GraficaCaixa>(data.caixa_id)
      const novoTotal = (caixa.total_entradas || 0) + valorTotal
      const novoCusto = (caixa.total_custo_insumos || 0) + custoTotal
      const novoLucro = novoTotal - novoCusto
      await pb.collection('grafica_caixas').update(data.caixa_id, {
        total_entradas: novoTotal,
        total_custo_insumos: novoCusto,
        lucro_total: novoLucro,
      })
    } catch {
      /* intentionally ignored */
    }

    return novaVenda
  },

  async estornarVenda(vendaId: string): Promise<boolean> {
    try {
      const venda = await pb.collection('grafica_vendas').getOne<GraficaVenda>(vendaId)

      // Devolver estoque do produto
      if (venda.produto_id) {
        try {
          const prod = await pb
            .collection('grafica_produtos')
            .getOne<GraficaProduto>(venda.produto_id)
          const estoqueRestaurado = (prod.estoque_atual || 0) + Number(venda.quantidade || 0)
          await pb.collection('grafica_produtos').update(venda.produto_id, {
            estoque_atual: estoqueRestaurado,
          })
        } catch {
          /* intentionally ignored */
        }
      }

      // Devolver estoque do suprimento vinculado
      if (venda.suprimento_baixado_id && venda.quantidade_insumo_baixada) {
        try {
          const sup = await pb.collection('suprimentos').getOne(venda.suprimento_baixado_id)
          const estoqueRestaurado = (sup.quantidade || 0) + Number(venda.quantidade_insumo_baixada)
          await pb.collection('suprimentos').update(venda.suprimento_baixado_id, {
            quantidade: estoqueRestaurado,
          })
        } catch {
          /* intentionally ignored */
        }
      }

      // Reajustar caixa
      if (venda.caixa_id) {
        try {
          const caixa = await pb.collection('grafica_caixas').getOne<GraficaCaixa>(venda.caixa_id)
          const novoTotal = Math.max(0, (caixa.total_entradas || 0) - (venda.valor_total || 0))
          const novoCusto = Math.max(0, (caixa.total_custo_insumos || 0) - (venda.custo_total || 0))
          await pb.collection('grafica_caixas').update(venda.caixa_id, {
            total_entradas: novoTotal,
            total_custo_insumos: novoCusto,
            lucro_total: novoTotal - novoCusto,
          })
        } catch {
          /* intentionally ignored */
        }
      }

      return await pb.collection('grafica_vendas').delete(vendaId)
    } catch (e) {
      console.error('Erro ao estornar venda:', e)
      throw e
    }
  },

  // --------------------------------------------------------------------------
  // 4. Relatórios e Estatísticas de Insumos Vendidos e Lucro
  // --------------------------------------------------------------------------
  async getEstatisticasGerais(): Promise<{
    totalVendasValor: number
    totalCustos: number
    lucroTotal: number
    quantidadeItensVendidos: number
    vendasRecentes: GraficaVenda[]
  }> {
    const todasVendas = await pb.collection('grafica_vendas').getFullList<GraficaVenda>({
      sort: '-data_hora,-created',
      expand: 'produto_id',
    })

    const totalVendasValor = todasVendas.reduce((acc, v) => acc + (v.valor_total || 0), 0)
    const totalCustos = todasVendas.reduce((acc, v) => acc + (v.custo_total || 0), 0)
    const lucroTotal = totalVendasValor - totalCustos
    const quantidadeItensVendidos = todasVendas.reduce((acc, v) => acc + (v.quantidade || 1), 0)

    return {
      totalVendasValor,
      totalCustos,
      lucroTotal,
      quantidadeItensVendidos,
      vendasRecentes: todasVendas.slice(0, 50),
    }
  },
}
