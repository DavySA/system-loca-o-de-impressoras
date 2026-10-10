migrate(
  (app) => {
    try {
      const faturasCol = app.findCollectionByNameOrId('faturas')
      if (!faturasCol.fields.getByName('boleto_pdf')) {
        faturasCol.fields.add(
          new FileField({
            name: 'boleto_pdf',
            maxSelect: 1,
            maxSize: 10485760, // 10MB
            mimeTypes: ['application/pdf'],
          }),
        )
        app.save(faturasCol)
      }
    } catch (e) {
      console.log('Erro ao adicionar campo boleto_pdf em faturas:', e)
      throw e
    }
  },
  (app) => {
    try {
      const faturasCol = app.findCollectionByNameOrId('faturas')
      const campo = faturasCol.fields.getByName('boleto_pdf')
      if (campo) {
        faturasCol.fields.removeByName('boleto_pdf')
        app.save(faturasCol)
      }
    } catch (_) {}
  },
)
