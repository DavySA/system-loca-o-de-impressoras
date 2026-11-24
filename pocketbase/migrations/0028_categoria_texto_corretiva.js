migrate(
  (app) => {
    // Correção DIRETA: categoria de grafica_produtos ainda está como select no banco
    // (as guards `catField.type === 'select'` de 0023–0027 nunca dispararam porque,
    // na JSVM do PocketBase, `type` é um MÉTODO do campo, não propriedade — comparar
    // função com string dá sempre false).
    const col = app.findCollectionByNameOrId('grafica_produtos')
    const catField = col.fields.getByName('categoria')
    if (!catField || catField.type() !== 'select') {
      console.log('0028: categoria já é texto livre — nada a fazer')
      return
    }

    // 1. Campo temporário com o novo tipo
    col.fields.add(new TextField({ name: 'categoria_nova', max: 80 }))
    app.save(col)

    // 2. Copia os valores existentes (snake_case → texto legível)
    app
      .db()
      .newQuery(
        "UPDATE grafica_produtos SET categoria_nova = categoria WHERE categoria IS NOT NULL AND categoria != ''",
      )
      .execute()

    // 3. Remove o índice antigo (referencia a coluna antiga) e troca o campo
    try {
      col.removeIndex('idx_grafica_prod_cat')
      app.save(col)
    } catch (_) {}

    col.fields.removeByName('categoria')
    app.save(col)

    // 4. Renomeia o campo novo para 'categoria'
    const col2 = app.findCollectionByNameOrId('grafica_produtos')
    col2.fields.getByName('categoria_nova').name = 'categoria'
    app.save(col2)

    // 5. Recria o índice
    try {
      const col3 = app.findCollectionByNameOrId('grafica_produtos')
      col3.addIndex('idx_grafica_prod_cat', false, 'categoria', '')
      app.save(col3)
    } catch (e) {
      console.log('0028: índice da categoria:', e)
    }

    console.log('0028: grafica_produtos.categoria convertida para texto livre')
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('grafica_produtos')
      const catField = col.fields.getByName('categoria')
      if (catField && catField.type() === 'text') {
        col.fields.removeByName('categoria')
        app.save(col)
        const col2 = app.findCollectionByNameOrId('grafica_produtos')
        col2.fields.add(
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
        app.save(col2)
        col2.addIndex('idx_grafica_prod_cat', false, 'categoria', '')
        app.save(col2)
      }
    } catch (e) {
      console.log('0028 down:', e)
    }
  },
)
