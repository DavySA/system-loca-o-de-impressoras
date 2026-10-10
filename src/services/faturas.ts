import pb from '@/lib/pocketbase/client'
import type { Fatura } from '@/types'

export const faturasService = {
  async getAll(filter?: string): Promise<Fatura[]> {
    return pb.collection('faturas').getFullList<Fatura>({
      filter: filter || '',
      sort: '-mes_referencia,-created',
      expand: 'cliente_id,contrato_id',
    })
  },

  async getById(id: string): Promise<Fatura> {
    return pb.collection('faturas').getOne<Fatura>(id, {
      expand: 'cliente_id,contrato_id',
    })
  },

  async getByCliente(clienteId: string): Promise<Fatura[]> {
    return pb.collection('faturas').getFullList<Fatura>({
      filter: `cliente_id = "${clienteId}"`,
      sort: '-mes_referencia',
      expand: 'contrato_id',
    })
  },

  async create(data: Partial<Fatura>): Promise<Fatura> {
    return pb.collection('faturas').create<Fatura>(data)
  },

  async update(id: string, data: Partial<Fatura> | FormData): Promise<Fatura> {
    return pb.collection('faturas').update<Fatura>(id, data)
  },

  async anexarBoletoPdf(id: string, file: File): Promise<Fatura> {
    const formData = new FormData()
    formData.append('boleto_pdf', file)
    return pb.collection('faturas').update<Fatura>(id, formData, {
      expand: 'cliente_id,contrato_id',
    })
  },

  async removerBoletoPdf(id: string): Promise<Fatura> {
    return pb
      .collection('faturas')
      .update<Fatura>(id, { boleto_pdf: null }, { expand: 'cliente_id,contrato_id' })
  },

  getBoletoPdfUrl(fatura: Fatura): string | null {
    if (!fatura.boleto_pdf) return null
    return pb.files.getURL(fatura, fatura.boleto_pdf)
  },

  async marcarComoPaga(id: string): Promise<Fatura> {
    return pb.collection('faturas').update<Fatura>(id, {
      status: 'paga',
    })
  },

  async cancelarFatura(id: string): Promise<Fatura> {
    return pb.collection('faturas').update<Fatura>(id, {
      status: 'cancelada',
    })
  },

  async delete(id: string): Promise<boolean> {
    return pb.collection('faturas').delete(id)
  },
}
