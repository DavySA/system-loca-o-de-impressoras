migrate(
  (app) => {
    // 1. Em 'clientes': adicionar campo 'cabecalho_cupom' (text)
    try {
      const clientesCol = app.findCollectionByNameOrId('clientes')
      if (!clientesCol.fields.getByName('cabecalho_cupom')) {
        clientesCol.fields.add(
          new TextField({
            name: 'cabecalho_cupom',
            required: false,
          }),
        )
        app.save(clientesCol)
      }
    } catch (e) {
      console.log('Erro ao adicionar cabecalho_cupom em clientes:', e)
    }

    // 2. Em 'grafica_configuracao': adicionar campo 'cabecalho_cupom_padrao' (text)
    try {
      const configCol = app.findCollectionByNameOrId('grafica_configuracao')
      if (!configCol.fields.getByName('cabecalho_cupom_padrao')) {
        configCol.fields.add(
          new TextField({
            name: 'cabecalho_cupom_padrao',
            required: false,
          }),
        )
        app.save(configCol)
      }
    } catch (e) {
      console.log('Erro ao adicionar cabecalho_cupom_padrao em grafica_configuracao:', e)
    }

    // 3. Em 'grafica_vendas': adicionar campos opcionais de cliente e agrupamento de cupom
    try {
      const vendasCol = app.findCollectionByNameOrId('grafica_vendas')

      if (!vendasCol.fields.getByName('cliente_documento')) {
        vendasCol.fields.add(
          new TextField({
            name: 'cliente_documento',
            required: false,
          }),
        )
      }

      if (!vendasCol.fields.getByName('cliente_telefone')) {
        vendasCol.fields.add(
          new TextField({
            name: 'cliente_telefone',
            required: false,
          }),
        )
      }

      if (!vendasCol.fields.getByName('numero_cupom')) {
        vendasCol.fields.add(
          new TextField({
            name: 'numero_cupom',
            required: false,
          }),
        )
      }

      if (!vendasCol.fields.getByName('itens_cupom')) {
        vendasCol.fields.add(
          new JSONField({
            name: 'itens_cupom',
            required: false,
          }),
        )
      }

      app.save(vendasCol)
    } catch (e) {
      console.log('Erro ao adicionar campos na tabela grafica_vendas:', e)
    }
  },
  (app) => {
    try {
      const clientesCol = app.findCollectionByNameOrId('clientes')
      clientesCol.fields.removeByName('cabecalho_cupom')
      app.save(clientesCol)
    } catch (_) {}

    try {
      const configCol = app.findCollectionByNameOrId('grafica_configuracao')
      configCol.fields.removeByName('cabecalho_cupom_padrao')
      app.save(configCol)
    } catch (_) {}

    try {
      const vendasCol = app.findCollectionByNameOrId('grafica_vendas')
      vendasCol.fields.removeByName('cliente_documento')
      vendasCol.fields.removeByName('cliente_telefone')
      vendasCol.fields.removeByName('numero_cupom')
      vendasCol.fields.removeByName('itens_cupom')
      app.save(vendasCol)
    } catch (_) {}
  },
)
