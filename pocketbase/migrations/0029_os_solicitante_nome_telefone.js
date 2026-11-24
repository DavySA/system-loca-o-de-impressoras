migrate(
  (app) => {
    // Campos do Solicitante na O.S.: o frontend (OrdensServico.tsx / OrdemServicoDetalhe.tsx)
    // usa solicitante_nome + solicitante_telefone; a 0023 criou apenas "solicitante".
    // Alinhar o banco ao frontend: adicionar os dois campos de texto (opcionais).
    const col = app.findCollectionByNameOrId('ordens_servico')

    if (!col.fields.getByName('solicitante_nome')) {
      col.fields.add(new TextField({ name: 'solicitante_nome', max: 160 }))
      console.log('0029: campo solicitante_nome adicionado a ordens_servico')
    }
    if (!col.fields.getByName('solicitante_telefone')) {
      col.fields.add(new TextField({ name: 'solicitante_telefone', max: 40 }))
      console.log('0029: campo solicitante_telefone adicionado a ordens_servico')
    }

    app.save(col)

    // Migrar dado existente do campo único "solicitante" (se houver valor)
    try {
      app
        .db()
        .newQuery(
          "UPDATE ordens_servico SET solicitante_nome = solicitante WHERE (solicitante_nome IS NULL OR solicitante_nome = '') AND solicitante IS NOT NULL AND solicitante != ''",
        )
        .execute()
    } catch (e) {
      console.log('0029: backfill solicitante -> solicitante_nome:', e)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('ordens_servico')
      if (col.fields.getByName('solicitante_nome')) {
        col.fields.removeByName('solicitante_nome')
      }
      if (col.fields.getByName('solicitante_telefone')) {
        col.fields.removeByName('solicitante_telefone')
      }
      app.save(col)
    } catch (_) {}
  },
)
