import React, { useState, useEffect, useMemo } from 'react'
import {
  Printer,
  Package,
  Layers,
  DollarSign,
  TrendingUp,
  Plus,
  Lock,
  Unlock,
  Receipt,
  ShoppingCart,
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Calendar,
  Clock,
  Search,
  ArrowRight,
  Filter,
} from 'lucide-react'
import { graficaService } from '@/services/grafica'
import { equipamentosService } from '@/services/equipamentos'
import { suprimentosService } from '@/services/suprimentos'
import { configuracoesService } from '@/services/configuracoes'
import { CaixaPrintDialog } from '@/components/CaixaPrintDialog'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/formatters'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import type {
  GraficaProduto,
  GraficaCaixa,
  GraficaCaixaContador,
  GraficaVenda,
  Equipamento,
  Suprimento,
  CategoriaProdutoGrafica,
} from '@/types'

export default function GraficaRapida() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState<'caixa' | 'vendas' | 'produtos' | 'relatorios'>(
    'caixa',
  )
  const [isLoading, setIsLoading] = useState(true)

  // Dados centrais
  const [produtos, setProdutos] = useState<GraficaProduto[]>([])
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([])
  const [suprimentos, setSuprimentos] = useState<Suprimento[]>([])
  const [caixaAberto, setCaixaAberto] = useState<GraficaCaixa | null>(null)
  const [historicoCaixas, setHistoricoCaixas] = useState<GraficaCaixa[]>([])
  const [contadoresCaixaAberto, setContadoresCaixaAberto] = useState<GraficaCaixaContador[]>([])
  const [vendasCaixaAberto, setVendasCaixaAberto] = useState<GraficaVenda[]>([])
  const [todasVendas, setTodasVendas] = useState<GraficaVenda[]>([])

  // Configuração da Empresa para cabeçalho
  const [configEmpresa, setConfigEmpresa] = useState<ConfiguracoesEmpresa | null>(null)

  // Modais
  const [isModalAbrirCaixaOpen, setIsModalAbrirCaixaOpen] = useState(false)
  const [isModalFecharCaixaOpen, setIsModalFecharCaixaOpen] = useState(false)
  const [isModalNovaVendaOpen, setIsModalNovaVendaOpen] = useState(false)
  const [isModalNovoProdutoOpen, setIsModalNovoProdutoOpen] = useState(false)
  const [caixaParaImprimir, setCaixaParaImprimir] = useState<GraficaCaixa | null>(null)
  const [contadoresImpressao, setContadoresImpressao] = useState<GraficaCaixaContador[]>([])
  const [vendasImpressao, setVendasImpressao] = useState<GraficaVenda[]>([])
  const [isModalImprimirCaixaOpen, setIsModalImprimirCaixaOpen] = useState(false)

  // Formulário Abertura de Caixa
  const [equipamentoSelecionadoCaixa, setEquipamentoSelecionadoCaixa] = useState<string>('')
  const [contadorAnteriorMono, setContadorAnteriorMono] = useState<number>(0)
  const [contadorAnteriorColor, setContadorAnteriorColor] = useState<number>(0)
  const [contadorAberturaMono, setContadorAberturaMono] = useState<number>(0)
  const [contadorAberturaColor, setContadorAberturaColor] = useState<number>(0)
  const [saldoInicialCaixa, setSaldoInicialCaixa] = useState<number>(0)
  const [obsAbertura, setObsAbertura] = useState<string>('')
  const [contadoresAbertura, setContadoresAbertura] = useState<
    Record<
      string,
      {
        mono: number
        color: number
        copias: number
        scanner: number
        total: number
      }
    >
  >({})

  // Formulário Fechamento de Caixa
  const [saldoFinalDinheiro, setSaldoFinalDinheiro] = useState<number>(0)
  const [contadorFechamentoMono, setContadorFechamentoMono] = useState<number>(0)
  const [contadorFechamentoColor, setContadorFechamentoColor] = useState<number>(0)
  const [obsFechamento, setObsFechamento] = useState<string>('')
  const [contadoresFechamento, setContadoresFechamento] = useState<
    Record<
      string,
      {
        contador_id?: string
        mono: number
        color: number
        copias: number
        scanner: number
        total: number
      }
    >
  >({})

  // Formulário Lançamento de Venda / Serviço prestado
  const [vendaProdutoId, setVendaProdutoId] = useState<string>('')
  const [vendaDescricao, setVendaDescricao] = useState<string>('')
  const [vendaQuantidade, setVendaQuantidade] = useState<number>(1)
  const [vendaPrecoUnit, setVendaPrecoUnit] = useState<number>(0)
  const [vendaCustoUnit, setVendaCustoUnit] = useState<number>(0)
  const [vendaFormaPagamento, setVendaFormaPagamento] =
    useState<GraficaVenda['forma_pagamento']>('dinheiro')
  const [vendaClienteNome, setVendaClienteNome] = useState<string>('')
  const [vendaObservacoes, setVendaObservacoes] = useState<string>('')
  const [isSubmittingVenda, setIsSubmittingVenda] = useState(false)

  // Formulário Cadastro de Produto / Papel / Insumo
  const [prodForm, setProdForm] = useState({
    nome: '',
    categoria: 'papel_sulfite' as CategoriaProdutoGrafica,
    formato_tamanho: 'A4',
    gramatura: '75g',
    tipo_cor: 'nao_se_aplica' as GraficaProduto['tipo_cor'],
    custo_unitario: 0.05,
    preco_venda: 0.2,
    estoque_atual: 1000,
    estoque_minimo: 200,
    unidade_medida: 'folha' as GraficaProduto['unidade_medida'],
    suprimento_insumo_id: '',
    consumo_insumo_por_unidade: 1,
  })

  // Filtros de relatórios
  const [filtroPeriodoRelatorio, setFiltroPeriodoRelatorio] = useState<
    'hoje' | '7dias' | '30dias' | 'tudo'
  >('30dias')
  const [searchProduto, setSearchProduto] = useState('')

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [prods, equips, sups, cxAberto, caixas, vendas, cfg] = await Promise.all([
        graficaService.getProdutos(),
        equipamentosService.getAll(),
        suprimentosService.getAll(),
        graficaService.getCaixaAberto(),
        graficaService.getCaixas(),
        graficaService.getVendas(),
        configuracoesService.get(),
      ])

      setProdutos(prods)
      setEquipamentos(equips)
      setSuprimentos(sups)
      setCaixaAberto(cxAberto)
      setHistoricoCaixas(caixas)
      setTodasVendas(vendas)
      if (cfg) setConfigEmpresa(cfg)

      if (cxAberto) {
        const [cnts, vCaixa] = await Promise.all([
          graficaService.getContadoresPorCaixa(cxAberto.id),
          graficaService.getVendas(cxAberto.id),
        ])
        setContadoresCaixaAberto(cnts)
        setVendasCaixaAberto(vCaixa)
      } else {
        setContadoresCaixaAberto([])
        setVendasCaixaAberto([])
      }
    } catch (e) {
      console.error('Erro ao carregar dados da gráfica:', e)
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar dados da Gráfica Rápida',
        description: 'Tente recarregar a página.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('grafica_produtos', () => loadData())
  useRealtime('grafica_caixas', () => loadData())
  useRealtime('grafica_caixa_contadores', () => loadData())
  useRealtime('grafica_vendas', () => loadData())
  useRealtime('suprimentos', () => loadData())
  useRealtime('configuracoes_empresa', () => {
    configuracoesService.get().then((cfg) => {
      if (cfg) setConfigEmpresa(cfg)
    })
  })

  // Visualizar e reimprimir cupom de qualquer caixa (aberto ou histórico fechado)
  const handleImprimirCupomCaixa = async (caixa: GraficaCaixa) => {
    try {
      const [cnts, vnds] = await Promise.all([
        graficaService.getContadoresPorCaixa(caixa.id),
        graficaService.getVendas(caixa.id),
      ])
      setCaixaParaImprimir(caixa)
      setContadoresImpressao(cnts)
      setVendasImpressao(vnds)
      setIsModalImprimirCaixaOpen(true)
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar cupom',
        description: e.message || 'Não foi possível carregar os dados para impressão.',
      })
    }
  }

  // Iniciar contadores para abertura
  const handleAbrirModalAbertura = async () => {
    const initialMap: Record<string, any> = {}
    equipamentos.forEach((eq) => {
      const mono = eq.contador_monocromatico || 0
      const color = eq.contador_colorido || 0
      initialMap[eq.id] = {
        mono,
        color,
        copias: Math.round(mono * 0.4),
        scanner: 0,
        total: mono + color,
      }
    })
    setContadoresAbertura(initialMap)
    setSaldoInicialCaixa(100)
    setObsAbertura('')

    // Equipamento padrão: o primeiro da lista
    const primeiroEquip = equipamentos[0]
    if (primeiroEquip) {
      setEquipamentoSelecionadoCaixa(primeiroEquip.id)
      await handleTrocarEquipamentoAbertura(primeiroEquip.id, primeiroEquip)
    } else {
      setEquipamentoSelecionadoCaixa('')
      setContadorAnteriorMono(0)
      setContadorAnteriorColor(0)
      setContadorAberturaMono(0)
      setContadorAberturaColor(0)
    }

    setIsModalAbrirCaixaOpen(true)
  }

  const handleTrocarEquipamentoAbertura = async (equipId: string, eqParam?: Equipamento) => {
    setEquipamentoSelecionadoCaixa(equipId)
    const eq = eqParam || equipamentos.find((e) => e.id === equipId)
    if (!eq) return

    // Buscar o último caixa fechado desse equipamento para obter contadores de fechamento anteriores
    try {
      const ultimoFechado = await graficaService.getUltimoCaixaFechadoPorEquipamento(equipId)
      const antMono = ultimoFechado?.contador_fechamento_mono ?? eq.contador_monocromatico ?? 0
      const antColor = ultimoFechado?.contador_fechamento_color ?? eq.contador_colorido ?? 0
      setContadorAnteriorMono(antMono)
      setContadorAnteriorColor(antColor)
      setContadorAberturaMono(antMono)
      setContadorAberturaColor(antColor)
    } catch {
      const antMono = eq.contador_monocromatico || 0
      const antColor = eq.contador_colorido || 0
      setContadorAnteriorMono(antMono)
      setContadorAnteriorColor(antColor)
      setContadorAberturaMono(antMono)
      setContadorAberturaColor(antColor)
    }
  }

  const handleConfirmarAberturaCaixa = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!equipamentoSelecionadoCaixa) {
      toast({
        variant: 'destructive',
        title: 'Equipamento obrigatório',
        description: 'Selecione qual impressora da gráfica está em operação no caixa.',
      })
      return
    }

    try {
      const contadoresIniciais = Object.entries(contadoresAbertura).map(([eqId, cnt]) => ({
        equipamento_id: eqId,
        abertura_mono: Number(cnt.mono) || 0,
        abertura_color: Number(cnt.color) || 0,
        abertura_copias: Number(cnt.copias) || 0,
        abertura_scanner: Number(cnt.scanner) || 0,
        abertura_total: Number(cnt.total) || Number(cnt.mono) + Number(cnt.color),
      }))

      await graficaService.abrirCaixa({
        operador: user?.name || 'Operador do Caixa',
        operador_user_id: user?.id,
        saldo_inicial: Number(saldoInicialCaixa) || 0,
        equipamento_id: equipamentoSelecionadoCaixa,
        contador_anterior_mono: Number(contadorAnteriorMono) || 0,
        contador_anterior_color: Number(contadorAnteriorColor) || 0,
        contador_abertura_mono: Number(contadorAberturaMono) || 0,
        contador_abertura_color: Number(contadorAberturaColor) || 0,
        observacoes_abertura: obsAbertura,
        contadoresIniciais,
      })

      toast({
        title: 'Caixa aberto com sucesso!',
        description: 'Equipamento e contadores iniciais registrados. Operação liberada.',
      })
      setIsModalAbrirCaixaOpen(false)
      loadData()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao abrir caixa',
        description: err.message || 'Verifique os dados.',
      })
    }
  }

  // Iniciar contadores para fechamento
  const handleAbrirModalFechamento = () => {
    if (!caixaAberto) return
    const finalMap: Record<string, any> = {}
    contadoresCaixaAberto.forEach((cnt) => {
      finalMap[cnt.equipamento_id] = {
        contador_id: cnt.id,
        mono: cnt.abertura_mono || 0,
        color: cnt.abertura_color || 0,
        copias: cnt.abertura_copias || 0,
        scanner: cnt.abertura_scanner || 0,
        total: cnt.abertura_total || 0,
      }
    })
    setContadoresFechamento(finalMap)
    const saldoSugerido = (caixaAberto.saldo_inicial || 0) + (caixaAberto.total_entradas || 0)
    setSaldoFinalDinheiro(saldoSugerido)
    setContadorFechamentoMono(caixaAberto.contador_abertura_mono || 0)
    setContadorFechamentoColor(caixaAberto.contador_abertura_color || 0)
    setObsFechamento('')
    setIsModalFecharCaixaOpen(true)
  }

  const handleConfirmarFechamentoCaixa = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!caixaAberto) return
    try {
      const contadoresFinais = Object.entries(contadoresFechamento).map(([eqId, cnt]) => ({
        contador_id: cnt.contador_id,
        equipamento_id: eqId,
        fechamento_mono: Number(cnt.mono),
        fechamento_color: Number(cnt.color),
        fechamento_copias: Number(cnt.copias),
        fechamento_scanner: Number(cnt.scanner),
        fechamento_total: Number(cnt.total) || Number(cnt.mono) + Number(cnt.color),
      }))

      await graficaService.fecharCaixa(caixaAberto.id, {
        saldo_final_dinheiro: Number(saldoFinalDinheiro),
        contador_fechamento_mono: Number(contadorFechamentoMono),
        contador_fechamento_color: Number(contadorFechamentoColor),
        observacoes_fechamento: obsFechamento,
        contadoresFinais,
      })

      toast({
        title: 'Caixa do dia fechado com sucesso!',
        description: 'Os contadores foram gravados e são imutáveis após o fechamento.',
      })
      setIsModalFecharCaixaOpen(false)
      loadData()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao fechar caixa',
        description: err.message,
      })
    }
  }

  // Lançamento de Venda / Serviço
  const handleSelecionarProdutoVenda = (prodId: string) => {
    setVendaProdutoId(prodId)
    const prod = produtos.find((p) => p.id === prodId)
    if (prod) {
      setVendaDescricao(prod.nome)
      setVendaPrecoUnit(prod.preco_venda)
      setVendaCustoUnit(prod.custo_unitario)
    }
  }

  const handleConfirmarVenda = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!caixaAberto) {
      toast({
        variant: 'destructive',
        title: 'Caixa Fechado',
        description: 'Abra o caixa do dia antes de lançar vendas ou serviços.',
      })
      return
    }

    if (!vendaDescricao.trim()) {
      toast({
        variant: 'destructive',
        title: 'Descrição necessária',
        description: 'Informe o serviço ou produto vendido.',
      })
      return
    }

    setIsSubmittingVenda(true)
    try {
      await graficaService.registrarVenda({
        caixa_id: caixaAberto.id,
        operador_user_id: user?.id,
        produto_id: vendaProdutoId || undefined,
        descricao: vendaDescricao,
        quantidade: Number(vendaQuantidade),
        preco_unitario: Number(vendaPrecoUnit),
        custo_unitario: Number(vendaCustoUnit),
        forma_pagamento: vendaFormaPagamento,
        cliente_nome: vendaClienteNome || 'Balcão / Cliente Final',
        observacoes: vendaObservacoes,
        darBaixaInsumo: true,
      })

      toast({
        title: 'Serviço/Venda registrado com sucesso!',
        description: 'Baixa automática efetuada no estoque de papéis/insumos.',
      })
      setIsModalNovaVendaOpen(false)
      setVendaProdutoId('')
      setVendaDescricao('')
      setVendaQuantidade(1)
      setVendaPrecoUnit(0)
      setVendaCustoUnit(0)
      setVendaClienteNome('')
      setVendaObservacoes('')
      loadData()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao registrar venda',
        description: err.message,
      })
    } finally {
      setIsSubmittingVenda(false)
    }
  }

  const handleEstornarVenda = async (vendaId: string, desc: string) => {
    if (
      !confirm(
        `Deseja estornar a venda "${desc}"? Os estoques e totais do caixa serão restaurados automaticamente.`,
      )
    )
      return
    try {
      await graficaService.estornarVenda(vendaId)
      toast({
        title: 'Venda estornada',
        description: 'Estoque e saldo do caixa restaurados.',
      })
      loadData()
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao estornar',
        description: 'Não foi possível cancelar o registro.',
      })
    }
  }

  // Cadastro de Novo Produto / Papel
  const handleCadastrarProduto = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await graficaService.createProduto({
        ...prodForm,
        custo_unitario: Number(prodForm.custo_unitario),
        preco_venda: Number(prodForm.preco_venda),
        estoque_atual: Number(prodForm.estoque_atual),
        estoque_minimo: Number(prodForm.estoque_minimo),
        suprimento_insumo_id: prodForm.suprimento_insumo_id || undefined,
        consumo_insumo_por_unidade: Number(prodForm.consumo_insumo_por_unidade) || 1,
        ativo: true,
      })

      toast({
        title: 'Produto/Insumo cadastrado!',
        description: 'Disponível imediatamente no PDV do caixa.',
      })
      setIsModalNovoProdutoOpen(false)
      loadData()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao cadastrar produto',
        description: err.message,
      })
    }
  }

  // Cálculos do Caixa Aberto
  const totalRecebidoCaixa = vendasCaixaAberto.reduce((acc, v) => acc + (v.valor_total || 0), 0)
  const totalCustoInsumosCaixa = vendasCaixaAberto.reduce((acc, v) => acc + (v.custo_total || 0), 0)
  const lucroCaixaAberto = totalRecebidoCaixa - totalCustoInsumosCaixa
  const saldoAtualEstimado = (caixaAberto?.saldo_inicial || 0) + totalRecebidoCaixa

  // Vendas filtradas para o relatório
  const vendasFiltradasRelatorio = useMemo(() => {
    const now = new Date()
    return todasVendas.filter((v) => {
      const vDate = new Date(v.data_hora || v.created)
      if (filtroPeriodoRelatorio === 'hoje') {
        return vDate.toDateString() === now.toDateString()
      }
      if (filtroPeriodoRelatorio === '7dias') {
        const d7 = new Date(now.getTime() - 7 * 24 * 3600 * 1000)
        return vDate >= d7
      }
      if (filtroPeriodoRelatorio === '30dias') {
        const d30 = new Date(now.getTime() - 30 * 24 * 3600 * 1000)
        return vDate >= d30
      }
      return true
    })
  }, [todasVendas, filtroPeriodoRelatorio])

  const relatorioTotalVendas = vendasFiltradasRelatorio.reduce(
    (acc, v) => acc + (v.valor_total || 0),
    0,
  )
  const relatorioTotalCustos = vendasFiltradasRelatorio.reduce(
    (acc, v) => acc + (v.custo_total || 0),
    0,
  )
  const relatorioLucro = relatorioTotalVendas - relatorioTotalCustos
  const relatorioQtdItens = vendasFiltradasRelatorio.reduce(
    (acc, v) => acc + (v.quantidade || 1),
    0,
  )

  // Produtos filtrados
  const produtosFiltrados = useMemo(() => {
    return produtos.filter((p) => {
      const q = searchProduto.toLowerCase()
      return (
        p.nome.toLowerCase().includes(q) ||
        p.categoria.toLowerCase().includes(q) ||
        (p.formato_tamanho || '').toLowerCase().includes(q)
      )
    })
  }, [produtos, searchProduto])

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Layers className="w-6 h-6 text-blue-600" /> Gestão da Gráfica Rápida
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Abertura e fechamento de caixa diário, contadores das impressoras, baixa de insumos
            (sulfite, couchê, adesivos) e relatórios de lucro
          </p>
        </div>

        {/* Status do Caixa + Botões de Ação */}
        <div className="flex items-center gap-2">
          {caixaAberto ? (
            <>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Caixa Aberto por {caixaAberto.operador}
              </div>
              <Button
                onClick={() => setIsModalNovaVendaOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-xs text-xs flex items-center gap-1.5"
              >
                <ShoppingCart className="w-4 h-4" /> Registrar Serviço / Venda
              </Button>
              <Button
                variant="outline"
                onClick={() => handleImprimirCupomCaixa(caixaAberto)}
                className="border-gray-300 text-gray-700 hover:bg-gray-50 text-xs flex items-center gap-1.5"
                title="Visualizar ou imprimir cupom do caixa"
              >
                <Printer className="w-4 h-4 text-blue-600" /> Cupom
              </Button>
              <Button
                onClick={handleAbrirModalFechamento}
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-50 text-xs flex items-center gap-1.5"
              >
                <Lock className="w-4 h-4 text-red-600" /> Fechar Caixa
              </Button>
            </>
          ) : (
            <Button
              onClick={handleAbrirModalAbertura}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs text-xs flex items-center gap-1.5"
            >
              <Unlock className="w-4 h-4" /> Abrir Caixa Diário
            </Button>
          )}
        </div>
      </div>

      {/* Tabs Principais da Gráfica Rápida */}
      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)}>
        <TabsList className="bg-gray-100 p-1">
          <TabsTrigger value="caixa" className="text-xs flex items-center gap-1.5">
            <Receipt className="w-4 h-4" /> Operação do Caixa Diário
            {caixaAberto && <span className="w-2 h-2 rounded-full bg-emerald-500 ml-1" />}
          </TabsTrigger>
          <TabsTrigger value="vendas" className="text-xs flex items-center gap-1.5">
            <ShoppingCart className="w-4 h-4" /> Vendas & Serviços Prestados
          </TabsTrigger>
          <TabsTrigger value="produtos" className="text-xs flex items-center gap-1.5">
            <Package className="w-4 h-4" /> Produtos, Papéis & Adesivos
          </TabsTrigger>
          <TabsTrigger value="relatorios" className="text-xs flex items-center gap-1.5">
            <FileSpreadsheet className="w-4 h-4" /> Fechamentos & Relatório de Lucro
          </TabsTrigger>
        </TabsList>

        {/* ---------------- TAB 1: OPERAÇÃO DO CAIXA ---------------- */}
        <TabsContent value="caixa" className="space-y-6 pt-2">
          {caixaAberto ? (
            <>
              {/* Cards do Caixa Aberto */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <Card className="border border-gray-200 shadow-xs">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs uppercase font-semibold text-gray-500">
                      Saldo Inicial em Gaveta
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold font-mono text-gray-900">
                      {formatCurrency(caixaAberto.saldo_inicial || 0)}
                    </p>
                    <span className="text-[10px] text-gray-400">
                      Abertura: {formatDateTime(caixaAberto.data_abertura)}
                    </span>
                  </CardContent>
                </Card>

                <Card className="border border-gray-200 shadow-xs">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs uppercase font-semibold text-blue-600">
                      Total Recebido Hoje
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold font-mono text-blue-900">
                      {formatCurrency(totalRecebidoCaixa)}
                    </p>
                    <span className="text-[10px] text-blue-600">
                      {vendasCaixaAberto.length} lançamentos efetuados
                    </span>
                  </CardContent>
                </Card>

                <Card className="border border-gray-200 shadow-xs">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs uppercase font-semibold text-gray-500">
                      Custo de Insumos Baixados
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold font-mono text-gray-700">
                      {formatCurrency(totalCustoInsumosCaixa)}
                    </p>
                    <span className="text-[10px] text-gray-400">Papéis, tintas e mídias</span>
                  </CardContent>
                </Card>

                <Card className="border border-emerald-200 bg-emerald-50/40 shadow-xs">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs uppercase font-semibold text-emerald-700">
                      Lucro Líquido do Caixa
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold font-mono text-emerald-800">
                      {formatCurrency(lucroCaixaAberto)}
                    </p>
                    <span className="text-[10px] text-emerald-600 font-medium">
                      Saldo em dinheiro gaveta: {formatCurrency(saldoAtualEstimado)}
                    </span>
                  </CardContent>
                </Card>
              </div>

              {/* Equipamento Vinculado e Contadores das Impressoras da Gráfica */}
              <Card className="border border-gray-200 shadow-xs">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <Printer className="w-4 h-4 text-blue-600" /> Equipamento em Operação &
                      Contadores
                    </CardTitle>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {caixaAberto.expand?.equipamento_id
                        ? `Equipamento Vinculado: ${caixaAberto.expand.equipamento_id.marca} ${caixaAberto.expand.equipamento_id.modelo} (S/N: ${caixaAberto.expand.equipamento_id.numero_serie})`
                        : 'Equipamento selecionado na abertura deste caixa'}
                    </p>
                  </div>
                  {caixaAberto.expand?.equipamento_id && (
                    <Badge
                      variant="outline"
                      className="bg-blue-50 text-blue-700 border-blue-200 text-xs"
                    >
                      {caixaAberto.expand.equipamento_id.marca}{' '}
                      {caixaAberto.expand.equipamento_id.modelo}
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 mb-4 text-xs">
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase font-semibold">
                        Contador Anterior Mono
                      </span>
                      <p className="font-mono font-bold text-gray-800 text-sm">
                        {caixaAberto.contador_anterior_mono?.toLocaleString('pt-BR') || 0}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase font-semibold">
                        Abertura Mono
                      </span>
                      <p className="font-mono font-bold text-blue-800 text-sm">
                        {caixaAberto.contador_abertura_mono?.toLocaleString('pt-BR') || 0}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase font-semibold">
                        Contador Anterior Color
                      </span>
                      <p className="font-mono font-bold text-gray-800 text-sm">
                        {caixaAberto.contador_anterior_color?.toLocaleString('pt-BR') || 0}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase font-semibold">
                        Abertura Color
                      </span>
                      <p className="font-mono font-bold text-blue-800 text-sm">
                        {caixaAberto.contador_abertura_color?.toLocaleString('pt-BR') || 0}
                      </p>
                    </div>
                  </div>

                  {contadoresCaixaAberto.length === 0 ? (
                    <p className="text-xs text-gray-500 py-4 text-center">
                      Nenhum medidor gravado na abertura deste caixa.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-gray-50 text-gray-600 font-semibold border-b">
                          <tr>
                            <th className="py-2.5 px-3">Impressora</th>
                            <th className="py-2.5 px-3 text-right">Abertura Mono</th>
                            <th className="py-2.5 px-3 text-right">Abertura Color</th>
                            <th className="py-2.5 px-3 text-right">Abertura Cópias</th>
                            <th className="py-2.5 px-3 text-right">Abertura Scanner</th>
                            <th className="py-2.5 px-3 text-right font-bold text-gray-900">
                              Total Inicial
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 font-mono">
                          {contadoresCaixaAberto.map((cnt) => {
                            const eq =
                              cnt.expand?.equipamento_id ||
                              equipamentos.find((e) => e.id === cnt.equipamento_id)
                            return (
                              <tr key={cnt.id} className="hover:bg-gray-50">
                                <td className="py-2 px-3 font-sans font-medium text-gray-900">
                                  {eq
                                    ? `${eq.marca} ${eq.modelo} (${eq.numero_serie})`
                                    : 'Impressora'}
                                </td>
                                <td className="py-2 px-3 text-right text-gray-600">
                                  {cnt.abertura_mono?.toLocaleString('pt-BR')}
                                </td>
                                <td className="py-2 px-3 text-right text-gray-600">
                                  {cnt.abertura_color?.toLocaleString('pt-BR')}
                                </td>
                                <td className="py-2 px-3 text-right text-gray-600">
                                  {cnt.abertura_copias?.toLocaleString('pt-BR')}
                                </td>
                                <td className="py-2 px-3 text-right text-gray-600">
                                  {cnt.abertura_scanner?.toLocaleString('pt-BR')}
                                </td>
                                <td className="py-2 px-3 text-right font-bold text-blue-900">
                                  {(
                                    cnt.abertura_total ||
                                    (cnt.abertura_mono || 0) + (cnt.abertura_color || 0)
                                  )?.toLocaleString('pt-BR')}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Lançamentos do Caixa Aberto */}
              <Card className="border border-gray-200 shadow-xs">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-emerald-600" /> Movimento de Vendas do
                      Caixa Atual
                    </CardTitle>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Serviços de cópia, impressão e venda de papéis com baixa de insumos automática
                    </p>
                  </div>
                  <Button
                    onClick={() => setIsModalNovaVendaOpen(true)}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8"
                  >
                    + Novo Lançamento
                  </Button>
                </CardHeader>
                <CardContent>
                  {vendasCaixaAberto.length === 0 ? (
                    <div className="py-8 text-center text-xs text-gray-500">
                      Nenhuma venda ou serviço lançado neste caixa até o momento.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-gray-50 text-gray-600 font-semibold border-b">
                          <tr>
                            <th className="py-2.5 px-3">Hora</th>
                            <th className="py-2.5 px-3">Descrição do Serviço / Produto</th>
                            <th className="py-2.5 px-3 text-center">Qtd</th>
                            <th className="py-2.5 px-3 text-right">Preço Un.</th>
                            <th className="py-2.5 px-3 text-right font-bold text-gray-900">
                              Total
                            </th>
                            <th className="py-2.5 px-3 text-right">Custo Insumo</th>
                            <th className="py-2.5 px-3 text-right text-emerald-700 font-bold">
                              Lucro
                            </th>
                            <th className="py-2.5 px-3">Pagamento</th>
                            <th className="py-2.5 px-3 text-right">Ação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {vendasCaixaAberto.map((v) => (
                            <tr key={v.id} className="hover:bg-gray-50">
                              <td className="py-2 px-3 font-mono text-gray-500">
                                {new Date(v.data_hora).toLocaleTimeString('pt-BR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </td>
                              <td className="py-2 px-3 font-semibold text-gray-900">
                                {v.descricao}
                                {v.cliente_nome && (
                                  <span className="block text-[10.5px] font-normal text-gray-400">
                                    Cliente: {v.cliente_nome}
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-center font-mono font-medium">
                                {v.quantidade}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-gray-600">
                                {formatCurrency(v.preco_unitario)}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-gray-900">
                                {formatCurrency(v.valor_total)}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-gray-600">
                                {formatCurrency(v.custo_total || 0)}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600">
                                {formatCurrency(
                                  v.lucro_total || v.valor_total - (v.custo_total || 0),
                                )}
                              </td>
                              <td className="py-2 px-3">
                                <Badge variant="outline" className="text-[10px] capitalize">
                                  {v.forma_pagamento?.replace('_', ' ')}
                                </Badge>
                              </td>
                              <td className="py-2 px-3 text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEstornarVenda(v.id, v.descricao)}
                                  className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                  title="Estornar venda e devolver ao estoque"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            /* Caixa Fechado */
            <div className="p-12 text-center rounded-xl border border-dashed border-gray-300 bg-gray-50 space-y-3">
              <Lock className="w-12 h-12 text-gray-400 mx-auto" />
              <h3 className="text-base font-bold text-gray-800">O caixa da gráfica está fechado</h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                Para começar a registrar serviços de impressão, cópias, encadernações ou vendas de
                mídias, faça a abertura diária informando os contadores iniciais das impressoras e o
                troco inicial.
              </p>
              <Button
                onClick={handleAbrirModalAbertura}
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs text-xs"
              >
                <Unlock className="w-4 h-4 mr-1.5" /> Abrir Caixa do Dia
              </Button>
            </div>
          )}
        </TabsContent>

        {/* ---------------- TAB 2: VENDAS & SERVIÇOS ---------------- */}
        <TabsContent value="vendas" className="space-y-4 pt-2">
          <Card className="border border-gray-200 shadow-xs">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-blue-600" /> Histórico de Vendas & Insumos
                  Utilizados
                </CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">
                  Extrato detalhado de todos os serviços prestados no balcão da gráfica
                </p>
              </div>
              {caixaAberto && (
                <Button
                  onClick={() => setIsModalNovaVendaOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Novo Lançamento
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {todasVendas.length === 0 ? (
                <p className="text-xs text-gray-500 py-8 text-center">
                  Nenhuma venda registrada ainda.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50 text-gray-600 font-semibold border-b">
                      <tr>
                        <th className="py-2.5 px-3">Data/Hora</th>
                        <th className="py-2.5 px-3">Serviço / Produto</th>
                        <th className="py-2.5 px-3">Cliente</th>
                        <th className="py-2.5 px-3 text-center">Qtd</th>
                        <th className="py-2.5 px-3 text-right">Preço Un.</th>
                        <th className="py-2.5 px-3 text-right font-bold text-gray-900">Total</th>
                        <th className="py-2.5 px-3 text-right">Custo</th>
                        <th className="py-2.5 px-3 text-right text-emerald-700 font-bold">Lucro</th>
                        <th className="py-2.5 px-3">Pagamento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {todasVendas.map((v) => (
                        <tr key={v.id} className="hover:bg-gray-50">
                          <td className="py-2.5 px-3 text-gray-500 font-mono">
                            {formatDateTime(v.data_hora || v.created)}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-gray-900">{v.descricao}</td>
                          <td className="py-2.5 px-3 text-gray-600">
                            {v.cliente_nome || 'Balcão'}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-medium">
                            {v.quantidade}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-gray-600">
                            {formatCurrency(v.preco_unitario)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-900">
                            {formatCurrency(v.valor_total)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-gray-600">
                            {formatCurrency(v.custo_total || 0)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">
                            {formatCurrency(v.lucro_total || v.valor_total - (v.custo_total || 0))}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="capitalize text-[10.5px] px-2 py-0.5 bg-gray-100 rounded text-gray-700 border">
                              {v.forma_pagamento?.replace('_', ' ')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------- TAB 3: PRODUTOS, PAPÉIS & ADESIVOS ---------------- */}
        <TabsContent value="produtos" className="space-y-4 pt-2">
          <Card className="border border-gray-200 shadow-xs">
            <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-600" /> Catálogo de Insumos & Serviços da
                  Gráfica
                </CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">
                  Tipos de papéis (sulfite, couchê, adesivos), formatos, custos, preços de venda e
                  estoque integrado
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <Input
                    type="text"
                    placeholder="Filtrar produtos/papéis..."
                    value={searchProduto}
                    onChange={(e) => setSearchProduto(e.target.value)}
                    className="h-8 pl-8 text-xs w-48"
                  />
                </div>
                <Button
                  onClick={() => setIsModalNovoProdutoOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Novo Produto/Papel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 text-gray-600 font-semibold border-b">
                    <tr>
                      <th className="py-2.5 px-3">Item / Tipo de Papel</th>
                      <th className="py-2.5 px-3">Categoria</th>
                      <th className="py-2.5 px-3">Formato / Gramatura</th>
                      <th className="py-2.5 px-3 text-center">Estoque Atual</th>
                      <th className="py-2.5 px-3 text-center">Est. Mín</th>
                      <th className="py-2.5 px-3 text-right">Custo Un.</th>
                      <th className="py-2.5 px-3 text-right">Preço Venda</th>
                      <th className="py-2.5 px-3 text-right font-bold text-emerald-700">
                        Lucro Unit.
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {produtosFiltrados.map((p) => {
                      const lucro = p.preco_venda - p.custo_unitario
                      const lucroPct = p.custo_unitario > 0 ? (lucro / p.custo_unitario) * 100 : 100
                      const isAbaixo =
                        p.estoque_minimo !== undefined && (p.estoque_atual || 0) <= p.estoque_minimo

                      return (
                        <tr
                          key={p.id}
                          className={`hover:bg-gray-50 ${isAbaixo ? 'bg-amber-50/50' : ''}`}
                        >
                          <td className="py-2.5 px-3 font-semibold text-gray-900">{p.nome}</td>
                          <td className="py-2.5 px-3">
                            <span className="capitalize px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              {p.categoria.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-gray-600">
                            {p.formato_tamanho} {p.gramatura ? `(${p.gramatura})` : ''}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold">
                            <span
                              className={
                                isAbaixo ? 'text-amber-700 font-extrabold' : 'text-gray-900'
                              }
                            >
                              {p.estoque_atual || 0} {p.unidade_medida || 'un'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-gray-400">
                            {p.estoque_minimo || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-gray-600">
                            {formatCurrency(p.custo_unitario)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-900">
                            {formatCurrency(p.preco_venda)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                            +{formatCurrency(lucro)} ({lucroPct.toFixed(0)}%)
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------- TAB 4: FECHAMENTOS & RELATÓRIOS ---------------- */}
        <TabsContent value="relatorios" className="space-y-6 pt-2">
          {/* Barra de Filtro de Período do Relatório */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-blue-600" /> Relatório Consolidado de
                Insumos & Lucro da Gráfica
              </h3>
              <p className="text-xs text-gray-500">
                Somatório de serviços prestados, consumo de insumos, entradas e lucro apurado
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-600">Período:</span>
              <div className="flex bg-gray-100 p-0.5 rounded-lg border">
                {(['hoje', '7dias', '30dias', 'tudo'] as const).map((per) => (
                  <button
                    key={per}
                    onClick={() => setFiltroPeriodoRelatorio(per)}
                    className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                      filtroPeriodoRelatorio === per
                        ? 'bg-white text-blue-700 font-bold shadow-2xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {per === 'hoje'
                      ? 'Hoje'
                      : per === '7dias'
                        ? 'Últimos 7 dias'
                        : per === '30dias'
                          ? 'Últimos 30 dias'
                          : 'Todo o Histórico'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Cards de Métricas do Relatório */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="border border-gray-200 shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase font-semibold text-gray-500">
                  Insumos / Serviços Realizados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold font-mono text-gray-900">
                  {relatorioQtdItens.toLocaleString('pt-BR')} un.
                </p>
                <span className="text-[10px] text-gray-400">
                  {vendasFiltradasRelatorio.length} atendimentos
                </span>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase font-semibold text-blue-600">
                  Faturamento Bruto
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold font-mono text-blue-900">
                  {formatCurrency(relatorioTotalVendas)}
                </p>
                <span className="text-[10px] text-blue-600">Valores recebidos</span>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase font-semibold text-gray-500">
                  Custo Total de Insumos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold font-mono text-gray-700">
                  {formatCurrency(relatorioTotalCustos)}
                </p>
                <span className="text-[10px] text-gray-400">Papéis e mídias consumidos</span>
              </CardContent>
            </Card>

            <Card className="border border-emerald-200 bg-emerald-50/50 shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase font-semibold text-emerald-800">
                  Lucro Líquido Apurado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold font-mono text-emerald-800">
                  {formatCurrency(relatorioLucro)}
                </p>
                <span className="text-[10px] text-emerald-700 font-bold">
                  {relatorioTotalVendas > 0
                    ? `Margem de lucro: ${((relatorioLucro / relatorioTotalVendas) * 100).toFixed(1)}%`
                    : '100%'}
                </span>
              </CardContent>
            </Card>
          </div>

          {/* Histórico de Fechamentos de Caixas Diários */}
          <Card className="border border-gray-200 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-blue-600" /> Histórico de Fechamentos de Caixa
              </CardTitle>
              <p className="text-xs text-gray-500">
                Auditoria de caixas diários com operador, entradas, custos, deltas e saldos finais
              </p>
            </CardHeader>
            <CardContent>
              {historicoCaixas.length === 0 ? (
                <p className="text-xs text-gray-500 py-6 text-center">
                  Nenhum caixa fechado registrado.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50 text-gray-600 font-semibold border-b">
                      <tr>
                        <th className="py-2.5 px-3">Data</th>
                        <th className="py-2.5 px-3">Operador</th>
                        <th className="py-2.5 px-3">Equipamento</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-center">Produção (Mono/Color)</th>
                        <th className="py-2.5 px-3 text-right">Total Entradas</th>
                        <th className="py-2.5 px-3 text-right font-bold text-emerald-700">
                          Lucro Caixa
                        </th>
                        <th className="py-2.5 px-3 text-right">Saldo Final</th>
                        <th className="py-2.5 px-3 text-right">Cupom</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {historicoCaixas.map((cx) => (
                        <tr key={cx.id} className="hover:bg-gray-50">
                          <td className="py-2.5 px-3 font-medium text-gray-900">
                            {formatDate(cx.data)}
                          </td>
                          <td className="py-2.5 px-3 text-gray-600">{cx.operador}</td>
                          <td className="py-2.5 px-3 text-gray-700">
                            {cx.expand?.equipamento_id
                              ? `${cx.expand.equipamento_id.marca} ${cx.expand.equipamento_id.modelo}`
                              : 'Geral'}
                          </td>
                          <td className="py-2.5 px-3">
                            <Badge
                              variant="outline"
                              className={
                                cx.status === 'aberto'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                  : 'bg-gray-100 text-gray-700 border-gray-300'
                              }
                            >
                              {cx.status === 'aberto' ? 'Aberto' : 'Fechado (Imutável)'}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-xs">
                            {cx.status === 'fechado' ? (
                              <span className="text-gray-800">
                                +{(cx.producao_mono ?? 0).toLocaleString('pt-BR')} M | +
                                {(cx.producao_color ?? 0).toLocaleString('pt-BR')} C
                              </span>
                            ) : (
                              <span className="text-gray-400">Em andamento</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-gray-900">
                            {formatCurrency(cx.total_entradas || 0)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                            {formatCurrency(
                              cx.lucro_total ||
                                (cx.total_entradas || 0) - (cx.total_custo_insumos || 0),
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-900">
                            {formatCurrency(cx.saldo_final_dinheiro || 0)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleImprimirCupomCaixa(cx)}
                              className="h-7 px-2 text-[11px] flex items-center gap-1 text-gray-700 hover:text-blue-700 hover:border-blue-300 shadow-xs"
                              title="Imprimir cupom/ficha do fechamento"
                            >
                              <Printer className="w-3.5 h-3.5" /> Cupom
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ---------------- MODAIS ---------------- */}

      {/* Modal 1: Abertura Diária de Caixa com Contadores de Impressoras */}
      <Dialog open={isModalAbrirCaixaOpen} onOpenChange={setIsModalAbrirCaixaOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              <Unlock className="w-5 h-5" /> Abertura de Caixa Diário — Gráfica Rápida
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleConfirmarAberturaCaixa} className="space-y-4 pt-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="op-nome">Operador Responsável</Label>
                <Input
                  id="op-nome"
                  value={user?.name || 'Operador'}
                  disabled
                  className="bg-gray-50"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="saldo-ini">Troco / Fundo de Caixa Inicial (R$) *</Label>
                <Input
                  id="saldo-ini"
                  type="number"
                  step="0.01"
                  min="0"
                  value={saldoInicialCaixa}
                  onChange={(e) => setSaldoInicialCaixa(parseFloat(e.target.value) || 0)}
                  required
                  className="font-mono"
                />
              </div>
            </div>

            {/* Seleção Obrigatória do Equipamento em Operação */}
            <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200 space-y-3">
              <div>
                <Label htmlFor="sel-eq-caixa" className="font-bold text-blue-900 block mb-1">
                  Equipamento em Operação neste Caixa <span className="text-red-500">*</span>
                </Label>
                <p className="text-[11px] text-blue-700 mb-2">
                  Escolha qual impressora da gráfica está operando neste caixa para rastrear
                  contadores e produção.
                </p>
                <Select
                  value={equipamentoSelecionadoCaixa}
                  onValueChange={(val) => handleTrocarEquipamentoAbertura(val)}
                >
                  <SelectTrigger id="sel-eq-caixa" className="bg-white">
                    <SelectValue placeholder="Selecione o equipamento da gráfica" />
                  </SelectTrigger>
                  <SelectContent>
                    {equipamentos.map((eq) => (
                      <SelectItem key={eq.id} value={eq.id}>
                        {eq.marca} {eq.modelo} — S/N: {eq.numero_serie}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Exibição dos Contadores Anteriores e Abertura do Equipamento Selecionado */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-blue-200 text-xs">
                <div>
                  <span className="text-[10px] text-gray-500 uppercase font-semibold">
                    Anterior Mono
                  </span>
                  <p className="font-mono font-bold text-gray-800">
                    {contadorAnteriorMono.toLocaleString('pt-BR')}
                  </p>
                </div>
                <div>
                  <Label className="text-[10.5px] font-semibold text-blue-900">
                    Abertura Mono *
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={contadorAberturaMono}
                    onChange={(e) => setContadorAberturaMono(parseInt(e.target.value) || 0)}
                    required
                    className="h-7 text-xs font-mono bg-white"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase font-semibold">
                    Anterior Color
                  </span>
                  <p className="font-mono font-bold text-gray-800">
                    {contadorAnteriorColor.toLocaleString('pt-BR')}
                  </p>
                </div>
                <div>
                  <Label className="text-[10.5px] font-semibold text-blue-900">
                    Abertura Color *
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={contadorAberturaColor}
                    onChange={(e) => setContadorAberturaColor(parseInt(e.target.value) || 0)}
                    required
                    className="h-7 text-xs font-mono bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Alimentação dos Contadores de Abertura das Demais Impressoras */}
            <div className="space-y-2 pt-2 border-t">
              <Label className="font-semibold text-gray-900 block">
                Contadores Iniciais das Impressoras da Gráfica:
              </Label>
              <p className="text-[11px] text-gray-500">
                Alimente os contadores físicos de cada impressora ao abrir o caixa para apurar a
                produção do dia.
              </p>

              <div className="space-y-3">
                {equipamentos.map((eq) => {
                  const cnt = contadoresAbertura[eq.id] || {
                    mono: 0,
                    color: 0,
                    copias: 0,
                    scanner: 0,
                    total: 0,
                  }
                  return (
                    <div key={eq.id} className="p-3 rounded-lg border bg-gray-50/70 space-y-2">
                      <div className="font-bold text-gray-900 flex items-center justify-between">
                        <span>
                          {eq.marca} {eq.modelo}
                        </span>
                        <span className="text-[11px] font-mono text-gray-500">
                          S/N: {eq.numero_serie}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div>
                          <Label className="text-[10.5px] text-gray-600">Contador Mono</Label>
                          <Input
                            type="number"
                            min="0"
                            value={cnt.mono}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0
                              setContadoresAbertura((prev) => ({
                                ...prev,
                                [eq.id]: { ...cnt, mono: val, total: val + cnt.color },
                              }))
                            }}
                            className="h-7 text-xs font-mono"
                          />
                        </div>

                        <div>
                          <Label className="text-[10.5px] text-gray-600">Contador Color</Label>
                          <Input
                            type="number"
                            min="0"
                            value={cnt.color}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0
                              setContadoresAbertura((prev) => ({
                                ...prev,
                                [eq.id]: { ...cnt, color: val, total: cnt.mono + val },
                              }))
                            }}
                            className="h-7 text-xs font-mono"
                          />
                        </div>

                        <div>
                          <Label className="text-[10.5px] text-gray-600">Cópias</Label>
                          <Input
                            type="number"
                            min="0"
                            value={cnt.copias}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0
                              setContadoresAbertura((prev) => ({
                                ...prev,
                                [eq.id]: { ...cnt, copias: val },
                              }))
                            }}
                            className="h-7 text-xs font-mono"
                          />
                        </div>

                        <div>
                          <Label className="text-[10.5px] text-gray-600">Scanner</Label>
                          <Input
                            type="number"
                            min="0"
                            value={cnt.scanner}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0
                              setContadoresAbertura((prev) => ({
                                ...prev,
                                [eq.id]: { ...cnt, scanner: val },
                              }))
                            }}
                            className="h-7 text-xs font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="obs-ab">Observações de Abertura (Opcional)</Label>
              <Textarea
                id="obs-ab"
                rows={2}
                placeholder="Ex: Troco em notas de 5 e 10..."
                value={obsAbertura}
                onChange={(e) => setObsAbertura(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalAbrirCaixaOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Confirmar e Abrir Caixa
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Fechamento Diário de Caixa com Contadores Finais */}
      <Dialog open={isModalFecharCaixaOpen} onOpenChange={setIsModalFecharCaixaOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <Lock className="w-5 h-5" /> Fechamento de Caixa Diário — Gráfica Rápida
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleConfirmarFechamentoCaixa} className="space-y-4 pt-2 text-xs">
            <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-200 grid grid-cols-3 gap-2 text-center">
              <div>
                <span className="text-[10px] text-gray-500 uppercase">Fundo Inicial</span>
                <p className="font-bold font-mono text-gray-900">
                  {formatCurrency(caixaAberto?.saldo_inicial || 0)}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-blue-600 uppercase font-bold">Vendas do Dia</span>
                <p className="font-bold font-mono text-blue-900">
                  {formatCurrency(totalRecebidoCaixa)}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-emerald-700 uppercase font-bold">
                  Lucro Estimado
                </span>
                <p className="font-bold font-mono text-emerald-700">
                  {formatCurrency(lucroCaixaAberto)}
                </p>
              </div>
            </div>

            {/* Contadores Finais para Apuração dos Deltas */}
            {caixaAberto?.expand?.equipamento_id && (
              <div className="p-3 bg-red-50/60 rounded-xl border border-red-200 space-y-2">
                <span className="font-bold text-red-900 block">
                  Contadores Finais do Equipamento em Operação:{' '}
                  {caixaAberto.expand.equipamento_id.marca}{' '}
                  {caixaAberto.expand.equipamento_id.modelo}
                </span>
                <p className="text-[11px] text-red-700">
                  Atenção: Ao concluir o fechamento, estes contadores serão gravados de forma
                  permanente e <strong>imutável</strong>.
                </p>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <Label className="text-[10.5px] font-semibold text-gray-700">
                      Fechamento Mono (Abertura: {caixaAberto.contador_abertura_mono || 0}) *
                    </Label>
                    <Input
                      type="number"
                      min={caixaAberto.contador_abertura_mono || 0}
                      value={contadorFechamentoMono}
                      onChange={(e) => setContadorFechamentoMono(parseInt(e.target.value) || 0)}
                      required
                      className="h-8 text-xs font-mono bg-white font-bold"
                    />
                    <span className="text-[10px] text-emerald-700 font-medium">
                      Produção Mono: +
                      {Math.max(
                        0,
                        contadorFechamentoMono - (caixaAberto.contador_abertura_mono || 0),
                      )}{' '}
                      págs
                    </span>
                  </div>
                  <div>
                    <Label className="text-[10.5px] font-semibold text-gray-700">
                      Fechamento Color (Abertura: {caixaAberto.contador_abertura_color || 0}) *
                    </Label>
                    <Input
                      type="number"
                      min={caixaAberto.contador_abertura_color || 0}
                      value={contadorFechamentoColor}
                      onChange={(e) => setContadorFechamentoColor(parseInt(e.target.value) || 0)}
                      required
                      className="h-8 text-xs font-mono bg-white font-bold"
                    />
                    <span className="text-[10px] text-emerald-700 font-medium">
                      Produção Color: +
                      {Math.max(
                        0,
                        contadorFechamentoColor - (caixaAberto.contador_abertura_color || 0),
                      )}{' '}
                      págs
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2 pt-2 border-t">
              <Label className="font-semibold text-gray-900 block">
                Contadores Finais das Impressoras (Ao Encerrar o Caixa):
              </Label>
              <p className="text-[11px] text-gray-500">
                Informe as leituras finais dos medidores. O sistema calculará as páginas impressas,
                cópias e scanners realizados.
              </p>

              <div className="space-y-3">
                {contadoresCaixaAberto.map((cnt) => {
                  const eq =
                    cnt.expand?.equipamento_id ||
                    equipamentos.find((e) => e.id === cnt.equipamento_id)
                  const fCnt = contadoresFechamento[cnt.equipamento_id] || {
                    mono: cnt.abertura_mono || 0,
                    color: cnt.abertura_color || 0,
                    copias: cnt.abertura_copias || 0,
                    scanner: cnt.abertura_scanner || 0,
                    total: cnt.abertura_total || 0,
                  }
                  const deltaMono = Math.max(0, fCnt.mono - (cnt.abertura_mono || 0))
                  const deltaColor = Math.max(0, fCnt.color - (cnt.abertura_color || 0))

                  return (
                    <div key={cnt.id} className="p-3 rounded-lg border bg-gray-50/70 space-y-2">
                      <div className="font-bold text-gray-900 flex items-center justify-between">
                        <span>{eq ? `${eq.marca} ${eq.modelo}` : 'Impressora'}</span>
                        <span className="text-[11px] font-mono text-emerald-700 font-bold">
                          Produção do dia: +{deltaMono} mono | +{deltaColor} color
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div>
                          <Label className="text-[10.5px] text-gray-600">
                            Final Mono (Inic: {cnt.abertura_mono})
                          </Label>
                          <Input
                            type="number"
                            min={cnt.abertura_mono || 0}
                            value={fCnt.mono}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || cnt.abertura_mono || 0
                              setContadoresFechamento((prev) => ({
                                ...prev,
                                [cnt.equipamento_id]: {
                                  ...fCnt,
                                  mono: val,
                                  total: val + fCnt.color,
                                },
                              }))
                            }}
                            className="h-7 text-xs font-mono"
                          />
                        </div>

                        <div>
                          <Label className="text-[10.5px] text-gray-600">
                            Final Color (Inic: {cnt.abertura_color})
                          </Label>
                          <Input
                            type="number"
                            min={cnt.abertura_color || 0}
                            value={fCnt.color}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || cnt.abertura_color || 0
                              setContadoresFechamento((prev) => ({
                                ...prev,
                                [cnt.equipamento_id]: {
                                  ...fCnt,
                                  color: val,
                                  total: fCnt.mono + val,
                                },
                              }))
                            }}
                            className="h-7 text-xs font-mono"
                          />
                        </div>

                        <div>
                          <Label className="text-[10.5px] text-gray-600">
                            Final Cópias (Inic: {cnt.abertura_copias})
                          </Label>
                          <Input
                            type="number"
                            min={cnt.abertura_copias || 0}
                            value={fCnt.copias}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || cnt.abertura_copias || 0
                              setContadoresFechamento((prev) => ({
                                ...prev,
                                [cnt.equipamento_id]: { ...fCnt, copias: val },
                              }))
                            }}
                            className="h-7 text-xs font-mono"
                          />
                        </div>

                        <div>
                          <Label className="text-[10.5px] text-gray-600">
                            Final Scanner (Inic: {cnt.abertura_scanner})
                          </Label>
                          <Input
                            type="number"
                            min={cnt.abertura_scanner || 0}
                            value={fCnt.scanner}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || cnt.abertura_scanner || 0
                              setContadoresFechamento((prev) => ({
                                ...prev,
                                [cnt.equipamento_id]: { ...fCnt, scanner: val },
                              }))
                            }}
                            className="h-7 text-xs font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="saldo-gaveta">Conferência Física do Dinheiro em Gaveta (R$) *</Label>
              <Input
                id="saldo-gaveta"
                type="number"
                step="0.01"
                min="0"
                value={saldoFinalDinheiro}
                onChange={(e) => setSaldoFinalDinheiro(parseFloat(e.target.value) || 0)}
                required
                className="font-mono text-sm font-bold text-gray-900"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="obs-fc">Observações de Fechamento (Opcional)</Label>
              <Textarea
                id="obs-fc"
                rows={2}
                placeholder="Ex: Diferença de centavos, sangria realizada..."
                value={obsFechamento}
                onChange={(e) => setObsFechamento(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalFecharCaixaOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white">
                Concluir Fechamento do Caixa
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 3: Lançamento de Venda / Serviço com Baixa Automática */}
      <Dialog open={isModalNovaVendaOpen} onOpenChange={setIsModalNovaVendaOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-600">
              <ShoppingCart className="w-5 h-5" /> Registrar Serviço / Venda de Insumos
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleConfirmarVenda} className="space-y-3.5 pt-1 text-xs">
            <div className="space-y-1">
              <Label htmlFor="sel-prod">Selecionar Produto / Insumo Cadastrado</Label>
              <Select value={vendaProdutoId} onValueChange={handleSelecionarProdutoVenda}>
                <SelectTrigger id="sel-prod">
                  <SelectValue placeholder="Escolha um serviço/produto ou digite livremente..." />
                </SelectTrigger>
                <SelectContent>
                  {produtos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome} — {formatCurrency(p.preco_venda)} (Estoque: {p.estoque_atual || 0})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="venda-desc">Descrição do Serviço / Insumo *</Label>
              <Input
                id="venda-desc"
                placeholder="Ex: Cópia A4 comum mono, Impressão Couchê 150g..."
                value={vendaDescricao}
                onChange={(e) => setVendaDescricao(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label htmlFor="venda-qtd">Quantidade *</Label>
                <Input
                  id="venda-qtd"
                  type="number"
                  min="1"
                  value={vendaQuantidade}
                  onChange={(e) => setVendaQuantidade(Math.max(1, parseInt(e.target.value) || 1))}
                  required
                  className="font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="venda-prc">Preço Un. (R$) *</Label>
                <Input
                  id="venda-prc"
                  type="number"
                  step="0.01"
                  min="0"
                  value={vendaPrecoUnit}
                  onChange={(e) => setVendaPrecoUnit(parseFloat(e.target.value) || 0)}
                  required
                  className="font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="venda-cst">Custo Un. (R$)</Label>
                <Input
                  id="venda-cst"
                  type="number"
                  step="0.01"
                  min="0"
                  value={vendaCustoUnit}
                  onChange={(e) => setVendaCustoUnit(parseFloat(e.target.value) || 0)}
                  className="font-mono text-gray-600"
                />
              </div>
            </div>

            {/* Total e Lucro Calculados */}
            <div className="p-2.5 rounded-lg bg-gray-50 border grid grid-cols-2 text-center">
              <div>
                <span className="text-[10px] text-gray-500 uppercase">Total a Cobrar</span>
                <p className="font-bold text-sm text-blue-900 font-mono">
                  {formatCurrency(vendaQuantidade * vendaPrecoUnit)}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-emerald-700 uppercase font-bold">
                  Lucro Estimado
                </span>
                <p className="font-bold text-sm text-emerald-700 font-mono">
                  {formatCurrency(vendaQuantidade * (vendaPrecoUnit - vendaCustoUnit))}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="venda-pgto">Forma de Pagamento</Label>
                <Select
                  value={vendaFormaPagamento}
                  onValueChange={(val: any) => setVendaFormaPagamento(val)}
                >
                  <SelectTrigger id="venda-pgto">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dinheiro">Dinheiro em Espécie</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                    <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                    <SelectItem value="a_prazo">A Prazo / Faturado</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="venda-cli">Cliente (Opcional)</Label>
                <Input
                  id="venda-cli"
                  placeholder="Nome do cliente balcão"
                  value={vendaClienteNome}
                  onChange={(e) => setVendaClienteNome(e.target.value)}
                />
              </div>
            </div>

            <div className="p-2 rounded bg-blue-50/50 text-[11px] text-blue-900 leading-tight">
              ℹ️ O sistema <strong>diminui automaticamente a quantidade do insumo</strong>{' '}
              correspondente do estoque de mídias/suprimentos.
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalNovaVendaOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingVenda}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSubmittingVenda ? 'Gravando e Baixando...' : 'Confirmar Venda'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 4: Cadastro de Produto / Tipo de Papel / Adesivo */}
      <Dialog open={isModalNovoProdutoOpen} onOpenChange={setIsModalNovoProdutoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" /> Cadastrar Produto / Insumo da Gráfica
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCadastrarProduto} className="space-y-3 pt-1 text-xs">
            <div className="space-y-1">
              <Label htmlFor="prod-nome">Nome do Produto / Papel *</Label>
              <Input
                id="prod-nome"
                placeholder="Ex: Papel Sulfite A4 75g / Adesivo Couchê A3"
                value={prodForm.nome}
                onChange={(e) => setProdForm({ ...prodForm, nome: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="prod-cat">Categoria *</Label>
                <Select
                  value={prodForm.categoria}
                  onValueChange={(val: any) => setProdForm({ ...prodForm, categoria: val })}
                >
                  <SelectTrigger id="prod-cat">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="papel_sulfite">Papel Sulfite</SelectItem>
                    <SelectItem value="papel_couche">Papel Couchê</SelectItem>
                    <SelectItem value="adesivo">Papel Adesivo / Vinil</SelectItem>
                    <SelectItem value="copia">Serviço de Cópia</SelectItem>
                    <SelectItem value="impressao">Impressão Color/Mono</SelectItem>
                    <SelectItem value="scanner">Digitalização / Scanner</SelectItem>
                    <SelectItem value="plastificacao">Plastificação</SelectItem>
                    <SelectItem value="encadernacao">Encadernação</SelectItem>
                    <SelectItem value="outro">Outro Insumo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="prod-fmt">Formato / Tamanho</Label>
                <Input
                  id="prod-fmt"
                  placeholder="A4, A3, Carta, Rolo..."
                  value={prodForm.formato_tamanho}
                  onChange={(e) => setProdForm({ ...prodForm, formato_tamanho: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="prod-gram">Gramatura</Label>
                <Input
                  id="prod-gram"
                  placeholder="Ex: 75g, 150g, 250g..."
                  value={prodForm.gramatura}
                  onChange={(e) => setProdForm({ ...prodForm, gramatura: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="prod-un">Unidade de Medida</Label>
                <Select
                  value={prodForm.unidade_medida}
                  onValueChange={(val: any) => setProdForm({ ...prodForm, unidade_medida: val })}
                >
                  <SelectTrigger id="prod-un">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="folha">Folha</SelectItem>
                    <SelectItem value="unidade">Unidade</SelectItem>
                    <SelectItem value="resma">Resma</SelectItem>
                    <SelectItem value="metro">Metro</SelectItem>
                    <SelectItem value="cento">Cento</SelectItem>
                    <SelectItem value="milheiro">Milheiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="prod-custo">Custo Unitário (R$) *</Label>
                <Input
                  id="prod-custo"
                  type="number"
                  step="0.01"
                  min="0"
                  value={prodForm.custo_unitario}
                  onChange={(e) =>
                    setProdForm({ ...prodForm, custo_unitario: parseFloat(e.target.value) || 0 })
                  }
                  required
                  className="font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="prod-venda">Preço de Venda (R$) *</Label>
                <Input
                  id="prod-venda"
                  type="number"
                  step="0.01"
                  min="0"
                  value={prodForm.preco_venda}
                  onChange={(e) =>
                    setProdForm({ ...prodForm, preco_venda: parseFloat(e.target.value) || 0 })
                  }
                  required
                  className="font-mono text-emerald-700 font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="prod-est">Estoque Inicial</Label>
                <Input
                  id="prod-est"
                  type="number"
                  min="0"
                  value={prodForm.estoque_atual}
                  onChange={(e) =>
                    setProdForm({ ...prodForm, estoque_atual: parseInt(e.target.value) || 0 })
                  }
                  className="font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="prod-min">Estoque Mínimo (Alerta)</Label>
                <Input
                  id="prod-min"
                  type="number"
                  min="0"
                  value={prodForm.estoque_minimo}
                  onChange={(e) =>
                    setProdForm({ ...prodForm, estoque_minimo: parseInt(e.target.value) || 0 })
                  }
                  className="font-mono"
                />
              </div>
            </div>

            {/* Vínculo opcional com estoque central de suprimentos */}
            <div className="space-y-1 pt-1">
              <Label htmlFor="prod-sup">Vincular a Insumo Central de Suprimentos (Opcional)</Label>
              <Select
                value={prodForm.suprimento_insumo_id}
                onValueChange={(val) =>
                  setProdForm({ ...prodForm, suprimento_insumo_id: val === 'nenhum' ? '' : val })
                }
              >
                <SelectTrigger id="prod-sup">
                  <SelectValue placeholder="Nenhum vínculo direto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhum">Nenhum (Controlado individualmente)</SelectItem>
                  {suprimentos.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.item} (Estoque central: {s.quantidade})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalNovoProdutoOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                Salvar Produto
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 5: Impressão do Cupom/Ficha do Caixa */}
      <CaixaPrintDialog
        open={isModalImprimirCaixaOpen}
        onOpenChange={setIsModalImprimirCaixaOpen}
        caixa={caixaParaImprimir}
        contadores={contadoresImpressao}
        vendas={vendasImpressao}
        configEmpresa={configEmpresa}
      />
    </div>
  )
}
