migrate(
  (app) => {
    // 1. Atualizar users: adicionar role ('administrador' | 'tecnico' | 'cliente') e cliente_id (relação opcional para clientes)
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const clientes = app.findCollectionByNameOrId('clientes')

    if (!users.fields.getByName('role')) {
      users.fields.add(
        new SelectField({
          name: 'role',
          required: true,
          values: ['administrador', 'tecnico', 'cliente'],
          maxSelect: 1,
        }),
      )
    }

    if (!users.fields.getByName('cliente_id')) {
      users.fields.add(
        new RelationField({
          name: 'cliente_id',
          collectionId: clientes.id,
          maxSelect: 1,
        }),
      )
    }

    // Permitir listagem e gerenciamento de usuários por administradores
    users.listRule = "@request.auth.id != ''"
    users.viewRule = "@request.auth.id != ''"
    users.createRule = "@request.auth.id != ''"
    users.updateRule = "@request.auth.id != ''"
    users.deleteRule = "@request.auth.id != ''"
    app.save(users)

    // Atualizar usuário inicial Davy Administrador para role 'administrador'
    try {
      const davy = app.findAuthRecordByEmail('_pb_users_auth_', 'davycontato@hotmail.com')
      davy.set('role', 'administrador')
      app.save(davy)
    } catch (_) {}

    // 2. Atualizar contratos:
    // - numero_contrato (text)
    // - duracao_meses (number)
    // - modalidade ('com_franquia' | 'apenas_excedentes')
    // - valor_scanner (number)
    // - outros_servicos (text)
    const contratos = app.findCollectionByNameOrId('contratos')
    if (!contratos.fields.getByName('numero_contrato')) {
      contratos.fields.add(new TextField({ name: 'numero_contrato' }))
    }
    if (!contratos.fields.getByName('duracao_meses')) {
      contratos.fields.add(new NumberField({ name: 'duracao_meses' }))
    }
    if (!contratos.fields.getByName('modalidade')) {
      contratos.fields.add(
        new SelectField({
          name: 'modalidade',
          values: ['com_franquia', 'apenas_excedentes'],
          maxSelect: 1,
        }),
      )
    }
    if (!contratos.fields.getByName('valor_scanner')) {
      contratos.fields.add(new NumberField({ name: 'valor_scanner' }))
    }
    if (!contratos.fields.getByName('outros_servicos')) {
      contratos.fields.add(new TextField({ name: 'outros_servicos' }))
    }
    app.save(contratos)

    // Preencher contratos existentes com valores padrão
    app
      .db()
      .newQuery(`
      UPDATE contratos
      SET modalidade = 'com_franquia',
          numero_contrato = COALESCE(numero_contrato, 'CTR-' || substr(id, 1, 6)),
          duracao_meses = COALESCE(duracao_meses, 12),
          valor_scanner = COALESCE(valor_scanner, 0),
          outros_servicos = COALESCE(outros_servicos, '')
      WHERE modalidade IS NULL OR modalidade = ''
    `)
      .execute()

    // 3. Atualizar equipamentos:
    // - numero_patrimonio (text)
    const equipamentos = app.findCollectionByNameOrId('equipamentos')
    if (!equipamentos.fields.getByName('numero_patrimonio')) {
      equipamentos.fields.add(new TextField({ name: 'numero_patrimonio' }))
    }
    app.save(equipamentos)

    // Preencher número de patrimônio para equipamentos existentes
    app
      .db()
      .newQuery(`
      UPDATE equipamentos
      SET numero_patrimonio = 'PAT-' || substr(id, 1, 6)
      WHERE numero_patrimonio IS NULL OR numero_patrimonio = ''
    `)
      .execute()

    // 4. Atualizar ordens_servico:
    // - contador_atual (number)
    // - assinatura_desenho (text)
    // - parecer_tecnico (text)
    const osCol = app.findCollectionByNameOrId('ordens_servico')
    if (!osCol.fields.getByName('contador_atual')) {
      osCol.fields.add(new NumberField({ name: 'contador_atual' }))
    }
    if (!osCol.fields.getByName('assinatura_desenho')) {
      osCol.fields.add(new TextField({ name: 'assinatura_desenho' }))
    }
    if (!osCol.fields.getByName('parecer_tecnico')) {
      osCol.fields.add(new TextField({ name: 'parecer_tecnico' }))
    }
    app.save(osCol)

    // 5. Atualizar faturas:
    // - leitura_anterior_mono, leitura_atual_mono
    // - leitura_anterior_color, leitura_atual_color
    // - desconto, acrescimo_servicos, observacoes
    const faturas = app.findCollectionByNameOrId('faturas')
    if (!faturas.fields.getByName('leitura_anterior_mono')) {
      faturas.fields.add(new NumberField({ name: 'leitura_anterior_mono' }))
    }
    if (!faturas.fields.getByName('leitura_atual_mono')) {
      faturas.fields.add(new NumberField({ name: 'leitura_atual_mono' }))
    }
    if (!faturas.fields.getByName('leitura_anterior_color')) {
      faturas.fields.add(new NumberField({ name: 'leitura_anterior_color' }))
    }
    if (!faturas.fields.getByName('leitura_atual_color')) {
      faturas.fields.add(new NumberField({ name: 'leitura_atual_color' }))
    }
    if (!faturas.fields.getByName('desconto')) {
      faturas.fields.add(new NumberField({ name: 'desconto' }))
    }
    if (!faturas.fields.getByName('acrescimo_servicos')) {
      faturas.fields.add(new NumberField({ name: 'acrescimo_servicos' }))
    }
    if (!faturas.fields.getByName('observacoes')) {
      faturas.fields.add(new TextField({ name: 'observacoes' }))
    }
    app.save(faturas)

    // 6. Criar coleção configuracoes_empresa (singleton para cabeçalho de OS e Faturas)
    try {
      app.findCollectionByNameOrId('configuracoes_empresa')
    } catch (_) {
      const configCol = new Collection({
        name: 'configuracoes_empresa',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'razao_social', type: 'text', required: true },
          { name: 'nome_fantasia', type: 'text' },
          { name: 'cnpj', type: 'text' },
          { name: 'inscricao_estadual', type: 'text' },
          { name: 'endereco', type: 'text' },
          { name: 'cidade', type: 'text' },
          { name: 'uf', type: 'text' },
          { name: 'telefone', type: 'text' },
          { name: 'email', type: 'text' },
          { name: 'website', type: 'text' },
          {
            name: 'logo',
            type: 'file',
            maxSelect: 1,
            maxSize: 5242880,
            mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
          },
          { name: 'mensagem_rodape', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      })
      app.save(configCol)

      // Seed padrão da empresa
      const configRec = new Record(configCol)
      configRec.set('razao_social', 'PrintGest Soluções em Outsourcing de Impressão LTDA')
      configRec.set('nome_fantasia', 'PrintGest Locação de Impressoras')
      configRec.set('cnpj', '12.345.678/0001-99')
      configRec.set('inscricao_estadual', '123.456.789.000')
      configRec.set('endereco', 'Av. Paulista, 1500 - Conjunto 82 - Bela Vista')
      configRec.set('cidade', 'São Paulo')
      configRec.set('uf', 'SP')
      configRec.set('telefone', '(11) 3322-1100')
      configRec.set('email', 'contato@printgest.com.br')
      configRec.set('website', 'www.printgest.com.br')
      configRec.set(
        'mensagem_rodape',
        'PrintGest — Eficiência, qualidade e tecnologia em outsourcing de impressão.',
      )
      app.save(configRec)
    }
  },
  (app) => {
    try {
      const configCol = app.findCollectionByNameOrId('configuracoes_empresa')
      app.delete(configCol)
    } catch (_) {}
  },
)
