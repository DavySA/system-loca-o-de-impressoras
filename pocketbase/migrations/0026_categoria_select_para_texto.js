migrate(
  (app) => {
    // Conversão DIRETA de grafica_produtos.categoria (select → text) com mutação in-place.
    // O PocketBase v0.36 suporta alterar o tipo do campo mutando o objeto Field obtido de
    // col.fields.getByName — o driver converte o valor armazenado no nível do SQLite.
    const col = app.findCollectionByNameOrId('grafica_produtos')
    const catField = col.fields.getByName('categoria')
    if (!catField || catField.type !== 'select') {
      console.log('0026: categoria já é texto livre — nada a fazer')
      return
    }

    catField.type = 'text'
    catField.set('values', null) // propriedade exclusiva de select; precisa sair
    catField.set('maxSelect', 0) // idem
    catField.required = false // texto livre pode ficar em branco
    app.save(col)
    console.log('0026: grafica_produtos.categoria convertida para texto livre')
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('grafica_produtos')
      const catField = col.fields.getByName('categoria')
      if (catField && catField.type === 'text') {
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
      console.log('0026 down:', e)
    }
  },
)
