migrate(
  (app) => {
    // 1. Atualizar select de 'role' em users para incluir 'operador'
    try {
      const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      const roleField = usersCol.fields.getByName('role')
      if (roleField) {
        roleField.values = ['administrador', 'tecnico', 'cliente', 'operador']
        roleField.maxSelect = 1
        app.save(usersCol)
      }
    } catch (e) {
      console.log('Erro ao atualizar role em users:', e)
    }

    // 2. Atualizar configuracoes_empresa para adicionar redes sociais
    try {
      const cfgCol = app.findCollectionByNameOrId('configuracoes_empresa')
      if (!cfgCol.fields.getByName('whatsapp')) {
        cfgCol.fields.add(new TextField({ name: 'whatsapp' }))
      }
      if (!cfgCol.fields.getByName('instagram')) {
        cfgCol.fields.add(new TextField({ name: 'instagram' }))
      }
      if (!cfgCol.fields.getByName('facebook')) {
        cfgCol.fields.add(new TextField({ name: 'facebook' }))
      }
      if (!cfgCol.fields.getByName('linkedin')) {
        cfgCol.fields.add(new TextField({ name: 'linkedin' }))
      }
      app.save(cfgCol)
    } catch (e) {
      console.log('Erro ao atualizar configuracoes_empresa:', e)
    }

    // 3. Atualizar grafica_caixas:
    // - Adicionar equipamento_id (relation para equipamentos)
    try {
      const caixasCol = app.findCollectionByNameOrId('grafica_caixas')
      const equipCol = app.findCollectionByNameOrId('equipamentos')
      if (!caixasCol.fields.getByName('equipamento_id')) {
        caixasCol.fields.add(
          new RelationField({
            name: 'equipamento_id',
            collectionId: equipCol.id,
            maxSelect: 1,
            cascadeDelete: false,
          }),
        )
      }
      // Contadores principais diretamente no caixa para facilidade e imutabilidade
      if (!caixasCol.fields.getByName('contador_anterior_mono')) {
        caixasCol.fields.add(new NumberField({ name: 'contador_anterior_mono', min: 0 }))
      }
      if (!caixasCol.fields.getByName('contador_anterior_color')) {
        caixasCol.fields.add(new NumberField({ name: 'contador_anterior_color', min: 0 }))
      }
      if (!caixasCol.fields.getByName('contador_abertura_mono')) {
        caixasCol.fields.add(new NumberField({ name: 'contador_abertura_mono', min: 0 }))
      }
      if (!caixasCol.fields.getByName('contador_abertura_color')) {
        caixasCol.fields.add(new NumberField({ name: 'contador_abertura_color', min: 0 }))
      }
      if (!caixasCol.fields.getByName('contador_fechamento_mono')) {
        caixasCol.fields.add(new NumberField({ name: 'contador_fechamento_mono', min: 0 }))
      }
      if (!caixasCol.fields.getByName('contador_fechamento_color')) {
        caixasCol.fields.add(new NumberField({ name: 'contador_fechamento_color', min: 0 }))
      }
      if (!caixasCol.fields.getByName('producao_mono')) {
        caixasCol.fields.add(new NumberField({ name: 'producao_mono', min: 0 }))
      }
      if (!caixasCol.fields.getByName('producao_color')) {
        caixasCol.fields.add(new NumberField({ name: 'producao_color', min: 0 }))
      }
      app.save(caixasCol)
    } catch (e) {
      console.log('Erro ao atualizar grafica_caixas:', e)
    }
  },
  (app) => {
    // Reverter campos se necessário
    try {
      const cfgCol = app.findCollectionByNameOrId('configuracoes_empresa')
      const fieldsToRemove = ['whatsapp', 'instagram', 'facebook', 'linkedin']
      fieldsToRemove.forEach((f) => {
        const field = cfgCol.fields.getByName(f)
        if (field) cfgCol.fields.removeByName(f)
      })
      app.save(cfgCol)
    } catch (_) {}
  },
)
