migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('configuracoes_empresa')
    if (!col.fields.getByName('portal_url')) {
      col.fields.add(
        new TextField({
          name: 'portal_url',
        }),
      )
      app.save(col)
    }

    // Preencher o valor padrão 'https://sistema.tdtechnology.com.br' nos registros existentes
    try {
      const records = app.findRecordsByFilter(
        'configuracoes_empresa',
        'id != ""',
        '-created',
        10,
        0,
      )
      for (let i = 0; i < records.length; i++) {
        const rec = records[i]
        if (!rec.getString('portal_url')) {
          rec.set('portal_url', 'https://sistema.tdtechnology.com.br')
          app.save(rec)
        }
      }
    } catch (e) {
      console.log('Aviso ao inicializar portal_url padrão:', e)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('configuracoes_empresa')
      const field = col.fields.getByName('portal_url')
      if (field) {
        col.fields.removeByName('portal_url')
        app.save(col)
      }
    } catch (_) {}
  },
)
