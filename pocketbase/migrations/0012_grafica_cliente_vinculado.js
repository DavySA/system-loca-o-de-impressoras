migrate(
  (app) => {
    try {
      const configCol = app.findCollectionByNameOrId('grafica_configuracao')
      const clientesCol = app.findCollectionByNameOrId('clientes')

      if (!configCol.fields.getByName('cliente_grafica_id')) {
        configCol.fields.add(
          new RelationField({
            name: 'cliente_grafica_id',
            collectionId: clientesCol.id,
            maxSelect: 1,
          }),
        )
        app.save(configCol)
      }
    } catch (e) {
      console.log('Erro ao adicionar cliente_grafica_id em grafica_configuracao:', e)
    }
  },
  (app) => {
    try {
      const configCol = app.findCollectionByNameOrId('grafica_configuracao')
      configCol.fields.removeByName('cliente_grafica_id')
      app.save(configCol)
    } catch (_) {}
  },
)
