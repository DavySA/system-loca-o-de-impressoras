migrate(
  (app) => {
    // 0027 (diagnóstico) — reescrita para ser INOFENSIVA e idempotente:
    // apenas converte categoria para texto se ainda estiver como select.
    // Se já for text (aplicado pela 0023/0026), não faz nada.
    try {
      const col = app.findCollectionByNameOrId('grafica_produtos')
      const catField = col.fields.getByName('categoria')
      if (catField && catField.type === 'select') {
        col.fields.removeByName('categoria')
        col.fields.add(new TextField({ name: 'categoria', max: 80 }))
        app.save(col)
        console.log('0027: categoria de grafica_produtos convertida para texto livre')
      }
      // Já é text: nenhuma ação necessária.
    } catch (e) {
      console.log('0027: ignorado:', e)
    }
  },
  (app) => {
    // down: inofensiva — a categoria permanece como texto livre.
    try {
      void app
    } catch (_) {}
  },
)
