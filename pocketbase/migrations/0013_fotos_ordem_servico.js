migrate(
  (app) => {
    try {
      const osCol = app.findCollectionByNameOrId('ordens_servico')

      // 1. Campo opcional para foto da ordem impressa e assinada (foto única, max 10MB)
      if (!osCol.fields.getByName('foto_assinada')) {
        osCol.fields.add(
          new FileField({
            name: 'foto_assinada',
            maxSelect: 1,
            maxSize: 10485760, // 10MB
            mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
          }),
        )
      }

      // 2. Campo opcional para fotos comprobatórias do serviço executado (múltiplas fotos, max 10MB cada)
      if (!osCol.fields.getByName('fotos_comprovantes')) {
        osCol.fields.add(
          new FileField({
            name: 'fotos_comprovantes',
            maxSelect: 10,
            maxSize: 10485760, // 10MB
            mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
          }),
        )
      }

      app.save(osCol)
    } catch (e) {
      console.log('Erro ao adicionar campos de fotos em ordens_servico:', e)
      throw e
    }
  },
  (app) => {
    try {
      const osCol = app.findCollectionByNameOrId('ordens_servico')
      let changed = false
      if (osCol.fields.getByName('foto_assinada')) {
        osCol.fields.removeByName('foto_assinada')
        changed = true
      }
      if (osCol.fields.getByName('fotos_comprovantes')) {
        osCol.fields.removeByName('fotos_comprovantes')
        changed = true
      }
      if (changed) {
        app.save(osCol)
      }
    } catch (_) {}
  },
)
