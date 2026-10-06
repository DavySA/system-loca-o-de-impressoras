onRecordCreate((e) => {
  const equipamentoId = e.record.getString('equipamento_id')
  if (!equipamentoId) {
    e.next()
    return
  }

  // Buscar se já existe ordem de serviço não concluída para este equipamento
  const abertas = $app.findRecordsByFilter(
    'ordens_servico',
    `equipamento_id = "${equipamentoId}" && status != "concluida"`,
    '-created',
    1,
    0,
  )

  if (abertas && abertas.length > 0) {
    throw new BadRequestError(
      'Não é possível abrir ordem de serviço para este equipamento pois já existe uma O.S. em andamento/aberta não concluída.',
    )
  }

  e.next()
}, 'ordens_servico')
