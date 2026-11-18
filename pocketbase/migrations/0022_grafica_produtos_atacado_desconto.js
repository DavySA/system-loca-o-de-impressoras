migrate(
  (app) => {
    // 1. grafica_produtos: categoria como texto livre + preço atacado + desconto máximo por produto
    try {
      const col = app.findCollectionByNameOrId('grafica_produtos')

      // Categoria: se for select de lista fechada, converte para texto livre
      const catField = col.fields.getByName('categoria')
      if (catField && catField.type === 'select') {
        col.fields.removeByName('categoria')
        col.fields.add(new TextField({ name: 'categoria', max: 80 }))
        app.save(col)
        console.log('Categoria de grafica_produtos convertida para texto livre')
      }

      if (!col.fields.getByName('preco_atacado')) {
        col.fields.add(new NumberField({ name: 'preco_atacado' }))
        app.save(col)
      }

      if (!col.fields.getByName('desconto_maximo_percentual')) {
        col.fields.add(new NumberField({ name: 'desconto_maximo_percentual' }))
        app.save(col)
      }
    } catch (e) {
      console.log('Erro ao atualizar grafica_produtos (0022):', e)
    }

    // 2. grafica_vendas: desconto, valor entregue (espécie) e troco
    try {
      const col = app.findCollectionByNameOrId('grafica_vendas')

      if (!col.fields.getByName('desconto')) {
        col.fields.add(new NumberField({ name: 'desconto' }))
        app.save(col)
      }

      if (!col.fields.getByName('valor_entregue')) {
        col.fields.add(new NumberField({ name: 'valor_entregue' }))
        app.save(col)
      }

      if (!col.fields.getByName('troco')) {
        col.fields.add(new NumberField({ name: 'troco' }))
        app.save(col)
      }
    } catch (e) {
      console.log('Erro ao atualizar grafica_vendas (0022):', e)
    }

    // 3. grafica_configuracao: desconto máximo padrão (definido pelo administrador)
    try {
      const col = app.findCollectionByNameOrId('grafica_configuracao')

      if (!col.fields.getByName('desconto_maximo_percentual')) {
        col.fields.add(new NumberField({ name: 'desconto_maximo_percentual' }))
        app.save(col)
      }
    } catch (e) {
      console.log('Erro ao atualizar grafica_configuracao (0022):', e)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('grafica_produtos')
      ;['preco_atacado', 'desconto_maximo_percentual'].forEach((n) => {
        if (col.fields.getByName(n)) col.fields.removeByName(n)
      })
      app.save(col)
    } catch (_) {}
    try {
      const col = app.findCollectionByNameOrId('grafica_vendas')
      ;['desconto', 'valor_entregue', 'troco'].forEach((n) => {
        if (col.fields.getByName(n)) col.fields.removeByName(n)
      })
      app.save(col)
    } catch (_) {}
    try {
      const col = app.findCollectionByNameOrId('grafica_configuracao')
      if (col.fields.getByName('desconto_maximo_percentual')) {
        col.fields.removeByName('desconto_maximo_percentual')
        app.save(col)
      }
    } catch (_) {}
  },
)
