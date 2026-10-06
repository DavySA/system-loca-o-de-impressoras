migrate(
  (app) => {
    // 1. Atualizar coleção clientes: adicionar campo contrato_digital (file, max 10MB, pdf e imagens)
    try {
      const clientesCol = app.findCollectionByNameOrId('clientes')
      if (!clientesCol.fields.getByName('contrato_digital')) {
        clientesCol.fields.add(
          new FileField({
            name: 'contrato_digital',
            maxSelect: 1,
            maxSize: 10485760, // 10MB
            mimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
          }),
        )
      }
      // Ajustar regras de clientes para permitir que cliente acesse seu próprio registro
      clientesCol.listRule = "@request.auth.id != ''"
      clientesCol.viewRule = "@request.auth.id != ''"
      app.save(clientesCol)
    } catch (e) {
      console.log('Erro ao atualizar clientesCol:', e)
    }

    // 2. Atualizar coleção ordens_servico: adicionar assinatura_nome (text) e assinatura_cpf (text)
    try {
      const osCol = app.findCollectionByNameOrId('ordens_servico')
      if (!osCol.fields.getByName('assinatura_nome')) {
        osCol.fields.add(new TextField({ name: 'assinatura_nome' }))
      }
      if (!osCol.fields.getByName('assinatura_cpf')) {
        osCol.fields.add(new TextField({ name: 'assinatura_cpf' }))
      }
      app.save(osCol)
    } catch (e) {
      console.log('Erro ao atualizar ordens_servico:', e)
    }

    // 3. Atualizar coleção suprimentos:
    // - equipamento_id passa a ser opcional (required: false)
    // - adicionar valor_venda (number)
    // - adicionar estoque_minimo (number)
    try {
      const suprimentosCol = app.findCollectionByNameOrId('suprimentos')
      const equipField = suprimentosCol.fields.getByName('equipamento_id')
      if (equipField) {
        equipField.required = false
      }
      if (!suprimentosCol.fields.getByName('valor_venda')) {
        suprimentosCol.fields.add(
          new NumberField({
            name: 'valor_venda',
            min: 0,
          }),
        )
      }
      if (!suprimentosCol.fields.getByName('estoque_minimo')) {
        suprimentosCol.fields.add(
          new NumberField({
            name: 'estoque_minimo',
            min: 0,
          }),
        )
      }
      app.save(suprimentosCol)
    } catch (e) {
      console.log('Erro ao atualizar suprimentos:', e)
    }

    // 4. Criar coleção os_pecas: peças/suprimentos utilizados na O.S. com baixa automática
    try {
      app.findCollectionByNameOrId('os_pecas')
    } catch (_) {
      const osCol = app.findCollectionByNameOrId('ordens_servico')
      const suprimentosCol = app.findCollectionByNameOrId('suprimentos')
      const osPecasCol = new Collection({
        name: 'os_pecas',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'os_id',
            type: 'relation',
            required: true,
            collectionId: osCol.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'suprimento_id',
            type: 'relation',
            required: true,
            collectionId: suprimentosCol.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            name: 'descricao_item',
            type: 'text',
            required: true,
          },
          {
            name: 'quantidade',
            type: 'number',
            required: true,
            min: 1,
          },
          {
            name: 'custo_unitario',
            type: 'number',
            min: 0,
          },
          {
            name: 'valor_cobrado',
            type: 'number',
            min: 0,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_ospecas_os ON os_pecas (os_id)',
          'CREATE INDEX idx_ospecas_sup ON os_pecas (suprimento_id)',
        ],
      })
      app.save(osPecasCol)
    }

    // 5. Módulo Gráfica Rápida:
    // 5.1 Coleção grafica_produtos (papéis, adesivos, sulfite, couchê, serviços de cópia/impressão)
    let graficaProdutosId = ''
    try {
      const existing = app.findCollectionByNameOrId('grafica_produtos')
      graficaProdutosId = existing.id
    } catch (_) {
      const suprimentosCol = app.findCollectionByNameOrId('suprimentos')
      const prodCol = new Collection({
        name: 'grafica_produtos',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'nome',
            type: 'text',
            required: true,
          },
          {
            name: 'categoria',
            type: 'select',
            required: true,
            values: [
              'papel_sulfite',
              'papel_couche',
              'adesivo',
              'impressao',
              'copia',
              'scanner',
              'plastificacao',
              'encadernacao',
              'outro',
            ],
            maxSelect: 1,
          },
          {
            name: 'formato_tamanho',
            type: 'text', // A4, A3, Carta, Banner, etc.
          },
          {
            name: 'gramatura',
            type: 'text', // 75g, 90g, 115g, 180g, 250g, 300g
          },
          {
            name: 'tipo_cor',
            type: 'select',
            values: ['mono', 'color', 'ambos', 'nao_se_aplica'],
            maxSelect: 1,
          },
          {
            name: 'suprimento_insumo_id',
            type: 'relation',
            collectionId: suprimentosCol.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            name: 'consumo_insumo_por_unidade',
            type: 'number',
            min: 0,
          },
          {
            name: 'custo_unitario',
            type: 'number',
            required: true,
            min: 0,
          },
          {
            name: 'preco_venda',
            type: 'number',
            required: true,
            min: 0,
          },
          {
            name: 'estoque_atual',
            type: 'number',
            min: 0,
          },
          {
            name: 'estoque_minimo',
            type: 'number',
            min: 0,
          },
          {
            name: 'unidade_medida',
            type: 'select',
            values: ['folha', 'resma', 'metro', 'unidade', 'cento', 'milheiro'],
            maxSelect: 1,
          },
          {
            name: 'ativo',
            type: 'bool',
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_grafica_prod_cat ON grafica_produtos (categoria)',
          'CREATE INDEX idx_grafica_prod_nome ON grafica_produtos (nome)',
        ],
      })
      app.save(prodCol)
      graficaProdutosId = prodCol.id
    }

    // 5.2 Coleção grafica_caixas (abertura e fechamento diário de caixa com contadores de impressoras)
    let graficaCaixasId = ''
    try {
      const existing = app.findCollectionByNameOrId('grafica_caixas')
      graficaCaixasId = existing.id
    } catch (_) {
      const caixasCol = new Collection({
        name: 'grafica_caixas',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'data',
            type: 'date',
            required: true,
          },
          {
            name: 'operador',
            type: 'text',
            required: true,
          },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['aberto', 'fechado'],
            maxSelect: 1,
          },
          {
            name: 'data_abertura',
            type: 'date',
            required: true,
          },
          {
            name: 'data_fechamento',
            type: 'date',
          },
          {
            name: 'saldo_inicial',
            type: 'number',
            min: 0,
          },
          {
            name: 'total_entradas',
            type: 'number',
            min: 0,
          },
          {
            name: 'total_custo_insumos',
            type: 'number',
            min: 0,
          },
          {
            name: 'lucro_total',
            type: 'number',
          },
          {
            name: 'saldo_final_dinheiro',
            type: 'number',
          },
          {
            name: 'observacoes_abertura',
            type: 'text',
          },
          {
            name: 'observacoes_fechamento',
            type: 'text',
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_caixa_data ON grafica_caixas (data DESC)',
          'CREATE INDEX idx_caixa_status ON grafica_caixas (status)',
        ],
      })
      app.save(caixasCol)
      graficaCaixasId = caixasCol.id
    }

    // 5.3 Coleção grafica_caixa_contadores (contadores diários por impressora na abertura e no fechamento: impressão, cópias, scanner, color, mono)
    try {
      app.findCollectionByNameOrId('grafica_caixa_contadores')
    } catch (_) {
      const equipamentosCol = app.findCollectionByNameOrId('equipamentos')
      const caixasCol = app.findCollectionByNameOrId('grafica_caixas')
      const contadoresCol = new Collection({
        name: 'grafica_caixa_contadores',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'caixa_id',
            type: 'relation',
            required: true,
            collectionId: caixasCol.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'equipamento_id',
            type: 'relation',
            required: true,
            collectionId: equipamentosCol.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
          // Abertura
          { name: 'abertura_mono', type: 'number', min: 0 },
          { name: 'abertura_color', type: 'number', min: 0 },
          { name: 'abertura_copias', type: 'number', min: 0 },
          { name: 'abertura_scanner', type: 'number', min: 0 },
          { name: 'abertura_total', type: 'number', min: 0 },
          // Fechamento
          { name: 'fechamento_mono', type: 'number', min: 0 },
          { name: 'fechamento_color', type: 'number', min: 0 },
          { name: 'fechamento_copias', type: 'number', min: 0 },
          { name: 'fechamento_scanner', type: 'number', min: 0 },
          { name: 'fechamento_total', type: 'number', min: 0 },
          // Diferenciais produzidos
          { name: 'delta_mono', type: 'number' },
          { name: 'delta_color', type: 'number' },
          { name: 'delta_copias', type: 'number' },
          { name: 'delta_scanner', type: 'number' },
          { name: 'delta_total', type: 'number' },
          { name: 'observacoes', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_cnt_caixa ON grafica_caixa_contadores (caixa_id)',
          'CREATE INDEX idx_cnt_equip ON grafica_caixa_contadores (equipamento_id)',
        ],
      })
      app.save(contadoresCol)
    }

    // 5.4 Coleção grafica_vendas (vendas/serviços prestados no caixa: ex.: cópia A4 mono, papel sulfite, etc.)
    try {
      app.findCollectionByNameOrId('grafica_vendas')
    } catch (_) {
      const caixasCol = app.findCollectionByNameOrId('grafica_caixas')
      const prodCol = app.findCollectionByNameOrId('grafica_produtos')
      const suprimentosCol = app.findCollectionByNameOrId('suprimentos')
      const vendasCol = new Collection({
        name: 'grafica_vendas',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'caixa_id',
            type: 'relation',
            required: true,
            collectionId: caixasCol.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'data_hora',
            type: 'date',
            required: true,
          },
          {
            name: 'produto_id',
            type: 'relation',
            collectionId: prodCol.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            name: 'descricao',
            type: 'text',
            required: true,
          },
          {
            name: 'quantidade',
            type: 'number',
            required: true,
            min: 1,
          },
          {
            name: 'preco_unitario',
            type: 'number',
            required: true,
            min: 0,
          },
          {
            name: 'valor_total',
            type: 'number',
            required: true,
            min: 0,
          },
          {
            name: 'custo_total',
            type: 'number',
            min: 0,
          },
          {
            name: 'lucro_total',
            type: 'number',
          },
          {
            name: 'forma_pagamento',
            type: 'select',
            values: ['dinheiro', 'pix', 'cartao_debito', 'cartao_credito', 'a_prazo', 'outro'],
            maxSelect: 1,
          },
          {
            name: 'suprimento_baixado_id',
            type: 'relation',
            collectionId: suprimentosCol.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            name: 'quantidade_insumo_baixada',
            type: 'number',
            min: 0,
          },
          {
            name: 'cliente_nome',
            type: 'text',
          },
          {
            name: 'observacoes',
            type: 'text',
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_gvendas_caixa ON grafica_vendas (caixa_id)',
          'CREATE INDEX idx_gvendas_data ON grafica_vendas (data_hora DESC)',
        ],
      })
      app.save(vendasCol)
    }

    // 6. Seed inicial para produtos da gráfica rápida (sulfite, couchê, adesivo, serviços de cópia e impressão)
    try {
      const prodCol = app.findCollectionByNameOrId('grafica_produtos')
      const count = app.countRecords('grafica_produtos')
      if (count === 0) {
        const seedItems = [
          {
            nome: 'Papel Sulfite A4 75g (Chamex/Report)',
            categoria: 'papel_sulfite',
            formato_tamanho: 'A4 (210x297mm)',
            gramatura: '75g',
            tipo_cor: 'nao_se_aplica',
            custo_unitario: 0.05,
            preco_venda: 0.15,
            estoque_atual: 2500,
            estoque_minimo: 500,
            unidade_medida: 'folha',
            ativo: true,
          },
          {
            nome: 'Papel Sulfite A3 75g',
            categoria: 'papel_sulfite',
            formato_tamanho: 'A3 (297x420mm)',
            gramatura: '75g',
            tipo_cor: 'nao_se_aplica',
            custo_unitario: 0.12,
            preco_venda: 0.35,
            estoque_atual: 800,
            estoque_minimo: 200,
            unidade_medida: 'folha',
            ativo: true,
          },
          {
            nome: 'Papel Couchê Brilho A4 150g',
            categoria: 'papel_couche',
            formato_tamanho: 'A4 (210x297mm)',
            gramatura: '150g',
            tipo_cor: 'nao_se_aplica',
            custo_unitario: 0.18,
            preco_venda: 0.5,
            estoque_atual: 600,
            estoque_minimo: 150,
            unidade_medida: 'folha',
            ativo: true,
          },
          {
            nome: 'Papel Couchê Brilho A4 250g',
            categoria: 'papel_couche',
            formato_tamanho: 'A4 (210x297mm)',
            gramatura: '250g',
            tipo_cor: 'nao_se_aplica',
            custo_unitario: 0.28,
            preco_venda: 0.8,
            estoque_atual: 400,
            estoque_minimo: 100,
            unidade_medida: 'folha',
            ativo: true,
          },
          {
            nome: 'Papel Adesivo Fotográfico Glossy A4 135g',
            categoria: 'adesivo',
            formato_tamanho: 'A4 (210x297mm)',
            gramatura: '135g',
            tipo_cor: 'nao_se_aplica',
            custo_unitario: 0.65,
            preco_venda: 2.0,
            estoque_atual: 350,
            estoque_minimo: 80,
            unidade_medida: 'folha',
            ativo: true,
          },
          {
            nome: 'Adesivo Vinil Branco A3',
            categoria: 'adesivo',
            formato_tamanho: 'A3 (297x420mm)',
            gramatura: '150g',
            tipo_cor: 'nao_se_aplica',
            custo_unitario: 1.5,
            preco_venda: 4.5,
            estoque_atual: 200,
            estoque_minimo: 50,
            unidade_medida: 'folha',
            ativo: true,
          },
          {
            nome: 'Cópia A4 Comum Preto & Branco (Mono)',
            categoria: 'copia',
            formato_tamanho: 'A4',
            gramatura: '75g',
            tipo_cor: 'mono',
            custo_unitario: 0.08,
            preco_venda: 0.3,
            consumo_insumo_por_unidade: 1,
            estoque_atual: 5000,
            estoque_minimo: 500,
            unidade_medida: 'unidade',
            ativo: true,
          },
          {
            nome: 'Cópia / Impressão A4 Colorida',
            categoria: 'impressao',
            formato_tamanho: 'A4',
            gramatura: '75g',
            tipo_cor: 'color',
            custo_unitario: 0.25,
            preco_venda: 1.2,
            consumo_insumo_por_unidade: 1,
            estoque_atual: 5000,
            estoque_minimo: 500,
            unidade_medida: 'unidade',
            ativo: true,
          },
          {
            nome: 'Impressão A3 Colorida Couchê',
            categoria: 'impressao',
            formato_tamanho: 'A3',
            gramatura: '150g',
            tipo_cor: 'color',
            custo_unitario: 0.8,
            preco_venda: 3.5,
            consumo_insumo_por_unidade: 1,
            estoque_atual: 1000,
            estoque_minimo: 100,
            unidade_medida: 'unidade',
            ativo: true,
          },
          {
            nome: 'Digitalização / Scanner por Folha',
            categoria: 'scanner',
            formato_tamanho: 'A4/Ofício',
            gramatura: 'Livre',
            tipo_cor: 'ambos',
            custo_unitario: 0.02,
            preco_venda: 0.5,
            consumo_insumo_por_unidade: 0,
            estoque_atual: 99999,
            estoque_minimo: 0,
            unidade_medida: 'unidade',
            ativo: true,
          },
        ]

        for (const item of seedItems) {
          const rec = new Record(prodCol)
          for (const key of Object.keys(item)) {
            rec.set(key, item[key])
          }
          app.save(rec)
        }
      }
    } catch (e) {
      console.log('Erro ao semear grafica_produtos:', e)
    }

    // 7. Atualizar itens de suprimentos para terem valor_venda e estoque_minimo padrão
    try {
      const suprimentosCol = app.findCollectionByNameOrId('suprimentos')
      const sups = app.findRecordsByFilter(
        'suprimentos',
        'valor_venda = null || valor_venda = 0',
        '',
        100,
        0,
      )
      for (const sup of sups) {
        const custo = sup.getInt('custo') || 100
        sup.set('valor_venda', Math.round(custo * 1.5))
        sup.set('estoque_minimo', 2)
        app.save(sup)
      }
    } catch (_) {}
  },
  (app) => {
    // Reverter coleções criadas
    try {
      const v = app.findCollectionByNameOrId('grafica_vendas')
      app.delete(v)
    } catch (_) {}
    try {
      const c = app.findCollectionByNameOrId('grafica_caixa_contadores')
      app.delete(c)
    } catch (_) {}
    try {
      const cx = app.findCollectionByNameOrId('grafica_caixas')
      app.delete(cx)
    } catch (_) {}
    try {
      const p = app.findCollectionByNameOrId('grafica_produtos')
      app.delete(p)
    } catch (_) {}
    try {
      const op = app.findCollectionByNameOrId('os_pecas')
      app.delete(op)
    } catch (_) {}
  },
)
