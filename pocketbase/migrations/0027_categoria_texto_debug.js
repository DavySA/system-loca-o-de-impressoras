migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('grafica_produtos')
    const catField = col.fields.getByName('categoria')
    if (!catField) {
      throw new Error('0027: campo categoria não existe')
    }
    if (catField.type === 'text') {
      console.log('0027: categoria já é texto livre — nada a fazer')
      return
    }

    // 1. Remove o índice que referencia a coluna — é ele que derruba o save
    //    ("no such column: categoria" durante o rebuild da tabela pelo SQLite)
    try {
      col.removeIndex('idx_grafica_prod_cat')
    } catch (_) {}
    app.save(col)

    // 2. Converte o campo select → text IN-PLACE (o SQLite preserva o valor armazenado)
    const col2 = app.findCollectionByNameOrId('grafica_produtos')
    const cf = col2.fields.getByName('categoria')
    cf.type = 'text'
    cf.required = false
    app.save(col2)

    // 3. Verificação: o campo TEM que ser texto
    const col3 = app.findCollectionByNameOrId('grafica_produtos')
    const cf3 = col3.fields.getByName('categoria')
    if (!cf3 || cf3.type !== 'text') {
      throw new Error(
        '0027: conversão de categoria falhou — tipo final: ' + (cf3 ? cf3.type : 'inexistente'),
      )
    }
    console.log('0027: categoria convertida para texto livre com sucesso')

    // 4. Recria o índice
    try {
      const col4 = app.findCollectionByNameOrId('grafica_produtos')
      col4.addIndex('idx_grafica_prod_cat', false, 'categoria', '')
      app.save(col4)
    } catch (e) {
      console.log('0027: recriação do índice:', e)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('grafica_produtos')
      const cf = col.fields.getByName('categoria')
      if (cf && cf.type === 'text') {
        try {
          col.removeIndex('idx_grafica_prod_cat')
        } catch (_) {}
        app.save(col)
        const col2 = app.findCollectionByNameOrId('grafica_produtos')
        const f2 = col2.fields.getByName('categoria')
        f2.type = 'select'
        f2.set('values', [
          'papel_sulfite',
          'papel_couche',
          'adesivo',
          'impressao',
          'copia',
          'scanner',
          'plastificacao',
          'encadernacao',
          'outro',
        ])
        f2.set('maxSelect', 1)
        f2.required = true
        app.save(col2)
      }
    } catch (e) {
      console.log('0027 down:', e)
    }
  },
)
