// Intercepta e-mails de redefinição e definição de senha disparados pelo PocketBase
// para garantir que o texto, o remetente (vendas@tdtechnology.com.br) e as instruções
// apontem diretamente para o portal oficial da empresa:
// https://sistema.tdtechnology.com.br/login
onMailerRecordPasswordResetSend((e) => {
  try {
    // 1. Buscar a URL do portal e dados da empresa nas configurações
    let portalUrl = 'https://sistema.tdtechnology.com.br'
    let empresaNome = 'TD Technology'
    let empresaTelefone = '(38) 3671-0221'
    let empresaEmail = 'vendas@tdtechnology.com.br'

    try {
      const configList = e.app.findRecordsByFilter(
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
        empresaEmail = cfg.getString('email') || empresaEmail
        const cfgPortal = (cfg.getString('portal_url') || '').trim()
        if (cfgPortal) {
          portalUrl = cfgPortal.replace(/\/+$/, '')
        }
      }
    } catch (_) {}

    const portalDominio = portalUrl.replace(/^https?:\/\//, '')
    const portalLoginUrl = portalUrl.startsWith('http')
      ? `${portalUrl}/login`
      : `https://${portalUrl}/login`
    const token = (e.meta && e.meta.token) || ''
    const recordName = e.record ? e.record.getString('name') || 'Cliente' : 'Cliente'
    const recordEmail = e.record ? e.record.email() : ''

    // Link oficial no portal para resetar a senha
    const portalResetUrl = token
      ? `${portalUrl}/reset-password?token=${encodeURIComponent(token)}`
      : `${portalUrl}/reset-password`

    // Remetente padrão de acesso/portal: vendas@tdtechnology.com.br
    const remetenteEmail =
      $os.getenv('SMTP_USER_VENDAS') || empresaEmail || 'vendas@tdtechnology.com.br'

    if (e.message) {
      e.message.from = {
        address: remetenteEmail,
        name: empresaNome,
      }
      e.message.subject = `Definição / Redefinição de senha — ${empresaNome} (${portalDominio})`

      // Template oficial com a identidade TD Technology e links do portal
      e.message.html = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937; margin: 0; padding: 0; background-color: #f3f4f6; }
            .container { max-width: 600px; margin: 24px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
            .header { background-color: #1f2937; color: #ffffff; padding: 24px; text-align: left; border-bottom: 4px solid #2563eb; }
            .header h1 { margin: 0; font-size: 20px; font-weight: bold; }
            .header p { margin: 4px 0 0; font-size: 12px; color: #9ca3af; }
            .content { padding: 24px; font-size: 14px; line-height: 1.6; }
            .box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 20px 0; }
            .btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px; margin-top: 16px; }
            .footer { padding: 20px 24px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; font-size: 11px; color: #6b7280; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${empresaNome}</h1>
              <p>Portal do Cliente • Outsourcing de Impressão</p>
            </div>
            <div class="content">
              <p>Olá, <strong>${recordName}</strong>,</p>
              <p>Recebemos uma solicitação para criar ou redefinir a senha de acesso da sua conta (<strong>${recordEmail}</strong>) no <strong>Portal do Cliente da ${empresaNome}</strong>.</p>

              <div class="box">
                <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>Endereço oficial do portal:</strong></p>
                <p style="margin: 0 0 8px 0;"><a href="${portalLoginUrl}" style="color: #2563eb; font-weight: bold; text-decoration: underline;">${portalDominio}</a></p>
                <p style="margin: 0; font-size: 12px; color: #64748b;">Para definir sua senha agora com segurança, clique no botão abaixo:</p>
              </div>

              <p style="text-align: center; margin: 24px 0;">
                <a href="${portalResetUrl}" class="btn">Definir Minha Senha</a>
              </p>

              <p style="font-size: 12px; color: #64748b; margin-top: 20px; line-height: 1.5;">
                Se o botão acima não funcionar, copie e cole o seguinte link no seu navegador:<br>
                <a href="${portalResetUrl}" style="color: #2563eb; word-break: break-all; font-size: 11px;">${portalResetUrl}</a>
              </p>

              <p style="font-size: 12px; color: #9ca3af; margin-top: 20px;">
                Caso não tenha sido você a solicitar a redefinição de senha, nenhuma ação é necessária e sua senha atual continuará segura.
              </p>
            </div>
            <div class="footer">
              <p style="margin: 0;"><strong>${empresaNome}</strong></p>
              <p style="margin: 4px 0 0;">Telefone: ${empresaTelefone} • E-mail: ${remetenteEmail}</p>
              <p style="margin: 8px 0 0; color: #9ca3af;">Portal oficial: <a href="${portalLoginUrl}" style="color: #6b7280; text-decoration: underline;">${portalDominio}</a></p>
            </div>
          </div>
        </body>
        </html>
      `
    }
  } catch (err) {
    console.error('Erro no interceptador onMailerRecordPasswordResetSend:', err)
  }

  e.next()
}, 'users')
