import pb from '@/lib/pocketbase/client'
import type { ConfiguracoesEmpresa } from '@/types'

export const configuracoesService = {
  async get(): Promise<ConfiguracoesEmpresa | null> {
    try {
      const list = await pb
        .collection('configuracoes_empresa')
        .getList<ConfiguracoesEmpresa>(1, 1, {
          sort: '-created',
        })
      if (list.items.length > 0) {
        return list.items[0]
      }
      return null
    } catch {
      return null
    }
  },

  async save(data: Partial<ConfiguracoesEmpresa>, logoFile?: File): Promise<ConfiguracoesEmpresa> {
    const existing = await this.get()
    const formData = new FormData()

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null && key !== 'logo' && key !== 'id') {
        formData.append(key, String(value))
      }
    })

    if (logoFile) {
      formData.append('logo', logoFile)
    }

    if (existing) {
      return pb
        .collection('configuracoes_empresa')
        .update<ConfiguracoesEmpresa>(existing.id, formData)
    } else {
      return pb.collection('configuracoes_empresa').create<ConfiguracoesEmpresa>(formData)
    }
  },

  getLogoUrl(config: ConfiguracoesEmpresa | null): string | null {
    if (!config || !config.logo) return null
    return pb.files.getURL(config as any, config.logo)
  },
}
