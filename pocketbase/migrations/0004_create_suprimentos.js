migrate(
  (app) => {
    // 1. Atualizar nome da empresa nas configurações padrão para TD Technology System ERP se ainda estiver com PrintGest
    try {
      const configCol = app.findCollectionByNameOrId('configuracoes_empresa')
      const configs = app.findRecordsByFilter('configuracoes_empresa', '', '-created', 1, 0)
      if (configs && configs.length > 0) {
        const conf = configs[0]
        if (conf.getString('razao_social').includes('PrintGest')) {
          conf.set('razao_social', 'TD Technology System Soluções em Tecnologia e Outsourcing LTDA')
          conf.set('nome_fantasia', 'TD Technology System ERP')
          conf.set(
            'mensagem_rodape',
            'TD Technology System ERP — Eficiência, qualidade e tecnologia em outsourcing de impressão.',
          )
          conf.set('email', 'contato@tdtechnology.com.br')
          conf.set('website', 'www.tdtechnology.com.br')
          app.save(conf)
        }
      }
    } catch (_) {}

    // 2. Criar coleção suprimentos:
    // data (date), tipo (select: toner | cartucho_tinta | cilindro | fusor | correia | peca | outro), item (text/descricao), quantidade (number), custo (number), equipamento_id (relation -> equipamentos), observacoes (text)
    try {
      app.findCollectionByNameOrId('suprimentos')
    } catch (_) {
      const equipamentos = app.findCollectionByNameOrId('equipamentos')
      const suprimentosCol = new Collection({
        name: 'suprimentos',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'equipamento_id',
            type: 'relation',
            required: true,
            collectionId: equipamentos.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            name: 'data',
            type: 'date',
            required: true,
          },
          {
            name: 'tipo',
            type: 'select',
            required: true,
            values: ['toner', 'cartucho_tinta', 'cilindro', 'fusor', 'correia', 'peca', 'outro'],
            maxSelect: 1,
          },
          {
            name: 'item',
            type: 'text',
            required: true,
          },
          {
            name: 'quantidade',
            type: 'number',
            required: true,
            min: 1,
          },
          {
            name: 'custo',
            type: 'number',
            required: true,
            min: 0,
          },
          {
            name: 'observacoes',
            type: 'text',
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_suprimentos_equipamento ON suprimentos (equipamento_id)',
          'CREATE INDEX idx_suprimentos_tipo ON suprimentos (tipo)',
          'CREATE INDEX idx_suprimentos_data ON suprimentos (data DESC)',
        ],
      })
      app.save(suprimentosCol)

      // Adicionar alguns registros iniciais de suprimentos para os equipamentos existentes
      try {
        const eqList = app.findRecordsByFilter('equipamentos', '', '-created', 3, 0)
        if (eqList && eqList.length > 0) {
          const rec1 = new Record(suprimentosCol)
          rec1.set('equipamento_id', eqList[0].id)
          rec1.set('data', '2025-01-15 10:00:00.000Z')
          rec1.set('tipo', 'toner')
          rec1.set('item', 'Toner Preto de Alto Rendimento')
          rec1.set('quantidade', 2)
          rec1.set('custo', 320.0)
          rec1.set('observacoes', 'Instalação de rotina')
          app.save(rec1)

          const rec2 = new Record(suprimentosCol)
          rec2.set('equipamento_id', eqList[0].id)
          rec2.set('data', '2025-02-10 14:30:00.000Z')
          rec2.set('tipo', 'cilindro')
          rec2.set('item', 'Unidade de Cilindro Fotocondutor')
          rec2.set('quantidade', 1)
          rec2.set('custo', 180.0)
          rec2.set('observacoes', 'Substituição preventiva')
          app.save(rec2)

          if (eqList.length > 1) {
            const rec3 = new Record(suprimentosCol)
            rec3.set('equipamento_id', eqList[1].id)
            rec3.set('data', '2025-02-01 09:00:00.000Z')
            rec3.set('tipo', 'toner')
            rec3.set('item', 'Kit Toner Color (C/M/Y)')
            rec3.set('quantidade', 1)
            rec3.set('custo', 450.0)
            rec3.set('observacoes', 'Reposição para cliente')
            app.save(rec3)
          }
        }
      } catch (_) {}
    }
  },
  (app) => {
    try {
      const suprimentosCol = app.findCollectionByNameOrId('suprimentos')
      app.delete(suprimentosCol)
    } catch (_) {}
  },
)
