import pb from '@/lib/pocketbase/client'
import type { GraficaConfiguracao } from '@/types'

// ============================================================================
// Serviço do Módulo Fiscal (NF-e)
// Padrão "integração Cora": configuração completa pronta, com a EMISSÃO
// de notas DESATIVADA até que o certificado A1 e um provedor de NF-e
// (Foco, NFe.io, PlugNotas...) estejam configurados. Sem promessa de
// emissão legal antes disso.
// ============================================================================

export interface FiscalConfiguracao {
  id: string
  razao_social?: string
  cnpj?: string
  inscricao_estadual?: string
  regime_tributario?: string
  cnae?: string
  endereco_logradouro?: string
  endereco_numero?: string
  endereco_complemento?: string
  endereco_bairro?: string
  endereco_municipio?: string
  endereco_uf?: string
  endereco_cep?: string
  telefone?: string
  email?: string
  serie_nota?: string
  numero_proxima_nota?: number
  ambiente?: 'homologacao' | 'producao'
  cfop_padrao_servico?: string
  cfop_padrao_mercadoria?: string
  created: string
  updated: string
}

export interface FiscalCertificado {
  id: string
  arquivo?: string
  nome_arquivo?: string
  validade?: string
  status?: 'ausente' | 'ativo' | 'vencido'
  created: string
  updated: string
}

export interface FiscalCertificadoStatus {
  temCertificado: boolean
  nomeArquivo?: string
  validade?: string
  vencido?: boolean
  statusTexto: string
  urlDownload?: string
}

// Monta a URL de download do arquivo .pfx (protegida por auth do PocketBase)
export function fiscalCertificadoUrl(cert: FiscalCertificado): string | undefined {
  if (!cert?.arquivo) return undefined
  return pb.files.getUrl(cert, cert.arquivo)
}

export const fiscalService = {
  // --------------------------------------------------------------------------
  // Configuração fiscal da empresa emitente
  // --------------------------------------------------------------------------
  async getConfiguracao(): Promise<FiscalConfiguracao | null> {
    try {
      const records = await pb
        .collection('fiscal_configuracao')
        .getList<FiscalConfiguracao>(1, 1, { sort: '-created' })
      return records.items[0] || null
    } catch {
      return null
    }
  },

  async salvarConfiguracao(
    data: Partial<Omit<FiscalConfiguracao, 'id' | 'created' | 'updated'>>,
  ): Promise<FiscalConfiguracao> {
    const existing = await this.getConfiguracao()
    const payload: Record<string, any> = { ...data }
    if (existing) {
      return pb.collection('fiscal_configuracao').update<FiscalConfiguracao>(existing.id, payload)
    }
    return pb.collection('fiscal_configuracao').create<FiscalConfiguracao>(payload)
  },

  // --------------------------------------------------------------------------
  // Certificado digital A1 (.pfx)
  // --------------------------------------------------------------------------
  async getCertificado(): Promise<FiscalCertificado | null> {
    try {
      const records = await pb
        .collection('fiscal_certificado')
        .getList<FiscalCertificado>(1, 1, { sort: '-created' })
      return records.items[0] || null
    } catch {
      return null
    }
  },

  async getStatusCertificado(): Promise<FiscalCertificadoStatus> {
    const cert = await this.getCertificado()
    if (!cert || !cert.arquivo) {
      return {
        temCertificado: false,
        statusTexto: 'Nenhum certificado enviado',
      }
    }

    const vencido = cert.validade ? new Date(cert.validade) < new Date() : false
    let statusTexto = 'Certificado ativo'
    if (vencido) {
      statusTexto = 'Certificado vencido'
    } else if (cert.validade) {
      const dias = Math.ceil(
        (new Date(cert.validade).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      )
      if (dias <= 30) statusTexto = `Certificado ativo — vence em ${dias} dia(s)`
    }

    return {
      temCertificado: true,
      nomeArquivo: cert.nome_arquivo || cert.arquivo,
      validade: cert.validade,
      vencido,
      statusTexto,
      urlDownload: fiscalCertificadoUrl(cert),
    }
  },

  // Envia o .pfx + senha. A senha fica SOMENTE no servidor (nunca exposta).
  async enviarCertificado(
    arquivo: File,
    senha: string,
    validade?: string,
  ): Promise<FiscalCertificado> {
    if (!arquivo.name.toLowerCase().endsWith('.pfx')) {
      throw new Error('Selecione um arquivo de certificado digital A1 no formato .pfx.')
    }
    if (arquivo.size > 5 * 1024 * 1024) {
      throw new Error('O arquivo do certificado deve ter no máximo 5 MB.')
    }
    if (!senha) {
      throw new Error('Informe a senha do certificado digital.')
    }

    const existing = await this.getCertificado()
    const form = new FormData()
    form.append('arquivo', arquivo)
    form.append('nome_arquivo', arquivo.name)
    form.append('senha', senha)
    if (validade) form.append('validade', validade)
    form.append('status', vencidoFlag(validade))

    if (existing) {
      return pb.collection('fiscal_certificado').update<FiscalCertificado>(existing.id, form)
    }
    return pb.collection('fiscal_certificado').create<FiscalCertificado>(form)
  },

  async removerCertificado(): Promise<boolean> {
    const existing = await this.getCertificado()
    if (!existing) return false
    return pb.collection('fiscal_certificado').delete(existing.id)
  },

  // --------------------------------------------------------------------------
  // Estado da emissão (sempre desativada até provedor + credenciamento)
  // --------------------------------------------------------------------------
  emissaoAtiva(): boolean {
    // Igual à integração Cora: preparada, porém desativada até que exista
    // certificado válido E provedor de NF-e contratado/credenciado na SEFAZ.
    return false
  },
}

function vencidoFlag(validade?: string): string {
  if (validade && new Date(validade) < new Date()) return 'vencido'
  return 'ativo'
}
