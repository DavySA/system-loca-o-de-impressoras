migrate(
  (app) => {
    // Adiciona o campo 'codigo' (SKU) opcional em 'grafica_produtos',
    // permitindo cadastrar e editar o código do produto na Gráfica Rápida.
    try {
      const col = app.findCollectionByNameOrId('grafica_produtos')

      if (!col.fields.getByName('codigo')) {
        col.fields.add(new TextField({ name: 'codigo', max: 50 }))
        app.save(col)
      }
    } catch (e) {
      console.log('Erro ao adicionar campo codigo em grafica_produtos:', e)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('grafica_produtos')
      if (col.fields.getByName('codigo')) {
        col.fields.removeByName('codigo')
        app.save(col)
      }
    } catch (_) {}
  },
)
