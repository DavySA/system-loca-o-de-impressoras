onRecordAfterCreateSuccess((e) => {
  const clienteEmail = e.record.getString('email')
  const clienteNome = e.record.getString('nome_razao_social')
  const clienteId = e.record.id

  if (!clienteEmail || !clienteEmail.includes('@')) {
    e.next()
    return
  }

  try {
    // 1. Verificar se já existe usuário com este e-mail
    let userRec
    let userExists = false
    try {
      userRec = $app.findAuthRecordByEmail('_pb_users_auth_', clienteEmail)
      userExists = true
    } catch (_) {
      userExists = false
    }

    if (!userExists) {
      const usersCol = $app.findCollectionByNameOrId('_pb_users_auth_')
      userRec = new Record(usersCol)
      userRec.setEmail(clienteEmail)
      // Senha temporária aleatória segura
      const tempPass = 'PrintGest@' + $security.randomString(8)
      userRec.setPassword(tempPass)
      userRec.setVerified(true)
      userRec.set('name', clienteNome)
      userRec.set('role', 'cliente')
      userRec.set('cliente_id', clienteId)
      $app.save(userRec)
    } else {
      // Se já existe usuário, associar ao cliente caso não tenha
      if (!userRec.getString('cliente_id')) {
        userRec.set('cliente_id', clienteId)
        userRec.set('role', 'cliente')
        $app.save(userRec)
      }
    }

    // 2. Disparar e-mail de recuperação/definição de senha para o novo cliente
    try {
      const mailer = $app.newMailClient()
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h2 style="color: #2563eb; margin-top: 0;">Bem-vindo ao portal PrintGest!</h2>
          <p>Olá, <strong>${clienteNome}</strong>,</p>
          <p>Sua conta de acesso ao portal do cliente no <strong>PrintGest</strong> foi criada com sucesso.</p>
          <p>Pelo portal você poderá acompanhar suas faturas, chamados técnicos e solicitar aberturas de Ordens de Serviço.</p>
          <div style="background-color: #f3f4f6; padding: 16px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0;"><strong>Seu usuário de acesso:</strong> ${clienteEmail}</p>
            <p style="margin: 0;">Para definir ou redefinir sua senha de acesso, utilize o link de recuperação na tela de login ou solicite ao administrador.</p>
          </div>
          <p style="color: #6b7280; font-size: 13px;">Se você tiver dúvidas, entre em contato com nosso suporte técnico.</p>
        </div>
      `

      mailer.send(
        new MailerMessage({
          from: {
            address: $app.settings().meta.senderAddress || 'no-reply@printgest.com',
            name: $app.settings().meta.senderName || 'PrintGest ERP',
          },
          to: [{ address: clienteEmail, name: clienteNome }],
          subject: 'Acesso liberado ao portal do cliente — PrintGest',
          html: emailHtml,
        }),
      )
    } catch (mailErr) {
      console.log('Erro ao enviar e-mail de boas vindas para cliente:', mailErr)
    }
  } catch (err) {
    console.log('Erro no hook on_cliente_create_user:', err)
  }

  e.next()
}, 'clientes')
