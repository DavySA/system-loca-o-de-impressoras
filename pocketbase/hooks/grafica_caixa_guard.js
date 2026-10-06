// Impede alterações nos contadores e dados de um caixa que já foi fechado
onRecordUpdate((e) => {
  const originalStatus = e.record.original().getString('status')
  if (originalStatus === 'fechado') {
    throw new BadRequestError(
      'Este caixa já está fechado. Os contadores e dados de fechamento são imutáveis e não podem ser alterados.',
    )
  }
  e.next()
}, 'grafica_caixas')

// Impede exclusão de registros de caixas caso o usuário autenticado seja operador
onRecordDelete((e) => {
  const authRecord = e.auth
  if (authRecord && authRecord.getString('role') === 'operador') {
    throw new ForbiddenError(
      'Usuários com perfil de Operador não possuem permissão para excluir registros salvos.',
    )
  }
  e.next()
}, 'grafica_caixas')
