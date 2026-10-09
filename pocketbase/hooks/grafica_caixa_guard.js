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

// Impede alteração ou exclusão de contadores de caixa cujo caixa já foi fechado
onRecordUpdate((e) => {
  const caixaId = e.record.getString('caixa_id')
  if (caixaId) {
    try {
      const cx = $app.findRecordById('grafica_caixas', caixaId)
      if (cx && cx.getString('status') === 'fechado') {
        throw new BadRequestError(
          'Operação bloqueada: Os contadores deste caixa já foram consolidados e são imutáveis.',
        )
      }
    } catch (err) {
      if (err.status === 400) throw err
    }
  }
  e.next()
}, 'grafica_caixa_contadores')

onRecordDelete((e) => {
  const caixaId = e.record.getString('caixa_id')
  if (caixaId) {
    try {
      const cx = $app.findRecordById('grafica_caixas', caixaId)
      if (cx && cx.getString('status') === 'fechado') {
        throw new BadRequestError(
          'Operação bloqueada: Não é permitido excluir contadores de um caixa fechado.',
        )
      }
    } catch (err) {
      if (err.status === 400) throw err
    }
  }
  e.next()
}, 'grafica_caixa_contadores')

// Impede exclusão de registros de caixas caso o usuário autenticado não seja administrador
onRecordDelete((e) => {
  const authRecord = e.auth
  if (authRecord && authRecord.getString('role') !== 'administrador') {
    throw new ForbiddenError(
      'Apenas administradores possuem permissão para excluir registros de caixa salvos.',
    )
  }
  e.next()
}, 'grafica_caixas')
