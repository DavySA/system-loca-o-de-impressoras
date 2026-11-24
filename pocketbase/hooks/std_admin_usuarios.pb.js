/**
 * STD — rotas de administração de usuários (Somente administradores).
 *
 * O PocketBase recusa, nas regras de update do "users", a alteração de senha
 * de outro usuário feita via SDK cliente ("Failed to update record"). Estas
 * rotas rodam no servidor com privilégio de superuser e só aceitam requisições
 * de um usuário autenticado com role 'administrador'.
 *
 * Rotas:
 *   POST /api/std/admin/senha    { usuario_id, nova_senha }
 *   POST /api/std/admin/usuario  { usuario_id, name?, role?, cliente_id?, permissoes? }
 */

routerAdd(
  'POST',
  '/api/std/admin/senha',
  (e) => {
    const auth = e.auth
    if (!auth || auth.get('role') !== 'administrador') {
      return e.json(403, { ok: false, error: 'Apenas administradores podem definir senhas.' })
    }

    const dados = $apis.requestInfo(e).body
    const usuarioId = (dados.usuario_id || '').toString().trim()
    const novaSenha = (dados.nova_senha || '').toString()

    if (!usuarioId || novaSenha.length < 8) {
      return e.json(400, {
        ok: false,
        error: 'Informe o usuário e uma nova senha com no mínimo 8 caracteres.',
      })
    }

    let alvo
    try {
      alvo = app.findRecordById('users', usuarioId)
    } catch (_) {
      return e.json(404, { ok: false, error: 'Usuário não encontrado.' })
    }

    alvo.setPassword(novaSenha)
    try {
      app.save(alvo)
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
  '/api/std/admin/usuario',
  (e) => {
    const auth = e.auth
    if (!auth || auth.get('role') !== 'administrador') {
      return e.json(403, { ok: false, error: 'Apenas administradores podem editar usuários.' })
    }

    const dados = $apis.requestInfo(e).body
    const usuarioId = (dados.usuario_id || '').toString().trim()
    if (!usuarioId) {
      return e.json(400, { ok: false, error: 'Usuário não informado.' })
    }

    let alvo
    try {
      alvo = app.findRecordById('users', usuarioId)
    } catch (_) {
      return e.json(404, { ok: false, error: 'Usuário não encontrado.' })
    }

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
      // string vazia limpa o vínculo; valor preenchido precisa existir em clientes
      const clienteId = (dados.cliente_id || '').toString().trim()
      if (clienteId) {
        try {
          app.findRecordById('clientes', clienteId)
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

    try {
      app.save(alvo)
    } catch (err) {
      console.log('STD admin/usuario: falha ao salvar:', err)
      return e.json(400, {
        ok: false,
        error: 'O servidor recusou os dados: ' + (err.message || err),
      })
    }

    return e.json(200, { ok: true })
  },
  $apis.requireAuth(),
)
