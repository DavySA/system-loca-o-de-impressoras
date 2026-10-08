migrate(
  (app) => {
    // 1. Campos extras em faturas para registro de envio de e-mail e cobrança
    try {
      const faturasCol = app.findCollectionByNameOrId('faturas')
      if (!faturasCol.fields.getByName('enviada_email_em')) {
        faturasCol.fields.add(
          new DateField({
            name: 'enviada_email_em',
          }),
        )
      }
      if (!faturasCol.fields.getByName('enviada_email_para')) {
        faturasCol.fields.add(
          new TextField({
            name: 'enviada_email_para',
          }),
        )
      }
      if (!faturasCol.fields.getByName('criado_por_user_id')) {
        faturasCol.fields.add(
          new RelationField({
            name: 'criado_por_user_id',
            collectionId: '_pb_users_auth_',
            maxSelect: 1,
          }),
        )
      }
      app.save(faturasCol)
    } catch (e) {
      console.log('Erro ao atualizar campos de faturas:', e)
    }

    // 2. Campo operador_user_id em grafica_caixas e grafica_vendas
    try {
      const caixasCol = app.findCollectionByNameOrId('grafica_caixas')
      if (!caixasCol.fields.getByName('operador_user_id')) {
        caixasCol.fields.add(
          new RelationField({
            name: 'operador_user_id',
            collectionId: '_pb_users_auth_',
            maxSelect: 1,
          }),
        )
        app.save(caixasCol)
      }
    } catch (e) {
      console.log('Erro ao atualizar campos de grafica_caixas:', e)
    }

    try {
      const vendasCol = app.findCollectionByNameOrId('grafica_vendas')
      if (!vendasCol.fields.getByName('operador_user_id')) {
        vendasCol.fields.add(
          new RelationField({
            name: 'operador_user_id',
            collectionId: '_pb_users_auth_',
            maxSelect: 1,
          }),
        )
        app.save(vendasCol)
      }
    } catch (e) {
      console.log('Erro ao atualizar campos de grafica_vendas:', e)
    }

    // 3. Campos em ordens_servico: tipo_atendimento (contrato | particular), valor_servico, valor_pecas, valor_total_particular, tecnico_user_id
    try {
      const osCol = app.findCollectionByNameOrId('ordens_servico')
      if (!osCol.fields.getByName('tipo_atendimento')) {
        osCol.fields.add(
          new SelectField({
            name: 'tipo_atendimento',
            values: ['contrato', 'particular'],
            maxSelect: 1,
          }),
        )
      }
      if (!osCol.fields.getByName('valor_servico')) {
        osCol.fields.add(
          new NumberField({
            name: 'valor_servico',
          }),
        )
      }
      if (!osCol.fields.getByName('valor_pecas')) {
        osCol.fields.add(
          new NumberField({
            name: 'valor_pecas',
          }),
        )
      }
      if (!osCol.fields.getByName('valor_total_particular')) {
        osCol.fields.add(
          new NumberField({
            name: 'valor_total_particular',
          }),
        )
      }
      if (!osCol.fields.getByName('tecnico_user_id')) {
        osCol.fields.add(
          new RelationField({
            name: 'tecnico_user_id',
            collectionId: '_pb_users_auth_',
            maxSelect: 1,
          }),
        )
      }
      app.save(osCol)
    } catch (e) {
      console.log('Erro ao atualizar campos de ordens_servico:', e)
    }

    // 4. Nova coleção: integracao_cora (configuração segura de credenciais da API Cora)
    const usersColId = '_pb_users_auth_'
    const faturasColId = app.findCollectionByNameOrId('faturas').id

    const integracaoCora = new Collection({
      name: 'integracao_cora',
      type: 'base',
      listRule: "@request.auth.id != '' && @request.auth.role = 'administrador'",
      viewRule: "@request.auth.id != '' && @request.auth.role = 'administrador'",
      createRule: "@request.auth.id != '' && @request.auth.role = 'administrador'",
      updateRule: "@request.auth.id != '' && @request.auth.role = 'administrador'",
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'administrador'",
      fields: [
        { name: 'ativo', type: 'bool' },
        {
          name: 'ambiente',
          type: 'select',
          required: true,
          values: ['sandbox', 'producao'],
          maxSelect: 1,
        },
        { name: 'client_id', type: 'text' },
        { name: 'client_secret', type: 'text' },
        { name: 'chave_pix', type: 'text' },
        { name: 'certificado_nome', type: 'text' },
        { name: 'instrucoes_padrao', type: 'text' },
        { name: 'juros_mensal_percentual', type: 'number' },
        { name: 'multa_percentual', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(integracaoCora)

    // 5. Nova coleção: cobrancas_boletos (preparada para emissão Cora vinculada a faturas)
    const cobrancasBoletos = new Collection({
      name: 'cobrancas_boletos',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'administrador'",
      fields: [
        {
          name: 'fatura_id',
          type: 'relation',
          required: true,
          collectionId: faturasColId,
          maxSelect: 1,
          cascadeDelete: true,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['pendente', 'gerado', 'pago', 'cancelado'],
          maxSelect: 1,
        },
        { name: 'cora_invoice_id', type: 'text' },
        { name: 'valor', type: 'number', required: true },
        { name: 'data_vencimento', type: 'date' },
        { name: 'codigo_barras', type: 'text' },
        { name: 'linha_digitavel', type: 'text' },
        { name: 'pix_copia_cola', type: 'text' },
        { name: 'pix_qr_code_url', type: 'text' },
        { name: 'pdf_url', type: 'text' },
        { name: 'criado_por_user_id', type: 'relation', collectionId: usersColId, maxSelect: 1 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_cobranca_fatura ON cobrancas_boletos (fatura_id)',
        'CREATE INDEX idx_cobranca_status ON cobrancas_boletos (status)',
      ],
    })
    app.save(cobrancasBoletos)

    // 6. Nova coleção: metas (Módulo Comissões & Metas)
    const metas = new Collection({
      name: 'metas',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != '' && @request.auth.role = 'administrador'",
      updateRule: "@request.auth.id != '' && @request.auth.role = 'administrador'",
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'administrador'",
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: usersColId,
          maxSelect: 1,
          cascadeDelete: true,
        },
        { name: 'titulo', type: 'text', required: true },
        {
          name: 'periodo',
          type: 'select',
          required: true,
          values: ['mensal', 'trimestral', 'semestral', 'anual'],
          maxSelect: 1,
        },
        { name: 'mes_ano_referencia', type: 'text' }, // Ex: "2025-05"
        { name: 'data_inicio', type: 'date' },
        { name: 'data_fim', type: 'date' },
        {
          name: 'tipo_metrica',
          type: 'select',
          required: true,
          values: [
            'vendas_insumos_grafica',
            'servicos_grafica',
            'os_particulares',
            'faturamento_gerado',
            'atendimentos_concluidos',
          ],
          maxSelect: 1,
        },
        { name: 'valor_objetivo', type: 'number', required: true },
        {
          name: 'tipo_comissao',
          type: 'select',
          values: ['percentual', 'valor_fixo'],
          maxSelect: 1,
        },
        { name: 'valor_comissao', type: 'number' },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['em_andamento', 'atingida', 'nao_atingida', 'cancelada'],
          maxSelect: 1,
        },
        { name: 'observacoes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_metas_user ON metas (user_id)',
        'CREATE INDEX idx_metas_status ON metas (status)',
      ],
    })
    app.save(metas)
  },
  (app) => {
    try {
      const metas = app.findCollectionByNameOrId('metas')
      app.delete(metas)
    } catch (_) {}

    try {
      const cobrancas = app.findCollectionByNameOrId('cobrancas_boletos')
      app.delete(cobrancas)
    } catch (_) {}

    try {
      const cora = app.findCollectionByNameOrId('integracao_cora')
      app.delete(cora)
    } catch (_) {}
  },
)
