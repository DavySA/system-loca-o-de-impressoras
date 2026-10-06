migrate(
  (app) => {
    // 1. Coleção clientes
    const clientes = new Collection({
      name: 'clientes',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'nome_razao_social', type: 'text', required: true },
        {
          name: 'tipo',
          type: 'select',
          required: true,
          values: ['Pessoa Jurídica', 'Pessoa Física'],
          maxSelect: 1,
        },
        { name: 'documento', type: 'text' },
        { name: 'email', type: 'text' },
        { name: 'telefone', type: 'text' },
        { name: 'cidade', type: 'text' },
        { name: 'uf', type: 'text', max: 2 },
        { name: 'endereco', type: 'text' },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['ativo', 'inativo'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_clientes_status ON clientes (status)'],
    })
    app.save(clientes)

    // 2. Coleção equipamentos
    const equipamentos = new Collection({
      name: 'equipamentos',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'marca', type: 'text', required: true },
        { name: 'modelo', type: 'text', required: true },
        { name: 'numero_serie', type: 'text', required: true },
        { name: 'contador_monocromatico', type: 'number' },
        { name: 'contador_colorido', type: 'number' },
        { name: 'data_aquisicao', type: 'date' },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['disponivel', 'locado', 'em_manutencao', 'inativo'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_equipamentos_numero_serie ON equipamentos (numero_serie)',
        'CREATE INDEX idx_equipamentos_status ON equipamentos (status)',
      ],
    })
    app.save(equipamentos)

    // 3. Coleção servicos
    const servicos = new Collection({
      name: 'servicos',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'descricao', type: 'text' },
        {
          name: 'categoria',
          type: 'select',
          required: true,
          values: [
            'Manutenção Preventiva',
            'Manutenção Corretiva',
            'Instalação',
            'Suprimentos',
            'Visita Técnica',
          ],
          maxSelect: 1,
        },
        { name: 'preco', type: 'number', required: true },
        { name: 'duracao_estimada', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_servicos_categoria ON servicos (categoria)'],
    })
    app.save(servicos)

    const clientesColId = app.findCollectionByNameOrId('clientes').id
    const equipamentosColId = app.findCollectionByNameOrId('equipamentos').id
    const servicosColId = app.findCollectionByNameOrId('servicos').id

    // 4. Coleção contratos
    const contratos = new Collection({
      name: 'contratos',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'cliente_id',
          type: 'relation',
          required: true,
          collectionId: clientesColId,
          maxSelect: 1,
        },
        {
          name: 'equipamento_id',
          type: 'relation',
          required: true,
          collectionId: equipamentosColId,
          maxSelect: 1,
        },
        { name: 'data_inicio', type: 'date', required: true },
        { name: 'data_fim', type: 'date' },
        { name: 'valor_mensal', type: 'number', required: true },
        { name: 'paginas_contratadas_mensais', type: 'number' },
        { name: 'valor_pagina_excedente', type: 'number' },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['ativo', 'inativo', 'encerrado'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_contratos_cliente ON contratos (cliente_id)',
        'CREATE INDEX idx_contratos_equipamento ON contratos (equipamento_id)',
        'CREATE INDEX idx_contratos_status ON contratos (status)',
      ],
    })
    app.save(contratos)

    const contratosColId = app.findCollectionByNameOrId('contratos').id

    // 5. Coleção ordens_servico
    const ordensServico = new Collection({
      name: 'ordens_servico',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'cliente_id',
          type: 'relation',
          required: true,
          collectionId: clientesColId,
          maxSelect: 1,
        },
        {
          name: 'equipamento_id',
          type: 'relation',
          required: true,
          collectionId: equipamentosColId,
          maxSelect: 1,
        },
        {
          name: 'servico_id',
          type: 'relation',
          required: true,
          collectionId: servicosColId,
          maxSelect: 1,
        },
        {
          name: 'prioridade',
          type: 'select',
          required: true,
          values: ['baixa', 'media', 'alta'],
          maxSelect: 1,
        },
        { name: 'descricao_problema', type: 'text', required: true },
        { name: 'data_agendada', type: 'date' },
        { name: 'data_abertura', type: 'date' },
        { name: 'data_conclusao', type: 'date' },
        { name: 'tecnico_responsavel', type: 'text' },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['aberta', 'em_andamento', 'aguardando_peca', 'concluida'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_os_cliente ON ordens_servico (cliente_id)',
        'CREATE INDEX idx_os_equipamento ON ordens_servico (equipamento_id)',
        'CREATE INDEX idx_os_servico ON ordens_servico (servico_id)',
        'CREATE INDEX idx_os_status ON ordens_servico (status)',
      ],
    })
    app.save(ordensServico)

    const osColId = app.findCollectionByNameOrId('ordens_servico').id

    // 6. Coleção atualizacoes_os
    const atualizacoesOs = new Collection({
      name: 'atualizacoes_os',
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
          collectionId: osColId,
          maxSelect: 1,
          cascadeDelete: true,
        },
        { name: 'autor', type: 'text', required: true },
        { name: 'comentario', type: 'text', required: true },
        {
          name: 'status_na_ocasiao',
          type: 'select',
          required: true,
          values: ['aberta', 'em_andamento', 'aguardando_peca', 'concluida'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_atualizacoes_os ON atualizacoes_os (os_id)'],
    })
    app.save(atualizacoesOs)

    // 7. Coleção faturas
    const faturas = new Collection({
      name: 'faturas',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'contrato_id',
          type: 'relation',
          required: true,
          collectionId: contratosColId,
          maxSelect: 1,
        },
        {
          name: 'cliente_id',
          type: 'relation',
          required: true,
          collectionId: clientesColId,
          maxSelect: 1,
        },
        { name: 'mes_referencia', type: 'text', required: true },
        { name: 'paginas_contratadas', type: 'number', required: true },
        { name: 'paginas_consumidas', type: 'number', required: true },
        { name: 'paginas_excedentes', type: 'number' },
        { name: 'valor_base', type: 'number', required: true },
        { name: 'valor_excedente', type: 'number' },
        { name: 'valor_total', type: 'number', required: true },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['gerada', 'paga', 'vencida', 'cancelada'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_faturas_contrato ON faturas (contrato_id)',
        'CREATE INDEX idx_faturas_cliente ON faturas (cliente_id)',
        'CREATE INDEX idx_faturas_mes ON faturas (mes_referencia)',
        'CREATE INDEX idx_faturas_status ON faturas (status)',
      ],
    })
    app.save(faturas)
  },
  (app) => {
    const collections = [
      'faturas',
      'atualizacoes_os',
      'ordens_servico',
      'contratos',
      'servicos',
      'equipamentos',
      'clientes',
    ]
    for (const name of collections) {
      try {
        const col = app.findCollectionByNameOrId(name)
        app.delete(col)
      } catch (_) {}
    }
  },
)
