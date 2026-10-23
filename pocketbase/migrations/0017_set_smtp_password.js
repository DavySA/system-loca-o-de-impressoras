migrate(
  (app) => {
    try {
      const settings = app.settings()

      // Configurações SMTP Hostinger persistidas
      const userVendas = $os.getenv('SMTP_USER_VENDAS') || 'vendas@tdtechnology.com.br'
      const passVendas = $os.getenv('SMTP_PASSWORD_VENDAS') || ''

      settings.smtp.enabled = true
      settings.smtp.host = $os.getenv('SMTP_HOST') || 'smtp.hostinger.com'
      settings.smtp.port = parseInt($os.getenv('SMTP_PORT') || '465', 10) || 465
      settings.smtp.tls = true
      settings.smtp.username = userVendas
      if (passVendas) {
        settings.smtp.password = passVendas
      }
      settings.smtp.authMethod = 'PLAIN'

      // Remetente padrão do sistema
      settings.meta.senderName = 'TD Technology'
      settings.meta.senderAddress = userVendas

      app.save(settings)
      console.log('Migração 0017: Senha SMTP Hostinger aplicada com sucesso.')
    } catch (err) {
      console.error('Erro na migração 0017:', err)
      throw err
    }
  },
  (app) => {},
)
