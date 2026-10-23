onRecordAfterCreateSuccess((e) => {
  const clienteEmail = (e.record.getString('email') || '').trim()
  const clienteNome = e.record.getString('nome_razao_social') || 'Cliente'
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
      const tempPass = 'TDTech@' + $security.randomString(8)
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

    // 2. Obter URL do portal da empresa e dados cadastrais
    let portalUrl = 'https://sistema.tdtechnology.com.br'
    let empresaNome = 'TD Technology'
    let empresaTelefone = '(38) 3671-0221'
    let empresaEmail = 'vendas@tdtechnology.com.br'
    try {
      const configList = $app.findRecordsByFilter(
        'configuracoes_empresa',
        'id != ""',
        '-created',
        1,
        0,
      )
      if (configList.length > 0) {
        const cfg = configList[0]
        empresaNome = cfg.getString('razao_social') || cfg.getString('nome_fantasia') || empresaNome
        empresaTelefone = cfg.getString('telefone') || cfg.getString('whatsapp') || empresaTelefone
        const cfgPortal = (cfg.getString('portal_url') || '').trim()
        if (cfgPortal) {
          portalUrl = cfgPortal.replace(/\/+$/, '')
        }
      }
    } catch (_) {}

    const portalLoginUrl = portalUrl.startsWith('http')
      ? `${portalUrl}/login`
      : `https://${portalUrl}/login`
    const portalForgotUrl = portalUrl.startsWith('http')
      ? `${portalUrl}/forgot-password`
      : `https://${portalUrl}/forgot-password`
    const portalDominio = portalUrl.replace(/^https?:\/\//, '')

    // Remetente de boas-vindas: vendas@tdtechnology.com.br
    const senderEmail =
      $os.getenv('SMTP_USER_VENDAS') || empresaEmail || 'vendas@tdtechnology.com.br'

    // 3. Disparar e-mail de boas-vindas e acesso ao portal
    try {
      const mailer = $app.newMailClient()
      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #ffffff; color: #1f2937;">
          <h2 style="color: #2563eb; margin-top: 0; font-size: 20px;">Bem-vindo ao Portal do Cliente — ${empresaNome}</h2>
          <p>Olá, <strong>${clienteNome}</strong>,</p>
          <p>Sua conta de acesso ao portal do cliente foi criada com sucesso no sistema da ${empresaNome}.</p>
          <p>Pelo portal você poderá acompanhar suas faturas de locação, demonstrativos de leitura de impressoras, chamados técnicos e solicitar aberturas de Ordens de Serviço.</p>
          
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>Endereço do Portal:</strong> <a href="${portalLoginUrl}" style="color: #2563eb; font-weight: bold; text-decoration: underline;">${portalDominio}</a></p>
            <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>Seu usuário / login:</strong> <span style="font-family: monospace; background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${clienteEmail}</span></p>
            <p style="margin: 0; font-size: 13px; color: #475569;">Para definir sua primeira senha ou redefini-la a qualquer momento, acesse o link de recuperação na tela inicial do portal da empresa.</p>
          </div>

          <p style="text-align: center; margin: 24px 0;">
            <a href="${portalLoginUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px;">Acessar Portal do Cliente</a>
          </p>

          <p style="text-align: center; font-size: 12px; color: #64748b; margin-top: 8px;">
            Acesso direto: <a href="${portalForgotUrl}" style="color: #2563eb; text-decoration: underline;">Definir / Redefinir Senha</a>
          </p>

          <p style="color: #6b7280; font-size: 12px; margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 12px;">
            Em caso de dúvidas ou necessidade de suporte, entre em contato pelo telefone ${empresaTelefone} ou pelo e-mail ${senderEmail}.
          </p>
        </div>
      `

      mailer.send(
        new MailerMessage({
          from: {
            address: senderEmail,
            name: empresaNome,
          },
          to: [{ address: clienteEmail, name: clienteNome }],
          subject: `Acesso liberado ao portal do cliente — ${empresaNome}`,
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
