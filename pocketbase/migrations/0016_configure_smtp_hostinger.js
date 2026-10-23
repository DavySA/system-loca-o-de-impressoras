migrate(
  (app) => {
    try {
      const settings = app.settings()

      // Configurações SMTP Hostinger
      // Credenciais lidas de variáveis de ambiente configuradas no backend
      const host = $os.getenv('SMTP_HOST') || 'smtp.hostinger.com'
      const portStr = $os.getenv('SMTP_PORT') || '465'
      const port = parseInt(portStr, 10) || 465
      const userVendas = $os.getenv('SMTP_USER_VENDAS') || 'vendas@tdtechnology.com.br'
      const passVendas = $os.getenv('SMTP_PASSWORD_VENDAS') || ''

      settings.smtp.enabled = true
      settings.smtp.host = host
      settings.smtp.port = port
      // Porta 465 na Hostinger usa SSL/TLS implícito (tls = true)
      settings.smtp.tls = true
      settings.smtp.username = userVendas
      if (passVendas) {
        settings.smtp.password = passVendas
      }

      // Remetente padrão do sistema (vendas@tdtechnology.com.br / TD Technology)
      settings.meta.senderName = 'TD Technology'
      settings.meta.senderAddress = userVendas

      app.save(settings)
      console.log('Migração 0016: SMTP Hostinger configurado com sucesso para ' + userVendas)
    } catch (err) {
      console.error('Erro ao configurar settings SMTP na migração 0016:', err)
      throw err
    }
  },
  (app) => {
    try {
      const settings = app.settings()
      settings.smtp.enabled = false
      app.save(settings)
    } catch (_) {}
  },
)
