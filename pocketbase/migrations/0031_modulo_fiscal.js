migrate(
  (app) => {
    // 1. Coleção fiscal_configuracao: dados fiscais da empresa emitente
    try {
      app.findCollectionByNameOrId('fiscal_configuracao')
    } catch (_) {
      const col = new Collection({
        name: 'fiscal_configuracao',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'razao_social', type: 'text', required: false, max: 200 },
          { name: 'cnpj', type: 'text', required: false, max: 20 },
          { name: 'inscricao_estadual', type: 'text', required: false, max: 30 },
          { name: 'regime_tributario', type: 'text', required: false, max: 60 },
          { name: 'cnae', type: 'text', required: false, max: 20 },
          { name: 'endereco_logradouro', type: 'text', required: false, max: 200 },
          { name: 'endereco_numero', type: 'text', required: false, max: 20 },
          { name: 'endereco_complemento', type: 'text', required: false, max: 100 },
          { name: 'endereco_bairro', type: 'text', required: false, max: 100 },
          { name: 'endereco_municipio', type: 'text', required: false, max: 100 },
          { name: 'endereco_uf', type: 'text', required: false, max: 2 },
          { name: 'endereco_cep', type: 'text', required: false, max: 12 },
          { name: 'telefone', type: 'text', required: false, max: 30 },
          { name: 'email', type: 'text', required: false, max: 150 },
          { name: 'serie_nota', type: 'text', required: false, max: 10 },
          // Número da próxima nota pode ser 0 em cadastros novos — opcional
          // (gotcha do projeto: 'required' em number exige valor NÃO-zero)
          { name: 'numero_proxima_nota', type: 'number', required: false },
          {
            name: 'ambiente',
            type: 'select',
            required: false,
            values: ['homologacao', 'producao'],
            maxSelect: 1,
          },
          { name: 'cfop_padrao_servico', type: 'text', required: false, max: 10 },
          { name: 'cfop_padrao_mercadoria', type: 'text', required: false, max: 10 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      })
      app.save(col)
      console.log('Coleção fiscal_configuracao criada')
    }

    // 2. Coleção fiscal_certificado: certificado digital A1 (.pfx + senha)
    try {
      app.findCollectionByNameOrId('fiscal_certificado')
    } catch (_) {
      const col = new Collection({
        name: 'fiscal_certificado',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'arquivo', type: 'file', required: false, maxSelect: 1, maxSize: 5242880 },
          { name: 'nome_arquivo', type: 'text', required: false, max: 200 },
          // Senha do .pfx guardada no servidor; nunca retornada ao frontend
          { name: 'senha', type: 'text', required: false, max: 200 },
          { name: 'validade', type: 'date', required: false },
          {
            name: 'status',
            type: 'select',
            required: false,
            values: ['ausente', 'ativo', 'vencido'],
            maxSelect: 1,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_fiscal_cert_updated ON fiscal_certificado (updated DESC)'],
      })
      app.save(col)
      console.log('Coleção fiscal_certificado criada')
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('fiscal_certificado')
      app.delete(col)
    } catch (_) {}
    try {
      const col = app.findCollectionByNameOrId('fiscal_configuracao')
      app.delete(col)
    } catch (_) {}
  },
)
