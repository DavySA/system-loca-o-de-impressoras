migrate(
  (app) => {
    // Categoria de grafica_produtos → texto livre.
    // A conversão falhou antes porque o índice idx_grafica_prod_cat referencia a coluna:
    // remover o índice primeiro e depois trocar o campo.
    const col = app.findCollectionByNameOrId('grafica_produtos')
    const catField = col.fields.getByName('categoria')
    if (catField && catField.type === 'select') {
      // 1. preserva os valores atuais em coluna temporária
      if (!col.fields.getByName('categoria_tmp')) {
        col.fields.add(new TextField({ name: 'categoria_tmp', max: 80 }))
        app.save(col)
      }
      app.db().newQuery('UPDATE grafica_produtos SET categoria_tmp = categoria').execute()

      // 2. remove o índice que referencia a coluna
      try {
        col.removeIndex('idx_grafica_prod_cat')
        app.save(col)
      } catch (_) {}

      // 3. troca o campo select por texto
      col.fields.removeByName('categoria')
      col.fields.add(new TextField({ name: 'categoria', max: 80 }))
      app.save(col)

      // 4. restaura os valores e remove a temporária
      app.db().newQuery('UPDATE grafica_produtos SET categoria = categoria_tmp').execute()
      col.fields.removeByName('categoria_tmp')
      app.save(col)

      // 5. recria o índice
      col.addIndex('idx_grafica_prod_cat', false, 'categoria', '')
      app.save(col)
      console.log('0024: categoria de grafica_produtos convertida para texto livre')
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('grafica_produtos')
      const catField = col.fields.getByName('categoria')
      if (catField && catField.type === 'text') {
        try {
          col.removeIndex('idx_grafica_prod_cat')
          app.save(col)
        } catch (_) {}
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
        col.addIndex('idx_grafica_prod_cat', false, 'categoria', '')
        app.save(col)
      }
    } catch (_) {}
  },
)
