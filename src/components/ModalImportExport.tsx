import React, { useState, useRef, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Users,
  Package,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { Cliente, GraficaProduto } from '@/types'
import { clientesService } from '@/services/clientes'
import { graficaService } from '@/services/grafica'
import { formatCurrency, formatCnpjCpf, formatPhone } from '@/lib/formatters'
import * as XLSX from 'xlsx'

interface ModalImportExportProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImportComplete?: () => void
  onImportSucesso?: () => void
  onSuccess?: () => void
  clientesExistentes?: Cliente[]
  produtosExistentes?: GraficaProduto[]
  abaPadrao?: 'clientes' | 'produtos'
}

interface LinhaClientePrevia {
  idTemp: string
  nome_razao_social: string
  documento?: string
  email?: string
  telefone?: string
  cidade?: string
  uf?: string
  endereco?: string
  cabecalho_cupom?: string
  tipo: 'Pessoa Jurídica' | 'Pessoa Física'
  tipo_cliente: 'locacao' | 'particular'
  status: 'ativo' | 'inativo'
  acao: 'criar' | 'atualizar' | 'ignorar'
  clienteExistenteId?: string
  motivo?: string
}

interface LinhaProdutoPrevia {
  idTemp: string
  nome: string
  categoria: string
  formato_tamanho?: string
  gramatura?: string
  preco_venda: number
  custo_unitario: number
  estoque_atual: number
  estoque_minimo: number
  unidade_medida: string
  acao: 'criar' | 'atualizar' | 'ignorar'
  produtoExistenteId?: string
  motivo?: string
}

export function ModalImportExport({
  open,
  onOpenChange,
  onImportComplete,
  onImportSucesso,
  onSuccess,
  clientesExistentes: clientesProp = [],
  produtosExistentes: produtosProp = [],
  abaPadrao = 'clientes',
}: ModalImportExportProps) {
  const { toast } = useToast()
  const [tabAtiva, setTabAtiva] = useState<'clientes' | 'produtos'>(abaPadrao)
  const [clientesLocal, setClientesLocal] = useState<Cliente[]>([])
  const [produtosLocal, setProdutosLocal] = useState<GraficaProduto[]>([])

  // Se não forem passados como props, carrega sob demanda
  useEffect(() => {
    if (open) {
      if (!clientesProp || clientesProp.length === 0) {
        clientesService.getAll().then(setClientesLocal).catch(console.error)
      }
      if (!produtosProp || produtosProp.length === 0) {
        graficaService.getProdutos().then(setProdutosLocal).catch(console.error)
      }
    }
  }, [open, clientesProp, produtosProp])

  const clientesExistentes = clientesProp && clientesProp.length > 0 ? clientesProp : clientesLocal
  const produtosExistentes = produtosProp && produtosProp.length > 0 ? produtosProp : produtosLocal

  const notificarSucesso = () => {
    onImportComplete?.()
    onImportSucesso?.()
    onSuccess?.()
  }

  // Clientes states
  const [clientesPrevia, setClientesPrevia] = useState<LinhaClientePrevia[]>([])
  const [nomeArquivoClientes, setNomeArquivoClientes] = useState<string>('')
  const [isProcessandoClientes, setIsProcessandoClientes] = useState(false)
  const fileInputClientesRef = useRef<HTMLInputElement>(null)

  // Produtos states
  const [produtosPrevia, setProdutosPrevia] = useState<LinhaProdutoPrevia[]>([])
  const [nomeArquivoProdutos, setNomeArquivoProdutos] = useState<string>('')
  const [isProcessandoProdutos, setIsProcessandoProdutos] = useState(false)
  const fileInputProdutosRef = useRef<HTMLInputElement>(null)

  // Resumo de conclusão
  const [relatorioConclusao, setRelatorioConclusao] = useState<{
    tipo: 'clientes' | 'produtos'
    criados: number
    atualizados: number
    ignorados: number
  } | null>(null)

  // Limpar ao fechar
  const handleClose = () => {
    setClientesPrevia([])
    setNomeArquivoClientes('')
    setProdutosPrevia([])
    setNomeArquivoProdutos('')
    setRelatorioConclusao(null)
    onOpenChange(false)
  }

  // Normalização de chaves de coluna de planilha
  const normalizarChave = (str: string) => {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')
  }

  const limparDigitos = (v: any) => String(v || '').replace(/\D/g, '')

  // 1. IMPORTAR CLIENTES (XLSX / CSV)
  const handleUploadArquivoClientes = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setNomeArquivoClientes(file.name)
    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        const rawJson: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' })

        if (rawJson.length === 0) {
          toast({
            variant: 'destructive',
            title: 'Planilha vazia',
            description: 'A planilha selecionada não possui dados para importação.',
          })
          return
        }

        const linhasMapeadas: LinhaClientePrevia[] = []

        rawJson.forEach((row, idx) => {
          // Normalizar nomes de colunas
          const rowNorm: Record<string, any> = {}
          Object.entries(row).forEach(([k, v]) => {
            rowNorm[normalizarChave(k)] = v
          })

          const nome =
            rowNorm['nome'] ||
            rowNorm['nomerazaosocial'] ||
            rowNorm['razaosocial'] ||
            rowNorm['cliente'] ||
            rowNorm['empresa'] ||
            ''

          if (!nome || String(nome).trim() === '') return

          const docRaw =
            rowNorm['documento'] || rowNorm['cnpj'] || rowNorm['cpf'] || rowNorm['cnpjcpf'] || ''
          const doc = String(docRaw).trim()
          const docDigitos = limparDigitos(doc)

          const email = String(rowNorm['email'] || rowNorm['correioeletronico'] || '').trim()
          const telefone = String(
            rowNorm['telefone'] ||
              rowNorm['celular'] ||
              rowNorm['whatsapp'] ||
              rowNorm['fone'] ||
              '',
          ).trim()
          const endereco = String(
            rowNorm['endereco'] || rowNorm['logradouro'] || rowNorm['rua'] || '',
          ).trim()
          const cidade = String(rowNorm['cidade'] || rowNorm['municipio'] || '').trim()
          const uf = String(rowNorm['uf'] || rowNorm['estado'] || 'MG')
            .trim()
            .toUpperCase()
          const cabecalho = String(
            rowNorm['cabecalhocupom'] || rowNorm['cabecalho'] || rowNorm['cupom'] || '',
          ).trim()

          // Determinar se PJ ou PF
          const tipo: 'Pessoa Jurídica' | 'Pessoa Física' =
            docDigitos.length > 11 ? 'Pessoa Jurídica' : 'Pessoa Física'

          // Casamento com clientes existentes (por documento ou por nome similar)
          const existente = clientesExistentes.find((c) => {
            if (docDigitos && c.documento) {
              return limparDigitos(c.documento) === docDigitos
            }
            return c.nome_razao_social.trim().toLowerCase() === String(nome).trim().toLowerCase()
          })

          let acao: 'criar' | 'atualizar' | 'ignorar' = 'criar'
          let motivo = 'Novo cliente a ser cadastrado'

          if (existente) {
            acao = 'atualizar'
            motivo = `Atualiza dados de: ${existente.nome_razao_social} (ID: ${existente.id.slice(0, 6)})`
          }

          linhasMapeadas.push({
            idTemp: `cli-${idx}-${Date.now()}`,
            nome_razao_social: String(nome).trim(),
            documento: doc || undefined,
            email: email || undefined,
            telefone: telefone || undefined,
            cidade: cidade || undefined,
            uf: uf || 'MG',
            endereco: endereco || undefined,
            cabecalho_cupom: cabecalho || undefined,
            tipo,
            tipo_cliente: 'particular',
            status: 'ativo',
            acao,
            clienteExistenteId: existente?.id,
            motivo,
          })
        })

        setClientesPrevia(linhasMapeadas)
        toast({
          title: 'Planilha de Clientes processada!',
          description: `${linhasMapeadas.length} registro(s) lido(s). Revise a prévia e confirme.`,
        })
      } catch (err: any) {
        toast({
          variant: 'destructive',
          title: 'Erro ao ler arquivo',
          description: err.message || 'Formato de planilha inválido.',
        })
      }
    }
    reader.readAsBinaryString(file)
  }

  // Executar gravação de clientes importados
  const handleConfirmarImportacaoClientes = async () => {
    if (clientesPrevia.length === 0) return
    setIsProcessandoClientes(true)

    let criados = 0
    let atualizados = 0
    let ignorados = 0

    try {
      for (const linha of clientesPrevia) {
        if (linha.acao === 'ignorar') {
          ignorados++
          continue
        }

        const payload: Record<string, any> = {
          nome_razao_social: linha.nome_razao_social,
          documento: linha.documento || '',
          email: linha.email || '',
          telefone: linha.telefone || '',
          cidade: linha.cidade || '',
          uf: linha.uf || 'MG',
          endereco: linha.endereco || '',
          tipo: linha.tipo,
          tipo_cliente: linha.tipo_cliente,
          status: linha.status,
        }

        if (linha.cabecalho_cupom) {
          payload.cabecalho_cupom = linha.cabecalho_cupom
        }

        if (linha.acao === 'atualizar' && linha.clienteExistenteId) {
          await clientesService.update(linha.clienteExistenteId, payload)
          atualizados++
        } else {
          await clientesService.create(payload as any)
          criados++
        }
      }

      setRelatorioConclusao({
        tipo: 'clientes',
        criados,
        atualizados,
        ignorados,
      })

      toast({
        title: 'Importação de Clientes finalizada com sucesso!',
        description: `${criados} cadastrado(s), ${atualizados} atualizado(s), ${ignorados} ignorado(s).`,
      })
      notificarSucesso()
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Erro na importação',
        description: e.message || 'Falha ao gravar registros.',
      })
    } finally {
      setIsProcessandoClientes(false)
    }
  }

  // EXPORTAR CLIENTES EM XLSX
  const handleExportarClientes = () => {
    try {
      const dados = clientesExistentes.map((c) => ({
        'Nome / Razão Social': c.nome_razao_social,
        'CNPJ / CPF': c.documento || '',
        'E-mail': c.email || '',
        Telefone: c.telefone || '',
        Endereço: c.endereco || '',
        Cidade: c.cidade || '',
        UF: c.uf || 'MG',
        Tipo: c.tipo,
        'Tipo de Cliente': c.tipo_cliente || 'particular',
        'Cabeçalho de Cupom Gráfica': c.cabecalho_cupom || '',
        Status: c.status,
      }))

      const ws = XLSX.utils.json_to_sheet(dados)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Clientes')
      XLSX.writeFile(wb, `Lista_Clientes_STD_${new Date().toISOString().slice(0, 10)}.xlsx`)

      toast({
        title: 'Exportação concluída!',
        description: `${dados.length} cliente(s) exportado(s) em XLSX.`,
      })
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao exportar',
        description: e.message,
      })
    }
  }

  // 2. IMPORTAR PRODUTOS (XLSX / CSV)
  const handleUploadArquivoProdutos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setNomeArquivoProdutos(file.name)
    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        const rawJson: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' })

        if (rawJson.length === 0) {
          toast({
            variant: 'destructive',
            title: 'Planilha vazia',
            description: 'A planilha selecionada não possui produtos para importação.',
          })
          return
        }

        const linhasMapeadas: LinhaProdutoPrevia[] = []

        rawJson.forEach((row, idx) => {
          const rowNorm: Record<string, any> = {}
          Object.entries(row).forEach(([k, v]) => {
            rowNorm[normalizarChave(k)] = v
          })

          const nome =
            rowNorm['produto'] || rowNorm['nome'] || rowNorm['descricao'] || rowNorm['item'] || ''

          if (!nome || String(nome).trim() === '') return

          const categoriaRaw = String(rowNorm['categoria'] || rowNorm['grupo'] || 'outro')
            .trim()
            .toLowerCase()

          // Determinar categoria válida
          let categoria = 'outro'
          if (categoriaRaw.includes('sulfite')) categoria = 'papel_sulfite'
          else if (categoriaRaw.includes('couche')) categoria = 'papel_couche'
          else if (categoriaRaw.includes('adesivo') || categoriaRaw.includes('vinil'))
            categoria = 'adesivo'
          else if (categoriaRaw.includes('copia')) categoria = 'copia'
          else if (categoriaRaw.includes('impress')) categoria = 'impressao'
          else if (categoriaRaw.includes('scan') || categoriaRaw.includes('digitaliz'))
            categoria = 'scanner'
          else if (categoriaRaw.includes('plastif')) categoria = 'plastificacao'
          else if (categoriaRaw.includes('encadern')) categoria = 'encadernacao'

          const formato = String(rowNorm['formato'] || rowNorm['tamanho'] || 'A4').trim()
          const gramatura = String(rowNorm['gramatura'] || '').trim()
          const unidade = String(rowNorm['unidade'] || rowNorm['un'] || 'unidade')
            .trim()
            .toLowerCase()

          const parseNumero = (val: any) => {
            if (typeof val === 'number') return val
            const s = String(val || '0')
              .replace('R$', '')
              .replace(/\s/g, '')
              .replace(/\./g, '')
              .replace(',', '.')
            return parseFloat(s) || 0
          }

          const precoVenda = parseNumero(
            rowNorm['precovenda'] ||
              rowNorm['valorunitario'] ||
              rowNorm['preco'] ||
              rowNorm['valor'] ||
              0,
          )

          const custoUnitario = parseNumero(
            rowNorm['custo'] || rowNorm['custounitario'] || rowNorm['precocusto'] || 0,
          )

          const estoqueAtual = parseNumero(
            rowNorm['quantidade'] ||
              rowNorm['estoque'] ||
              rowNorm['estoqueatual'] ||
              rowNorm['qtd'] ||
              0,
          )

          const estoqueMinimo = parseNumero(rowNorm['estoqueminimo'] || rowNorm['qtdminima'] || 10)

          // Casamento por nome de produto existente
          const existente = produtosExistentes.find(
            (p) => p.nome.trim().toLowerCase() === String(nome).trim().toLowerCase(),
          )

          let acao: 'criar' | 'atualizar' | 'ignorar' = 'criar'
          let motivo = 'Novo produto do catálogo da gráfica'

          if (existente) {
            acao = 'atualizar'
            motivo = `Atualiza produto já existente: ${existente.nome} (Estoque: ${existente.estoque_atual || 0})`
          }

          linhasMapeadas.push({
            idTemp: `prod-${idx}-${Date.now()}`,
            nome: String(nome).trim(),
            categoria,
            formato_tamanho: formato || undefined,
            gramatura: gramatura || undefined,
            preco_venda: precoVenda,
            custo_unitario: custoUnitario,
            estoque_atual: estoqueAtual,
            estoque_minimo: estoqueMinimo,
            unidade_medida: unidade.includes('folha')
              ? 'folha'
              : unidade.includes('metro')
                ? 'metro'
                : unidade.includes('cento')
                  ? 'cento'
                  : 'unidade',
            acao,
            produtoExistenteId: existente?.id,
            motivo,
          })
        })

        setProdutosPrevia(linhasMapeadas)
        toast({
          title: 'Planilha de Produtos processada!',
          description: `${linhasMapeadas.length} produto(s) mapeado(s). Verifique a prévia.`,
        })
      } catch (err: any) {
        toast({
          variant: 'destructive',
          title: 'Erro ao ler arquivo de produtos',
          description: err.message || 'Formato inválido.',
        })
      }
    }
    reader.readAsBinaryString(file)
  }

  // Executar gravação de produtos importados
  const handleConfirmarImportacaoProdutos = async () => {
    if (produtosPrevia.length === 0) return
    setIsProcessandoProdutos(true)

    let criados = 0
    let atualizados = 0
    let ignorados = 0

    try {
      for (const linha of produtosPrevia) {
        if (linha.acao === 'ignorar') {
          ignorados++
          continue
        }

        const payload: Record<string, any> = {
          nome: linha.nome,
          categoria: linha.categoria,
          formato_tamanho: linha.formato_tamanho || 'A4',
          gramatura: linha.gramatura || '',
          preco_venda: Number(linha.preco_venda) || 0,
          custo_unitario: Number(linha.custo_unitario) || 0,
          estoque_atual: Number(linha.estoque_atual) || 0,
          estoque_minimo: Number(linha.estoque_minimo) || 0,
          unidade_medida: linha.unidade_medida,
          ativo: true,
        }

        if (linha.acao === 'atualizar' && linha.produtoExistenteId) {
          await graficaService.updateProduto(linha.produtoExistenteId, payload)
          atualizados++
        } else {
          await graficaService.createProduto(payload as any)
          criados++
        }
      }

      setRelatorioConclusao({
        tipo: 'produtos',
        criados,
        atualizados,
        ignorados,
      })

      toast({
        title: 'Importação de Produtos finalizada!',
        description: `${criados} criado(s), ${atualizados} atualizado(s), ${ignorados} ignorado(s).`,
      })
      notificarSucesso()
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Erro na importação de produtos',
        description: e.message || 'Falha ao salvar registros.',
      })
    } finally {
      setIsProcessandoProdutos(false)
    }
  }

  // EXPORTAR PRODUTOS EM XLSX
  const handleExportarProdutos = () => {
    try {
      const dados = produtosExistentes.map((p) => ({
        'Produto / Descrição': p.nome,
        Categoria: p.categoria,
        'Formato / Tamanho': p.formato_tamanho || '',
        Gramatura: p.gramatura || '',
        Unidade: p.unidade_medida || 'unidade',
        'Quantidade em Estoque': p.estoque_atual || 0,
        'Estoque Mínimo': p.estoque_minimo || 0,
        'Custo Unitário (R$)': p.custo_unitario || 0,
        'Preço de Venda (R$)': p.preco_venda || 0,
        Ativo: p.ativo !== false ? 'Sim' : 'Não',
      }))

      const ws = XLSX.utils.json_to_sheet(dados)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Produtos')
      XLSX.writeFile(wb, `Produtos_Grafica_STD_${new Date().toISOString().slice(0, 10)}.xlsx`)

      toast({
        title: 'Exportação concluída!',
        description: `${dados.length} produto(s) da gráfica exportado(s).`,
      })
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao exportar produtos',
        description: e.message,
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-4 sm:p-6">
        <DialogHeader className="pb-2 border-b">
          <DialogTitle className="text-lg font-bold flex items-center gap-2 text-blue-900">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            Importar / Exportar Dados em XLSX e CSV
          </DialogTitle>
          <p className="text-xs text-gray-500">
            Compatível com arquivos Excel (.xlsx, .xls) e CSV da lista de Clientes e
            Produtos/Insumos da Gráfica.
          </p>
        </DialogHeader>

        <Tabs
          value={tabAtiva}
          onValueChange={(v: any) => setTabAtiva(v)}
          className="flex-1 flex flex-col pt-1"
        >
          <TabsList className="grid grid-cols-2 max-w-sm mb-3">
            <TabsTrigger value="clientes" className="flex items-center gap-1.5 text-xs">
              <Users className="w-4 h-4" /> Clientes ({clientesExistentes.length})
            </TabsTrigger>
            <TabsTrigger value="produtos" className="flex items-center gap-1.5 text-xs">
              <Package className="w-4 h-4" /> Produtos / Insumos ({produtosExistentes.length})
            </TabsTrigger>
          </TabsList>

          {/* ABA 1: CLIENTES */}
          <TabsContent value="clientes" className="flex-1 flex flex-col space-y-3 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-gray-50 rounded-lg border">
              <div>
                <p className="text-xs font-semibold text-gray-800">
                  Importar ou baixar lista completa de Clientes
                </p>
                <p className="text-[11px] text-gray-500">
                  Colunas reconhecidas: Nome/Razão Social, CNPJ/CPF, E-mail, Telefone, Endereço,
                  Cidade, UF e Cabeçalho Cupom.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleExportarClientes}
                  className="text-xs h-8 gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600" />
                  Exportar XLSX
                </Button>
                <input
                  type="file"
                  ref={fileInputClientesRef}
                  accept=".xlsx,.xls,.csv"
                  onChange={handleUploadArquivoClientes}
                  className="hidden"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => fileInputClientesRef.current?.click()}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Selecionar Planilha (.xlsx/.csv)
                </Button>
              </div>
            </div>

            {/* Relatório se concluído */}
            {relatorioConclusao && relatorioConclusao.tipo === 'clientes' && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>
                    Concluído: <strong>{relatorioConclusao.criados}</strong> novos,{' '}
                    <strong>{relatorioConclusao.atualizados}</strong> atualizados e{' '}
                    <strong>{relatorioConclusao.ignorados}</strong> ignorados.
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setRelatorioConclusao(null)
                    setClientesPrevia([])
                  }}
                  className="h-7 text-xs"
                >
                  Nova Importação
                </Button>
              </div>
            )}

            {/* Tabela de prévia de Clientes */}
            {clientesPrevia.length > 0 && !relatorioConclusao && (
              <div className="flex-1 flex flex-col space-y-2 overflow-hidden">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-gray-700">
                    Prévia de Conferência ({clientesPrevia.length} linhas lidas de &quot;
                    {nomeArquivoClientes}&quot;):
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-500">
                      Novos:{' '}
                      <strong className="text-emerald-700">
                        {clientesPrevia.filter((l) => l.acao === 'criar').length}
                      </strong>{' '}
                      | Atualizar:{' '}
                      <strong className="text-blue-700">
                        {clientesPrevia.filter((l) => l.acao === 'atualizar').length}
                      </strong>
                    </span>
                  </div>
                </div>

                <div className="flex-1 overflow-auto border rounded-lg max-h-[360px] bg-white">
                  <Table className="text-xs">
                    <TableHeader className="bg-gray-50 sticky top-0 z-10">
                      <TableRow>
                        <TableHead className="w-10">Ação</TableHead>
                        <TableHead>Nome / Razão Social</TableHead>
                        <TableHead>CNPJ / CPF</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Cidade / UF</TableHead>
                        <TableHead>Cabeçalho Cupom</TableHead>
                        <TableHead>Status / Conferência</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clientesPrevia.map((cli, idx) => (
                        <TableRow key={cli.idTemp || idx} className="hover:bg-gray-50/70">
                          <TableCell>
                            <Select
                              value={cli.acao}
                              onValueChange={(val: any) => {
                                const next = [...clientesPrevia]
                                next[idx].acao = val
                                setClientesPrevia(next)
                              }}
                            >
                              <SelectTrigger className="h-6 w-24 text-[10px] p-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="criar">Criar</SelectItem>
                                <SelectItem value="atualizar">Atualizar</SelectItem>
                                <SelectItem value="ignorar">Ignorar</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="font-semibold text-gray-900">
                            {cli.nome_razao_social}
                          </TableCell>
                          <TableCell className="font-mono text-gray-700">
                            {formatCnpjCpf(cli.documento) || '-'}
                          </TableCell>
                          <TableCell>{formatPhone(cli.telefone) || '-'}</TableCell>
                          <TableCell>{cli.cidade ? `${cli.cidade}/${cli.uf}` : '-'}</TableCell>
                          <TableCell className="max-w-[150px] truncate text-gray-600">
                            {cli.cabecalho_cupom || '-'}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                cli.acao === 'criar'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : cli.acao === 'atualizar'
                                    ? 'bg-blue-50 text-blue-800 border-blue-300'
                                    : 'bg-gray-100 text-gray-600'
                              }
                            >
                              {cli.motivo}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setClientesPrevia([])}
                    disabled={isProcessandoClientes}
                  >
                    Descartar Prévia
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleConfirmarImportacaoClientes}
                    disabled={isProcessandoClientes}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isProcessandoClientes ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                        Gravando Clientes...
                      </>
                    ) : (
                      `Confirmar e Salvar (${clientesPrevia.filter((l) => l.acao !== 'ignorar').length} Clientes)`
                    )}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ABA 2: PRODUTOS */}
          <TabsContent value="produtos" className="flex-1 flex flex-col space-y-3 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-gray-50 rounded-lg border">
              <div>
                <p className="text-xs font-semibold text-gray-800">
                  Importar ou baixar catálogo de Produtos da Gráfica Rápida
                </p>
                <p className="text-[11px] text-gray-500">
                  Colunas reconhecidas: Produto/Descrição, Categoria, Quantidade/Estoque, Unidade,
                  Valor Unitário / Preço e Custo.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleExportarProdutos}
                  className="text-xs h-8 gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600" />
                  Exportar XLSX
                </Button>
                <input
                  type="file"
                  ref={fileInputProdutosRef}
                  accept=".xlsx,.xls,.csv"
                  onChange={handleUploadArquivoProdutos}
                  className="hidden"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => fileInputProdutosRef.current?.click()}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Selecionar Planilha (.xlsx/.csv)
                </Button>
              </div>
            </div>

            {/* Relatório se concluído */}
            {relatorioConclusao && relatorioConclusao.tipo === 'produtos' && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>
                    Concluído: <strong>{relatorioConclusao.criados}</strong> novos,{' '}
                    <strong>{relatorioConclusao.atualizados}</strong> atualizados e{' '}
                    <strong>{relatorioConclusao.ignorados}</strong> ignorados.
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setRelatorioConclusao(null)
                    setProdutosPrevia([])
                  }}
                  className="h-7 text-xs"
                >
                  Nova Importação
                </Button>
              </div>
            )}

            {/* Tabela de prévia de Produtos */}
            {produtosPrevia.length > 0 && !relatorioConclusao && (
              <div className="flex-1 flex flex-col space-y-2 overflow-hidden">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-gray-700">
                    Prévia de Conferência ({produtosPrevia.length} produtos de &quot;
                    {nomeArquivoProdutos}&quot;):
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-500">
                      Novos:{' '}
                      <strong className="text-emerald-700">
                        {produtosPrevia.filter((l) => l.acao === 'criar').length}
                      </strong>{' '}
                      | Atualizar:{' '}
                      <strong className="text-blue-700">
                        {produtosPrevia.filter((l) => l.acao === 'atualizar').length}
                      </strong>
                    </span>
                  </div>
                </div>

                <div className="flex-1 overflow-auto border rounded-lg max-h-[360px] bg-white">
                  <Table className="text-xs">
                    <TableHeader className="bg-gray-50 sticky top-0 z-10">
                      <TableRow>
                        <TableHead className="w-10">Ação</TableHead>
                        <TableHead>Produto / Insumo</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Preço Venda</TableHead>
                        <TableHead>Custo Un.</TableHead>
                        <TableHead>Estoque Planilha</TableHead>
                        <TableHead>Status / Conferência</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {produtosPrevia.map((prod, idx) => (
                        <TableRow key={prod.idTemp || idx} className="hover:bg-gray-50/70">
                          <TableCell>
                            <Select
                              value={prod.acao}
                              onValueChange={(val: any) => {
                                const next = [...produtosPrevia]
                                next[idx].acao = val
                                setProdutosPrevia(next)
                              }}
                            >
                              <SelectTrigger className="h-6 w-24 text-[10px] p-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="criar">Criar</SelectItem>
                                <SelectItem value="atualizar">Atualizar</SelectItem>
                                <SelectItem value="ignorar">Ignorar</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="font-semibold text-gray-900">{prod.nome}</TableCell>
                          <TableCell className="capitalize text-gray-600">
                            {prod.categoria.replace('_', ' ')}
                          </TableCell>
                          <TableCell className="font-mono font-semibold text-blue-900">
                            {formatCurrency(prod.preco_venda)}
                          </TableCell>
                          <TableCell className="font-mono text-gray-600">
                            {formatCurrency(prod.custo_unitario)}
                          </TableCell>
                          <TableCell className="font-mono font-semibold">
                            {prod.estoque_atual} {prod.unidade_medida}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                prod.acao === 'criar'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : prod.acao === 'atualizar'
                                    ? 'bg-blue-50 text-blue-800 border-blue-300'
                                    : 'bg-gray-100 text-gray-600'
                              }
                            >
                              {prod.motivo}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setProdutosPrevia([])}
                    disabled={isProcessandoProdutos}
                  >
                    Descartar Prévia
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleConfirmarImportacaoProdutos}
                    disabled={isProcessandoProdutos}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isProcessandoProdutos ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                        Gravando Produtos...
                      </>
                    ) : (
                      `Confirmar e Salvar (${produtosPrevia.filter((l) => l.acao !== 'ignorar').length} Produtos)`
                    )}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="pt-2 border-t flex justify-end">
          <Button variant="outline" size="sm" onClick={handleClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
