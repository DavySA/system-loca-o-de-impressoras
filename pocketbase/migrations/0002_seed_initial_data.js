migrate(
  (app) => {
    // 1. Criar usuário inicial davycontato@hotmail.com
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'davycontato@hotmail.com')
    } catch (_) {
      const adminUser = new Record(users)
      adminUser.setEmail('davycontato@hotmail.com')
      adminUser.setPassword('Skip@Pass')
      adminUser.setVerified(true)
      adminUser.set('name', 'Davy Administrador')
      app.save(adminUser)
    }

    // 2. Clientes
    const clientesCol = app.findCollectionByNameOrId('clientes')
    let clienteAlfa, clienteSorriso, clientePadaria

    try {
      clienteAlfa = app.findFirstRecordByData(
        'clientes',
        'nome_razao_social',
        'Escritório Alfa Contabilidade LTDA',
      )
    } catch (_) {
      clienteAlfa = new Record(clientesCol)
      clienteAlfa.set('nome_razao_social', 'Escritório Alfa Contabilidade LTDA')
      clienteAlfa.set('tipo', 'Pessoa Jurídica')
      clienteAlfa.set('documento', '12.345.678/0001-90')
      clienteAlfa.set('email', 'contato@alfacontabil.com.br')
      clienteAlfa.set('telefone', '(11) 3456-7890')
      clienteAlfa.set('cidade', 'São Paulo')
      clienteAlfa.set('uf', 'SP')
      clienteAlfa.set('endereco', 'Av. Paulista, 1000 - Sala 402')
      clienteAlfa.set('status', 'ativo')
      app.save(clienteAlfa)
    }

    try {
      clienteSorriso = app.findFirstRecordByData(
        'clientes',
        'nome_razao_social',
        'Clínica Odontológica Sorriso',
      )
    } catch (_) {
      clienteSorriso = new Record(clientesCol)
      clienteSorriso.set('nome_razao_social', 'Clínica Odontológica Sorriso')
      clienteSorriso.set('tipo', 'Pessoa Jurídica')
      clienteSorriso.set('documento', '23.456.789/0001-01')
      clienteSorriso.set('email', 'atendimento@sorrisoodonto.com.br')
      clienteSorriso.set('telefone', '(11) 4567-8901')
      clienteSorriso.set('cidade', 'Campinas')
      clienteSorriso.set('uf', 'SP')
      clienteSorriso.set('endereco', 'Rua Barão de Jaguara, 550')
      clienteSorriso.set('status', 'ativo')
      app.save(clienteSorriso)
    }

    try {
      clientePadaria = app.findFirstRecordByData(
        'clientes',
        'nome_razao_social',
        'Padaria Pão Dourado',
      )
    } catch (_) {
      clientePadaria = new Record(clientesCol)
      clientePadaria.set('nome_razao_social', 'Padaria Pão Dourado')
      clientePadaria.set('tipo', 'Pessoa Jurídica')
      clientePadaria.set('documento', '34.567.890/0001-12')
      clientePadaria.set('email', 'financeiro@paodourado.com.br')
      clientePadaria.set('telefone', '(11) 2233-4455')
      clientePadaria.set('cidade', 'Santos')
      clientePadaria.set('uf', 'SP')
      clientePadaria.set('endereco', 'Av. Ana Costa, 320')
      clientePadaria.set('status', 'ativo')
      app.save(clientePadaria)
    }

    // 3. Equipamentos
    const equipCol = app.findCollectionByNameOrId('equipamentos')
    let equipHp, equipEpson, equipXerox

    try {
      equipHp = app.findFirstRecordByData('equipamentos', 'numero_serie', 'HP-M404-98421')
    } catch (_) {
      equipHp = new Record(equipCol)
      equipHp.set('marca', 'HP')
      equipHp.set('modelo', 'LaserJet Pro M404')
      equipHp.set('numero_serie', 'HP-M404-98421')
      equipHp.set('contador_monocromatico', 14850)
      equipHp.set('contador_colorido', 0)
      equipHp.set('data_aquisicao', '2023-03-15 10:00:00.000Z')
      equipHp.set('status', 'locado')
      app.save(equipHp)
    }

    try {
      equipEpson = app.findFirstRecordByData('equipamentos', 'numero_serie', 'EPS-L4260-55102')
    } catch (_) {
      equipEpson = new Record(equipCol)
      equipEpson.set('marca', 'Epson')
      equipEpson.set('modelo', 'EcoTank L4260')
      equipEpson.set('numero_serie', 'EPS-L4260-55102')
      equipEpson.set('contador_monocromatico', 8230)
      equipEpson.set('contador_colorido', 6150)
      equipEpson.set('data_aquisicao', '2023-06-20 10:00:00.000Z')
      equipEpson.set('status', 'disponivel')
      app.save(equipEpson)
    }

    try {
      equipXerox = app.findFirstRecordByData('equipamentos', 'numero_serie', 'XRX-6515-77341')
    } catch (_) {
      equipXerox = new Record(equipCol)
      equipXerox.set('marca', 'Xerox')
      equipXerox.set('modelo', 'WorkCentre 6515')
      equipXerox.set('numero_serie', 'XRX-6515-77341')
      equipXerox.set('contador_monocromatico', 31200)
      equipXerox.set('contador_colorido', 19800)
      equipXerox.set('data_aquisicao', '2022-11-10 10:00:00.000Z')
      equipXerox.set('status', 'locado')
      app.save(equipXerox)
    }

    // 4. Serviços no catálogo
    const servicosCol = app.findCollectionByNameOrId('servicos')
    let s1, s2

    const servicosData = [
      {
        nome: 'Manutenção Preventiva Mensal',
        descricao:
          'Limpeza de roletes, calibração ótica, lubrificação interna e teste de impressão.',
        categoria: 'Manutenção Preventiva',
        preco: 180,
        duracao_estimada: '1 hora',
      },
      {
        nome: 'Troca de Cilindro',
        descricao:
          'Substituição completa da unidade de cilindro fotocondutor e descarte ecológico.',
        categoria: 'Manutenção Corretiva',
        preco: 350,
        duracao_estimada: '2 horas',
      },
      {
        nome: 'Instalação de Impressora',
        descricao:
          'Montagem física, conexão de rede TCP/IP e mapeamento nos terminais de trabalho.',
        categoria: 'Instalação',
        preco: 220,
        duracao_estimada: '2 horas',
      },
      {
        nome: 'Recarga de Toner',
        descricao: 'Recarga de toner de alto rendimento com substituição do chip de controle.',
        categoria: 'Suprimentos',
        preco: 120,
        duracao_estimada: '45 minutos',
      },
      {
        nome: 'Visita Técnica Urgente',
        descricao: 'Atendimento emergencial presencial em até 4 horas com diagnóstico in-loco.',
        categoria: 'Visita Técnica',
        preco: 290,
        duracao_estimada: '3 horas',
      },
    ]

    for (const s of servicosData) {
      try {
        app.findFirstRecordByData('servicos', 'nome', s.nome)
      } catch (_) {
        const rec = new Record(servicosCol)
        rec.set('nome', s.nome)
        rec.set('descricao', s.descricao)
        rec.set('categoria', s.categoria)
        rec.set('preco', s.preco)
        rec.set('duracao_estimada', s.duracao_estimada)
        app.save(rec)
      }
    }

    s1 = app.findFirstRecordByData('servicos', 'nome', 'Manutenção Preventiva Mensal')
    s2 = app.findFirstRecordByData('servicos', 'nome', 'Troca de Cilindro')

    // 5. Contratos
    const contratosCol = app.findCollectionByNameOrId('contratos')
    let c1, c2, c3

    try {
      c1 = app.findFirstRecordByData('contratos', 'cliente_id', clienteAlfa.id)
    } catch (_) {
      c1 = new Record(contratosCol)
      c1.set('cliente_id', clienteAlfa.id)
      c1.set('equipamento_id', equipHp.id)
      c1.set('data_inicio', '2024-01-01 00:00:00.000Z')
      c1.set('data_fim', '2025-12-31 00:00:00.000Z')
      c1.set('valor_mensal', 450)
      c1.set('paginas_contratadas_mensais', 1000)
      c1.set('valor_pagina_excedente', 0.08)
      c1.set('status', 'ativo')
      app.save(c1)
    }

    try {
      c2 = app.findFirstRecordByData('contratos', 'cliente_id', clienteSorriso.id)
    } catch (_) {
      c2 = new Record(contratosCol)
      c2.set('cliente_id', clienteSorriso.id)
      c2.set('equipamento_id', equipXerox.id)
      c2.set('data_inicio', '2024-02-01 00:00:00.000Z')
      c2.set('data_fim', '2025-05-15 00:00:00.000Z')
      c2.set('valor_mensal', 890)
      c2.set('paginas_contratadas_mensais', 2500)
      c2.set('valor_pagina_excedente', 0.12)
      c2.set('status', 'ativo')
      app.save(c2)
    }

    try {
      c3 = app.findFirstRecordByData('contratos', 'cliente_id', clientePadaria.id)
    } catch (_) {
      c3 = new Record(contratosCol)
      c3.set('cliente_id', clientePadaria.id)
      c3.set('equipamento_id', equipEpson.id)
      c3.set('data_inicio', '2024-03-01 00:00:00.000Z')
      c3.set('data_fim', '2026-03-01 00:00:00.000Z')
      c3.set('valor_mensal', 320)
      c3.set('paginas_contratadas_mensais', 800)
      c3.set('valor_pagina_excedente', 0.06)
      c3.set('status', 'ativo')
      app.save(c3)
    }

    // 6. Ordens de Serviço
    const osCol = app.findCollectionByNameOrId('ordens_servico')
    let os1, os2

    try {
      os1 = app.findFirstRecordByData(
        'ordens_servico',
        'descricao_problema',
        'Atolamento frequente de papel na bandeja 2 e manchas pretas no canto da folha',
      )
    } catch (_) {
      os1 = new Record(osCol)
      os1.set('cliente_id', clienteAlfa.id)
      os1.set('equipamento_id', equipHp.id)
      os1.set('servico_id', s2.id)
      os1.set('prioridade', 'alta')
      os1.set(
        'descricao_problema',
        'Atolamento frequente de papel na bandeja 2 e manchas pretas no canto da folha',
      )
      os1.set('data_agendada', '2025-05-02 14:00:00.000Z')
      os1.set('data_abertura', '2025-04-28 09:30:00.000Z')
      os1.set('tecnico_responsavel', 'Carlos Roberto')
      os1.set('status', 'aberta')
      app.save(os1)
    }

    try {
      os2 = app.findFirstRecordByData(
        'ordens_servico',
        'descricao_problema',
        'Revisão preventiva semestral de rotina e limpeza de espelhos',
      )
    } catch (_) {
      os2 = new Record(osCol)
      os2.set('cliente_id', clienteSorriso.id)
      os2.set('equipamento_id', equipXerox.id)
      os2.set('servico_id', s1.id)
      os2.set('prioridade', 'media')
      os2.set('descricao_problema', 'Revisão preventiva semestral de rotina e limpeza de espelhos')
      os2.set('data_agendada', '2025-04-10 10:00:00.000Z')
      os2.set('data_abertura', '2025-04-05 08:00:00.000Z')
      os2.set('data_conclusao', '2025-04-10 11:30:00.000Z')
      os2.set('tecnico_responsavel', 'Mariana Silva')
      os2.set('status', 'concluida')
      app.save(os2)
    }

    // 7. Atualizações da O.S. aberta
    const atualizacoesCol = app.findCollectionByNameOrId('atualizacoes_os')
    try {
      app.findFirstRecordByData(
        'atualizacoes_os',
        'comentario',
        'Ordem de serviço registrada no sistema. Aguardando saída do técnico com o novo cilindro.',
      )
    } catch (_) {
      const at1 = new Record(atualizacoesCol)
      at1.set('os_id', os1.id)
      at1.set('autor', 'Davy Administrador')
      at1.set(
        'comentario',
        'Ordem de serviço registrada no sistema. Aguardando saída do técnico com o novo cilindro.',
      )
      at1.set('status_na_ocasiao', 'aberta')
      app.save(at1)

      const at2 = new Record(atualizacoesCol)
      at2.set('os_id', os1.id)
      at2.set('autor', 'Carlos Roberto')
      at2.set(
        'comentario',
        'Contato telefônico feito com o cliente. Visita técnica confirmada para o período da tarde.',
      )
      at2.set('status_na_ocasiao', 'aberta')
      app.save(at2)
    }

    // 8. Faturas (usando Record para compatibilidade de tipos)
    const faturasCol = app.findCollectionByNameOrId('faturas')

    try {
      app.findFirstRecordByData('faturas', 'mes_referencia', '2025-04')
    } catch (_) {
      const f1 = new Record(faturasCol)
      f1.set('contrato_id', c1.id)
      f1.set('cliente_id', clienteAlfa.id)
      f1.set('mes_referencia', '2025-04')
      f1.set('paginas_contratadas', 1000)
      f1.set('paginas_consumidas', 1350)
      f1.set('paginas_excedentes', 350)
      f1.set('valor_base', 450)
      f1.set('valor_excedente', 28)
      f1.set('valor_total', 478)
      f1.set('status', 'gerada')
      app.save(f1)
    }

    try {
      app.findFirstRecordByData('faturas', 'mes_referencia', '2025-03')
    } catch (_) {
      const f2 = new Record(faturasCol)
      f2.set('contrato_id', c1.id)
      f2.set('cliente_id', clienteAlfa.id)
      f2.set('mes_referencia', '2025-03')
      f2.set('paginas_contratadas', 1000)
      f2.set('paginas_consumidas', 1050)
      f2.set('paginas_excedentes', 50)
      f2.set('valor_base', 450)
      f2.set('valor_excedente', 4)
      f2.set('valor_total', 454)
      f2.set('status', 'paga')
      app.save(f2)
    }

    try {
      app.findFirstRecordByData('faturas', 'mes_referencia', '2025-02')
    } catch (_) {
      const f3 = new Record(faturasCol)
      f3.set('contrato_id', c2.id)
      f3.set('cliente_id', clienteSorriso.id)
      f3.set('mes_referencia', '2025-02')
      f3.set('paginas_contratadas', 2500)
      f3.set('paginas_consumidas', 2600)
      f3.set('paginas_excedentes', 100)
      f3.set('valor_base', 890)
      f3.set('valor_excedente', 12)
      f3.set('valor_total', 902)
      f3.set('status', 'vencida')
      app.save(f3)
    }
  },
  (app) => {},
)
