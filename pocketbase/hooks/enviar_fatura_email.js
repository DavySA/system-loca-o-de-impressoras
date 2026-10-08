// Endpoint transacional para envio de fatura de locação/serviço por e-mail direto do ERP
routerAdd(
  'POST',
  '/backend/v1/faturas/enviar-email',
  (e) => {
    const auth = e.auth
    if (!auth) {
      throw new UnauthorizedError('Autenticação obrigatória.')
    }

    const role = auth.getString('role')
    if (role !== 'administrador') {
      throw new ForbiddenError('Apenas administradores podem disparar e-mails de cobrança.')
    }

    const data = e.requestInfo().body || {}
    const faturaId = data.fatura_id
    const emailDestino = (data.email_destinatario || '').trim()

    if (!faturaId) {
      throw new BadRequestError('ID da fatura é obrigatório.')
    }

    // 1. Buscar a fatura no banco
    let fatura = null
    try {
      fatura = $app.findRecordById('faturas', faturaId)
    } catch (err) {
      throw new NotFoundError('Fatura não encontrada.')
    }

    // 2. Buscar cliente vinculado
    const clienteId = fatura.getString('cliente_id')
    let clienteNome = 'Cliente'
    let clienteEmail = emailDestino

    if (clienteId) {
      try {
        const cliente = $app.findRecordById('clientes', clienteId)
        clienteNome = cliente.getString('nome_razao_social') || 'Cliente'
        if (!clienteEmail) {
          clienteEmail = cliente.getString('email')
        }
      } catch (_) {}
    }

    if (!clienteEmail) {
      throw new BadRequestError(
        'Nenhum e-mail de destinatário informado ou cadastrado para este cliente.',
      )
    }

    // 3. Buscar dados institucionais da empresa emissora
    let empresaNome = 'TD Technology System ERP'
    let empresaTelefone = '(11) 3322-1100'
    let empresaEmail = 'financeiro@tdtechnology.com.br'
    let empresaCnpj = ''
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
        empresaEmail = cfg.getString('email') || empresaEmail
        empresaCnpj = cfg.getString('cnpj') || ''
      }
    } catch (_) {}

    // 4. Formatações auxiliares
    const valorTotal = Number(fatura.getFloat('valor_total') || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
    const mesRef = fatura.getString('mes_referencia') || 'Período Vigente'
    const faturaCodigo = '#' + fatura.id.slice(0, 8).toUpperCase()
    const siteUrl = $os.getenv('SITE_URL') || 'https://tdtechnology.com.br'

    // Data de vencimento
    let vencimentoStr = 'À vista / imediato'
    const dataVenc = fatura.getString('data_vencimento')
    if (dataVenc) {
      vencimentoStr = dataVenc.split('T')[0]
    }

    const subject = `Fatura ${faturaCodigo} - ${empresaNome} - Ref. ${mesRef}`

    const htmlBody = `
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
        .box-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
        .box-row:last-child { margin-bottom: 0; }
        .total-row { font-size: 16px; font-weight: bold; color: #1e40af; border-top: 1px dashed #cbd5e1; padding-top: 8px; margin-top: 8px; }
        .btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px; margin-top: 16px; }
        .footer { padding: 20px 24px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; font-size: 11px; color: #6b7280; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${empresaNome}</h1>
          <p>Soluções em Outsourcing e Gestão de Impressão</p>
        </div>
        <div class="content">
          <p>Olá, <strong>${clienteNome}</strong>,</p>
          <p>Informamos que a fatura referente ao contrato de locação e serviços de impressão do período <strong>${mesRef}</strong> já está disponível para pagamento.</p>

          <div class="box">
            <div style="font-weight: bold; font-size: 12px; text-transform: uppercase; color: #475569; margin-bottom: 12px;">Resumo da Fatura ${faturaCodigo}</div>
            <div><strong>Cliente:</strong> ${clienteNome}</div>
            <div><strong>Vencimento:</strong> ${vencimentoStr}</div>
            <div><strong>Status:</strong> Aguardando pagamento</div>
            <div class="total-row">Valor Total: ${valorTotal}</div>
          </div>

          <p>Você pode acessar os detalhes do demonstrativo de consumo das suas impressoras diretamente pelo Portal do Cliente:</p>
          <p style="text-align: center;">
            <a href="${siteUrl}/login" class="btn">Acessar Portal do Cliente</a>
          </p>

          <p style="font-size: 12px; color: #64748b; margin-top: 24px;">
            Caso já tenha efetuado o pagamento, por favor desconsidere este aviso. Para dúvidas ou envio de comprovantes, responda a este e-mail ou entre em contato pelo telefone ${empresaTelefone}.
          </p>
        </div>
        <div class="footer">
          <p style="margin: 0;"><strong>${empresaNome}</strong> ${empresaCnpj ? '• CNPJ: ' + empresaCnpj : ''}</p>
          <p style="margin: 4px 0 0;">Telefone: ${empresaTelefone} • E-mail: ${empresaEmail}</p>
          <p style="margin: 8px 0 0; color: #9ca3af;">Mensagem gerada e enviada automaticamente via TD Technology System ERP.</p>
        </div>
      </div>
    </body>
    </html>
  `

    // 5. Envio do E-mail
    try {
      const mailClient = $app.newMailClient()
      const msg = new MailMessage()
      msg.from = {
        address: empresaEmail,
        name: empresaNome,
      }
      msg.to = [{ address: clienteEmail }]
      msg.subject = subject
      msg.html = htmlBody

      mailClient.send(msg)
    } catch (mailErr) {
      console.error('Falha ao disparar e-mail de fatura via PocketBase MailClient:', mailErr)
      throw new BadRequestError(
        'Não foi possível disparar o e-mail: ' +
          (mailErr.message || 'Erro no serviço de e-mail do servidor.'),
      )
    }

    // 6. Atualizar a fatura registrando o histórico de envio
    const agora = new Date().toISOString()
    fatura.set('enviada_email_em', agora)
    fatura.set('enviada_email_para', clienteEmail)
    $app.save(fatura)

    return e.json(200, {
      success: true,
      message: `Fatura enviada com sucesso para ${clienteEmail}!`,
      enviada_em: agora,
      destinatario: clienteEmail,
    })
  },
  $apis.requireAuth(),
)
