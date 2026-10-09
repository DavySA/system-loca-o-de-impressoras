migrate(
  (app) => {
    // 1. Criar coleção grafica_configuracao para persistir equipamentos lotados no ambiente da Gráfica Rápida
    const equipamentosColId = app.findCollectionByNameOrId('equipamentos').id

    let configCol
    try {
      configCol = app.findCollectionByNameOrId('grafica_configuracao')
    } catch (_) {
      configCol = new Collection({
        name: 'grafica_configuracao',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != '' && @request.auth.role = 'administrador'",
        updateRule: "@request.auth.id != '' && @request.auth.role = 'administrador'",
        deleteRule: "@request.auth.id != '' && @request.auth.role = 'administrador'",
        fields: [
          {
            name: 'equipamentos_lotados_ids',
            type: 'relation',
            collectionId: equipamentosColId,
            maxSelect: 50,
          },
          { name: 'observacoes', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      })
      app.save(configCol)
    }

    // Semear registro inicial de configuração da gráfica se não existir, lotando os equipamentos disponíveis
    try {
      const records = app.findRecordsByFilter('grafica_configuracao', 'id != ""', '-created', 1, 0)
      if (records.length === 0) {
        const todosEquips = app.findRecordsByFilter(
          'equipamentos',
          'status != "inativo"',
          '-created',
          50,
          0,
        )
        const rec = new Record(configCol)
        const ids = todosEquips.map((e) => e.id)
        rec.set('equipamentos_lotados_ids', ids)
        rec.set('observacoes', 'Equipamentos alocados no ambiente de gráfica rápida.')
        app.save(rec)
      }
    } catch (e) {
      console.log('Aviso ao semear grafica_configuracao inicial:', e)
    }

    // 2. Adicionar campo equipamentos_ids (relação múltipla com equipamentos) em grafica_caixas
    try {
      const caixasCol = app.findCollectionByNameOrId('grafica_caixas')
      if (!caixasCol.fields.getByName('equipamentos_ids')) {
        caixasCol.fields.add(
          new RelationField({
            name: 'equipamentos_ids',
            collectionId: equipamentosColId,
            maxSelect: 50,
          }),
        )
        app.save(caixasCol)
      }
    } catch (e) {
      console.log('Erro ao adicionar equipamentos_ids em grafica_caixas:', e)
    }

    // 3. Atualizar nome padrão em configuracoes_empresa se contiver nome antigo
    try {
      const configs = app.findRecordsByFilter('configuracoes_empresa', 'id != ""', '-created', 1, 0)
      if (configs.length > 0) {
        const conf = configs[0]
        if (conf.getString('nome_fantasia') === 'TD Technology System ERP') {
          conf.set('nome_fantasia', 'STD')
          app.save(conf)
        }
      }
    } catch (e) {
      console.log('Aviso ao atualizar nome_fantasia padrão em configuracoes_empresa:', e)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('grafica_configuracao')
      app.delete(col)
    } catch (_) {}

    try {
      const caixasCol = app.findCollectionByNameOrId('grafica_caixas')
      caixasCol.fields.removeByName('equipamentos_ids')
      app.save(caixasCol)
    } catch (_) {}
  },
)
