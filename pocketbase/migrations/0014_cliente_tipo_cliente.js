migrate(
  (app) => {
    const clientesCol = app.findCollectionByNameOrId('clientes')

    // 1. Adicionar campo tipo_cliente (select: 'locacao' | 'particular')
    if (!clientesCol.fields.getByName('tipo_cliente')) {
      clientesCol.fields.add(
        new SelectField({
          name: 'tipo_cliente',
          values: ['locacao', 'particular'],
          maxSelect: 1,
          required: false,
        }),
      )
      app.save(clientesCol)
    }

    // 2. Preencher registros existentes com 'locacao' caso esteja vazio ou nulo
    app
      .db()
      .newQuery(
        "UPDATE clientes SET tipo_cliente = 'locacao' WHERE tipo_cliente IS NULL OR tipo_cliente = ''",
      )
      .execute()
  },
  (app) => {
    try {
      const clientesCol = app.findCollectionByNameOrId('clientes')
      if (clientesCol.fields.getByName('tipo_cliente')) {
        clientesCol.fields.removeByName('tipo_cliente')
        app.save(clientesCol)
      }
    } catch (_) {}
  },
)
