// Validação no servidor: impede usuários não-administradores de apagar dados sensíveis do sistema
onRecordDelete((e) => {
  const authRecord = e.auth
  if (authRecord && authRecord.getString('role') !== 'administrador') {
    throw new ForbiddenError(
      'Apenas administradores possuem permissão para excluir registros nesta coleção.',
    )
  }
  e.next()
}, 'clientes')

onRecordDelete((e) => {
  const authRecord = e.auth
  if (authRecord && authRecord.getString('role') !== 'administrador') {
    throw new ForbiddenError(
      'Apenas administradores possuem permissão para excluir registros nesta coleção.',
    )
  }
  e.next()
}, 'equipamentos')

onRecordDelete((e) => {
  const authRecord = e.auth
  if (authRecord && authRecord.getString('role') !== 'administrador') {
    throw new ForbiddenError(
      'Apenas administradores possuem permissão para excluir registros nesta coleção.',
    )
  }
  e.next()
}, 'faturas')

onRecordDelete((e) => {
  const authRecord = e.auth
  if (authRecord && authRecord.getString('role') !== 'administrador') {
    throw new ForbiddenError(
      'Apenas administradores possuem permissão para gerenciar e excluir outros usuários.',
    )
  }
  e.next()
}, 'users')
