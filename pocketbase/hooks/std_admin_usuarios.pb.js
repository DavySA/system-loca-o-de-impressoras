/**
 * STD — rotas de administração de usuários (Somente administradores).
 *
 * O PocketBase recusa, nas regras de update do "users", a alteração de senha
 * de outro usuário feita via SDK cliente ("Failed to update record"). Estas
 * rotas rodam no servidor com privilégio de superuser e só aceitam requisições
 * de usuários autenticados (a alteração de e-mail também é aceita de
 * operador/técnico com a função "usuarios" marcada — ver rota /usuario).
 *
 * IMPORTANTE (JSVM): o global dentro de hooks é `$app` — `app` (sem cifrão)
 * não existe e qualquer referência cai em ReferenceError, que o try/catch da
 * rota transformava em "Usuário não encontrado." para QUALQUER usuário.
 * Também não há funções top-level: cada callback precisa ser autossuficiente.
 *
 * Rotas (namespace reservado '/api/' não pode ser usado por rotas novas):
 *   POST /backend/v1/std/admin/senha          { usuario_id, nova_senha }
 *   POST /backend/v1/std/admin/usuario        { usuario_id, email?, name?, role?, cliente_id?, permissoes? }
 *     — o E-MAIL pode ser alterado por administradores e por operadores/técnicos
 *       com a função "usuarios" marcada; os demais campos continuam restritos a
 *       administradores. Se o novo e-mail já pertencer a outra conta, recusa com
 *       mensagem clara ("Este e-mail já está em uso por outro usuário."). Se o
 *       usuário tem cliente do portal vinculado (cliente_id), sincroniza o novo
 *       e-mail também no registro do cliente (melhor esforço).
 *   POST /backend/v1/std/admin/usuario/criar  { email, name, role, cliente_id?, permissoes?, password? }
 *     — cria o usuário OU, se o e-mail já pertencer a uma conta existente
 *       (ex.: conta de cliente do portal criada no cadastro do cliente),
 *       VINCULA essa mesma conta (promoção a usuário interno), nunca duplica.
 */

routerAdd(
  'POST',
  '/backend/v1/std/admin/senha',
  (e) => {
    const auth = e.auth
    if (!auth || auth.get('role') !== 'administrador') {
      return e.json(403, { ok: false, error: 'Apenas administradores podem definir senhas.' })
    }

    const dados = e.requestInfo().body
    const usuarioId = (dados.usuario_id || '').toString().trim()
    const novaSenha = (dados.nova_senha || '').toString()

    if (!usuarioId || novaSenha.length < 8) {
      return e.json(400, {
        ok: false,
        error: 'Informe o usuário e uma nova senha com no mínimo 8 caracteres.',
      })
    }

    // Busca o usuário por id; se não achar (id truncado/antigo), tenta por e-mail.
    let alvo = null
    try {
      alvo = $app.findRecordById('users', usuarioId)
    } catch (_) {
      const emailBusca = (dados.email || '').toString().trim().toLowerCase()
      if (emailBusca) {
        try {
          alvo = $app.findAuthRecordByEmail('_pb_users_auth_', emailBusca)
        } catch (_) {}
      }
    }

    if (!alvo) {
      return e.json(404, { ok: false, error: 'Usuário não encontrado.' })
    }

    alvo.setPassword(novaSenha)
    try {
      $app.save(alvo)
    } catch (err) {
      console.log('STD admin/senha: falha ao salvar:', err)
      return e.json(400, {
        ok: false,
        error: 'O servidor recusou a nova senha: ' + (err.message || err),
      })
    }

    return e.json(200, { ok: true, email: alvo.get('email') })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/std/admin/usuario',
  (e) => {
    const auth = e.auth
    if (!auth) {
      return e.json(403, { ok: false, error: 'Acesso negado.' })
    }

    // Quem está chamando: administrador tem acesso total; operador/técnico com
    // a função "usuarios" marcada pode alterar apenas o E-MAIL de login.
    const callerRole = (auth.get('role') || '').toString()
    const callerPermsRaw = auth.get('permissoes')
    const callerPerms = Array.isArray(callerPermsRaw) ? callerPermsRaw : []
    const isCallerAdmin = callerRole === 'administrador'
    const podeEditarEmail =
      isCallerAdmin ||
      (['operador', 'tecnico'].indexOf(callerRole) !== -1 && callerPerms.indexOf('usuarios') !== -1)

    const dados = e.requestInfo().body
    const usuarioId = (dados.usuario_id || '').toString().trim()
    if (!usuarioId) {
      return e.json(400, { ok: false, error: 'Usuário não informado.' })
    }

    let alvo = null
    try {
      alvo = $app.findRecordById('users', usuarioId)
    } catch (_) {
      const emailBusca = (dados.email || '').toString().trim().toLowerCase()
      if (emailBusca) {
        try {
          alvo = $app.findAuthRecordByEmail('_pb_users_auth_', emailBusca)
        } catch (_) {}
      }
    }
    if (!alvo) {
      return e.json(404, { ok: false, error: 'Usuário não encontrado.' })
    }

    if (!isCallerAdmin) {
      if (!podeEditarEmail) {
        return e.json(403, { ok: false, error: 'Apenas administradores podem editar usuários.' })
      }
      // Operador/técnico: recusa explicitamente alteração de funções/perfil/vínculo
      const tentouOutroCampo =
        dados.name !== undefined ||
        dados.role !== undefined ||
        dados.cliente_id !== undefined ||
        dados.permissoes !== undefined
      if (tentouOutroCampo) {
        return e.json(403, {
          ok: false,
          error:
            'Apenas administradores podem alterar funções, perfil e vínculos. Somente o e-mail pode ser editado.',
        })
      }
    }

    // ---- Alteração de e-mail (admin, ou operador/técnico com função "usuarios")
    let emailAlterado = false
    let novoEmailAplicado = ''
    let emailSincronizadoCliente = false
    if (dados.email !== undefined) {
      if (!podeEditarEmail) {
        return e.json(403, {
          ok: false,
          error: 'Apenas administradores podem alterar o e-mail de login.',
        })
      }
      const novoEmail = (dados.email || '').toString().trim().toLowerCase()
      const emailAtual = (alvo.get('email') || '').toString().trim().toLowerCase()
      if (!novoEmail || novoEmail.indexOf('@') === -1 || novoEmail.indexOf('.') === -1) {
        return e.json(400, { ok: false, error: 'Informe um e-mail válido.' })
      }
      if (novoEmail !== emailAtual) {
        // O novo e-mail já pertence a outra conta? Mensagem clara, sem erro genérico.
        let existente = null
        try {
          existente = $app.findAuthRecordByEmail('_pb_users_auth_', novoEmail)
        } catch (_) {}
        if (existente && existente.id !== alvo.id) {
          return e.json(400, {
            ok: false,
            error: 'Este e-mail já está em uso por outro usuário.',
          })
        }
        alvo.setEmail(novoEmail)
        // Definido por gestor/administrador via painel: marca como verificado
        alvo.setVerified(true)
        emailAlterado = true
        novoEmailAplicado = novoEmail
      }
    }

    if (isCallerAdmin) {
      if (dados.name !== undefined) {
        alvo.set('name', (dados.name || '').toString().trim())
      }

      if (dados.role !== undefined) {
        const role = (dados.role || '').toString().trim()
        if (['administrador', 'tecnico', 'operador', 'cliente'].includes(role)) {
          alvo.set('role', role)
        }
      }

      if (dados.cliente_id !== undefined) {
        // string vazia/ausente limpa o vínculo; valor preenchido precisa existir em clientes
        const clienteId = (dados.cliente_id || '').toString().trim()
        if (clienteId) {
          try {
            $app.findRecordById('clientes', clienteId)
            alvo.set('cliente_id', clienteId)
          } catch (_) {
            return e.json(400, {
              ok: false,
              error: 'Cliente/empresa informado não existe. Atualize a página e tente novamente.',
            })
          }
        } else {
          alvo.set('cliente_id', '')
        }
      }

      if (dados.permissoes !== undefined) {
        let lista = Array.isArray(dados.permissoes) ? dados.permissoes : []
        lista = lista.filter((p) => typeof p === 'string' && p.length > 0)
        // deduplicar preservando a ordem
        const unicos = []
        for (const p of lista) {
          if (unicos.indexOf(p) === -1) unicos.push(p)
        }
        alvo.set('permissoes', unicos)
      }

      // Conta de cliente exige vínculo com empresa
      if (alvo.get('role') === 'cliente' && !alvo.get('cliente_id')) {
        return e.json(400, {
          ok: false,
          error: 'Conta de cliente exige o vínculo com uma empresa/cliente.',
        })
      }
    }

    try {
      $app.save(alvo)
    } catch (err) {
      console.log('STD admin/usuario: falha ao salvar:', err)
      const msg = err && err.message ? err.message : '' + err
      if (msg.indexOf('email') !== -1 && msg.indexOf('unique') !== -1) {
        return e.json(400, {
          ok: false,
          error: 'Este e-mail já está em uso por outro usuário.',
        })
      }
      return e.json(400, {
        ok: false,
        error: 'O servidor recusou os dados: ' + msg,
      })
    }

    // Sincroniza o e-mail do cliente do portal vinculado (consistência do portal).
    // Melhor esforço: falha aqui não desfaz a alteração do usuário.
    if (emailAlterado && alvo.get('cliente_id')) {
      try {
        const cliente = $app.findRecordById('clientes', alvo.get('cliente_id'))
        cliente.set('email', novoEmailAplicado)
        $app.save(cliente)
        emailSincronizadoCliente = true
      } catch (err) {
        console.log('STD admin/usuario: falha ao sincronizar e-mail do cliente:', err)
      }
    }

    return e.json(200, {
      ok: true,
      email: alvo.get('email'),
      email_sincronizado_cliente: emailSincronizadoCliente,
    })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/std/admin/usuario/criar',
  (e) => {
    const auth = e.auth
    if (!auth || auth.get('role') !== 'administrador') {
      return e.json(403, { ok: false, error: 'Apenas administradores podem criar usuários.' })
    }

    const dados = e.requestInfo().body
    const email = (dados.email || '').toString().trim().toLowerCase()
    const nome = (dados.name || '').toString().trim()
    const role = (dados.role || 'operador').toString().trim()
    const senhaInformada = (dados.password || '').toString()
    const clienteId = (dados.cliente_id || '').toString().trim()

    let permissoes = Array.isArray(dados.permissoes) ? dados.permissoes : []
    permissoes = permissoes.filter((p) => typeof p === 'string' && p.length > 0)
    const permissoesUnicas = []
    for (const p of permissoes) {
      if (permissoesUnicas.indexOf(p) === -1) permissoesUnicas.push(p)
    }

    if (!nome || !email || email.indexOf('@') === -1) {
      return e.json(400, { ok: false, error: 'Informe nome e e-mail válidos.' })
    }
    if (['administrador', 'tecnico', 'operador', 'cliente'].indexOf(role) === -1) {
      return e.json(400, { ok: false, error: 'Perfil de acesso inválido.' })
    }
    if (senhaInformada && senhaInformada.length < 8) {
      return e.json(400, { ok: false, error: 'A senha deve ter no mínimo 8 caracteres.' })
    }
    if (role === 'cliente' && !clienteId) {
      return e.json(400, {
        ok: false,
        error: 'Conta de cliente exige o vínculo com uma empresa/cliente.',
      })
    }
    if (role !== 'cliente' && permissoesUnicas.length === 0) {
      return e.json(400, { ok: false, error: 'Selecione ao menos uma função/módulo.' })
    }
    if (clienteId) {
      try {
        $app.findRecordById('clientes', clienteId)
      } catch (_) {
        return e.json(400, { ok: false, error: 'Cliente/empresa informado não existe.' })
      }
    }

    // E-mail já cadastrado (ex.: conta de cliente do portal)? Vincula em vez de duplicar.
    let existente = null
    try {
      existente = $app.findAuthRecordByEmail('_pb_users_auth_', email)
    } catch (_) {}

    if (existente) {
      existente.set('name', nome || existente.get('name'))
      existente.set('role', role)
      existente.set('permissoes', permissoesUnicas)
      if (clienteId) {
        existente.set('cliente_id', clienteId)
      }
      if (senhaInformada) {
        existente.setPassword(senhaInformada)
      }
      try {
        $app.save(existente)
      } catch (err) {
        console.log('STD admin/usuario/criar: falha ao vincular conta existente:', err)
        return e.json(400, {
          ok: false,
          error: 'O servidor recusou o vínculo da conta existente: ' + (err.message || err),
        })
      }
      return e.json(200, {
        ok: true,
        vinculado: true,
        id: existente.id,
        mensagem: 'E-mail já possuía conta no sistema — a conta existente foi vinculada.',
      })
    }

    const usersCol = $app.findCollectionByNameOrId('_pb_users_auth_')
    const novo = new Record(usersCol)
    novo.setEmail(email)
    const senha = senhaInformada || 'TDTech@' + $security.randomString(8)
    novo.setPassword(senha)
    novo.setVerified(true)
    novo.set('name', nome)
    novo.set('role', role)
    novo.set('permissoes', permissoesUnicas)
    novo.set('cliente_id', clienteId)

    try {
      $app.save(novo)
    } catch (err) {
      console.log('STD admin/usuario/criar: falha ao criar usuário:', err)
      return e.json(400, {
        ok: false,
        error: 'O servidor recusou a criação do usuário: ' + (err.message || err),
      })
    }

    return e.json(200, { ok: true, vinculado: false, id: novo.id })
  },
  $apis.requireAuth(),
)
