migrate(
  (app) => {
    // 1. Atualizar equipamentos:
    // - Adicionar 'particular' às opções de status (disponivel, locado, em_manutencao, particular, inativo)
    // - Adicionar campo relation opcional 'cliente_id' -> clientes
    const equipamentosCol = app.findCollectionByNameOrId('equipamentos')
    const statusField = equipamentosCol.fields.getByName('status')
    if (statusField) {
      statusField.values = ['disponivel', 'locado', 'em_manutencao', 'particular', 'inativo']
      statusField.maxSelect = 1
    }

    if (!equipamentosCol.fields.getByName('cliente_id')) {
      const clientesCol = app.findCollectionByNameOrId('clientes')
      equipamentosCol.fields.add(
        new RelationField({
          name: 'cliente_id',
          collectionId: clientesCol.id,
          maxSelect: 1,
          required: false,
        }),
      )
    }

    app.save(equipamentosCol)

    // 2. Atualizar ordens_servico:
    // - Tornar o campo relation 'servico_id' opcional (required = false)
    const osCol = app.findCollectionByNameOrId('ordens_servico')
    const servicoField = osCol.fields.getByName('servico_id')
    if (servicoField) {
      servicoField.required = false
      app.save(osCol)
    }

    // 3. Sincronizar clientes atuais dos equipamentos que já estão em contratos ativos
    try {
      const contratosAtivos = app.findRecordsByFilter(
        'contratos',
        'status = "ativo"',
        '-created',
        500,
        0,
      )
      for (let i = 0; i < contratosAtivos.length; i++) {
        const c = contratosAtivos[i]
        const eqId = c.getString('equipamento_id')
        const cliId = c.getString('cliente_id')
        if (eqId && cliId) {
          try {
            const eq = app.findFirstRecordByData('equipamentos', 'id', eqId)
            if (!eq.getString('cliente_id')) {
              eq.set('cliente_id', cliId)
              app.save(eq)
            }
          } catch (_) {}
        }
      }
    } catch (e) {
      console.log('Aviso ao sincronizar cliente_id em equipamentos:', e)
    }
  },
  (app) => {
    try {
      const equipamentosCol = app.findCollectionByNameOrId('equipamentos')
      if (equipamentosCol.fields.getByName('cliente_id')) {
        equipamentosCol.fields.removeByName('cliente_id')
      }
      const statusField = equipamentosCol.fields.getByName('status')
      if (statusField) {
        statusField.values = ['disponivel', 'locado', 'em_manutencao', 'inativo']
      }
      app.save(equipamentosCol)
    } catch (_) {}

    try {
      const osCol = app.findCollectionByNameOrId('ordens_servico')
      const servicoField = osCol.fields.getByName('servico_id')
      if (servicoField) {
        servicoField.required = true
        app.save(osCol)
      }
    } catch (_) {}
  },
)
