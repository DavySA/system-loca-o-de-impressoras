migrate(
  (app) => {
    // Adicionar campo permissoes (tipo json) na coleção de usuários (_pb_users_auth_)
    try {
      const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      if (!usersCol.fields.getByName('permissoes')) {
        usersCol.fields.add(
          new JSONField({
            name: 'permissoes',
            maxSize: 50000,
          }),
        )
        app.save(usersCol)
      }
    } catch (e) {
      console.log('Erro ao adicionar campo permissoes na tabela users:', e)
    }

    // Inicializar permissões dos usuários existentes de acordo com seus papéis atuais
    try {
      const allUsers = app.findRecordsByFilter('_pb_users_auth_', 'id != ""', 'created', 100, 0)
      const modulosAdmin = [
        'dashboard',
        'clientes',
        'equipamentos',
        'ordens_servico',
        'faturamento',
        'suprimentos',
        'grafica_rapida',
        'relatorios',
        'servicos',
        'usuarios',
        'personalizar',
      ]
      const modulosOperador = [
        'clientes',
        'equipamentos',
        'ordens_servico',
        'suprimentos',
        'grafica_rapida',
        'servicos',
      ]
      const modulosTecnico = ['ordens_servico']
      const modulosCliente = ['dashboard', 'ordens_servico', 'faturamento', 'meu_contrato']

      for (let i = 0; i < allUsers.length; i++) {
        const u = allUsers[i]
        const role = u.getString('role')
        let userPerms = []
        if (role === 'administrador') {
          userPerms = modulosAdmin
        } else if (role === 'operador') {
          userPerms = modulosOperador
        } else if (role === 'tecnico') {
          userPerms = modulosTecnico
        } else if (role === 'cliente') {
          userPerms = modulosCliente
        } else {
          userPerms = modulosOperador
        }

        u.set('permissoes', userPerms)
        app.save(u)
      }
    } catch (err) {
      console.log('Erro ao inicializar permissões dos usuários existentes:', err)
    }
  },
  (app) => {
    try {
      const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      if (usersCol.fields.getByName('permissoes')) {
        usersCol.fields.removeByName('permissoes')
        app.save(usersCol)
      }
    } catch (_) {}
  },
)
