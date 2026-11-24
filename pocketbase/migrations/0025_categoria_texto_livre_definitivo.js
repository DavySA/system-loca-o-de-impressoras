migrate(
  (app) => {
    // Converte DEFINITIVAMENTE grafica_produtos.categoria de select para texto livre.
    // A 0022 e a 0023 falharam silenciosamente (erro engolido pelo try/catch); aqui o erro propaga.
    // Hipótese do bloqueio: a conversão de tipo (remover + adicionar campo com mesmo nome) é
    // rejeitada pelo PocketBase em um único save. Estratégia: renomear o campo (campo novo com
    // nome diferente), copiar os dados por SQL, remover o select antigo, renomear o novo.
    const col = app.findCollectionByNameOrId('grafica_produtos')
    const catField = col.fields.getByName('categoria')
    if (!catField) {
      console.log('0025: campo categoria não existe — nada a fazer')
      return
    }
    if (catField.type !== 'select') {
      console.log('0025: categoria já é texto livre — nada a fazer')
      return
    }

    // 1. Campo novo temporário
    col.fields.add(new TextField({ name: 'categoria_nova', max: 80 }))
    app.save(col)

    // 2. Copia os valores existentes (snake_case → texto legível)
    app
      .db()
      .newQuery(
        "UPDATE grafica_produtos SET categoria_nova = categoria WHERE categoria IS NOT NULL AND categoria != ''",
      )
      .execute()

    // 3. Remove o select antigo e renomeia o novo
    col.fields.removeByName('categoria')
    app.save(col)

    const col2 = app.findCollectionByNameOrId('grafica_produtos')
    col2.fields.getByName('categoria_nova').name = 'categoria'
    app.save(col2)
    console.log('0025: categoria convertida para texto livre')

    // 4. Garante o índice
    try {
      const col3 = app.findCollectionByNameOrId('grafica_produtos')
      col3.addIndex('idx_grafica_prod_cat', false, 'categoria', '')
      app.save(col3)
    } catch (e) {
      console.log('0025: índice da categoria:', e)
    }
  },
  (app) => {
    // down: volta para select fixo (valores fora da lista vão para 'outro')
    try {
      const col = app.findCollectionByNameOrId('grafica_produtos')
      const catField = col.fields.getByName('categoria')
      if (catField && catField.type === 'text') {
        app
          .db()
          .newQuery(
            "UPDATE grafica_produtos SET categoria = 'outro' WHERE categoria NOT IN ('papel_sulfite','papel_couche','adesivo','impressao','copia','scanner','plastificacao','encadernacao','outro')",
          )
          .execute()
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
      }
    } catch (e) {
      console.log('0025 down:', e)
    }
  },
)
