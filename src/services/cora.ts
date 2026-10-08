import pb from '@/lib/pocketbase/client'
import type { IntegracaoCoraConfig, CobrancaBoleto } from '@/types'

export const coraService = {
  // Obter configurações da integração Cora (apenas administrador)
  async getConfig(): Promise<IntegracaoCoraConfig | null> {
    try {
      const records = await pb.collection('integracao_cora').getList<IntegracaoCoraConfig>(1, 1, {
        sort: '-created',
      })
      return records.items[0] || null
    } catch (e: any) {
      if (e?.status === 404) return null
      return null
    }
  },

  // Salvar/atualizar configurações da integração Cora
  async saveConfig(data: Partial<IntegracaoCoraConfig>): Promise<IntegracaoCoraConfig> {
    const current = await this.getConfig()
    if (current?.id) {
      return await pb.collection('integracao_cora').update<IntegracaoCoraConfig>(current.id, data)
    }
    return await pb.collection('integracao_cora').create<IntegracaoCoraConfig>({
      ativo: false,
      ambiente: 'sandbox',
      ...data,
    })
  },

  // Listar cobranças/boletos de uma fatura
  async getCobrancasPorFatura(faturaId: string): Promise<CobrancaBoleto[]> {
    try {
      const records = await pb.collection('cobrancas_boletos').getList<CobrancaBoleto>(1, 50, {
        filter: `fatura_id = "${faturaId}"`,
        sort: '-created',
        expand: 'fatura_id,criado_por_user_id',
      })
      return records.items
    } catch {
      return []
    }
  },

  // Criar registro de cobrança/boleto preparado
  async registrarCobranca(data: {
    fatura_id: string
    valor: number
    data_vencimento?: string
    status?: 'pendente' | 'gerado' | 'pago' | 'cancelado'
    criado_por_user_id?: string
  }): Promise<CobrancaBoleto> {
    return await pb.collection('cobrancas_boletos').create<CobrancaBoleto>({
      status: data.status || 'pendente',
      ...data,
    })
  },

  // Disparo de envio de fatura por e-mail com PDF/demonstrativo via hook backend
  async enviarFaturaEmail(
    faturaId: string,
    emailDestinatario?: string,
  ): Promise<{ success: boolean; message: string; enviada_em: string; destinatario: string }> {
    return await pb.send('/backend/v1/faturas/enviar-email', {
      method: 'POST',
      body: {
        fatura_id: faturaId,
        email_destinatario: emailDestinatario,
      },
    })
  },
}
