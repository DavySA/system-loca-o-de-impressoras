migrate(
  (app) => {
    // 1. grafica_produtos: garantir categoria como TEXTO LIVRE (a conversão da 0022 não chegou a aplicar)
    try {
      const col = app.findCollectionByNameOrId('grafica_produtos')
      const catField = col.fields.getByName('categoria')
      if (catField && catField.type === 'select') {
        // Converte valores existentes (snake_case) para texto legível antes de trocar o tipo
        try {
          app
            .db()
            .newQuery(
              "UPDATE grafica_produtos SET categoria = REPLACE(REPLACE(REPLACE(categoria, '_', ' '), 'sulfite', 'Sulfite'), 'couche', 'Couché') WHERE categoria LIKE '%\\_%' ESCAPE '\\'",
            )
            .execute()
        } catch (_) {}
        col.fields.removeByName('categoria')
        col.fields.add(new TextField({ name: 'categoria', max: 80 }))
        app.save(col)
        console.log('0023: categoria de grafica_produtos convertida para texto livre')
      }
      // Índice da categoria precisa ser recriado se foi descartado na conversão
      try {
        col.addIndex('idx_grafica_prod_cat', false, 'categoria', '')
        app.save(col)
      } catch (_) {}
    } catch (e) {
      console.log('Erro ao atualizar grafica_produtos (0023):', e)
    }

    // 2. ordens_servico: equipamento opcional (visita sem equipamento conhecido) + solicitante
    try {
      const col = app.findCollectionByNameOrId('ordens_servico')
      const eqField = col.fields.getByName('equipamento_id')
      if (eqField && eqField.required) {
        eqField.required = false
        app.save(col)
        console.log('0023: ordens_servico.equipamento_id tornou-se opcional')
      }
      if (!col.fields.getByName('solicitante')) {
        col.fields.add(new TextField({ name: 'solicitante', max: 160 }))
        app.save(col)
        console.log('0023: campo solicitante adicionado a ordens_servico')
      }
    } catch (e) {
      console.log('Erro ao atualizar ordens_servico (0023):', e)
    }
  },
  (app) => {
    // down: volta categoria para select fixo e equipamento obrigatório
    try {
      const col = app.findCollectionByNameOrId('grafica_produtos')
      const catField = col.fields.getByName('categoria')
      if (catField && catField.type === 'text') {
        col.fields.removeByName('categoria')
        col.fields.add(
          new SelectField({
            name: 'categoria',
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
          }),
        )
        app.save(col)
      }
    } catch (_) {}
    try {
      const col = app.findCollectionByNameOrId('ordens_servico')
      const eqField = col.fields.getByName('equipamento_id')
      if (eqField) {
        eqField.required = true
        app.save(col)
      }
      if (col.fields.getByName('solicitante')) {
        col.fields.removeByName('solicitante')
        app.save(col)
      }
    } catch (_) {}
  },
)
