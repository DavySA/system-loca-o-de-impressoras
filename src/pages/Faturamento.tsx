import React, { useState, useEffect, useMemo } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import {
  Receipt,
  Plus,
  DollarSign,
  FileSpreadsheet,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Printer,
  Calendar,
  AlertCircle,
  Calculator,
  Layers,
  Sparkles,
  CheckCircle2,
  Users,
} from 'lucide-react'
import { faturasService } from '@/services/faturas'
import { clientesService } from '@/services/clientes'
import { contratosService } from '@/services/contratos'
import { formatCurrency, formatMonthYear, formatDate, formatDateTime } from '@/lib/formatters'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'
import { configuracoesService } from '@/services/configuracoes'
import { equipamentosService } from '@/services/equipamentos'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
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
import { coraService } from '@/services/cora'
import type {
  Fatura,
  Cliente,
  Contrato,
  ConfiguracoesEmpresa,
  Equipamento,
  IntegracaoCoraConfig,
  CobrancaBoleto,
} from '@/types'
import { Mail, Send, CreditCard } from 'lucide-react'

export default function Faturamento() {
  const { user } = useAuth()
  const { toast } = useToast()
  const location = useLocation()

  const isClienteUser = user?.role === 'cliente'
  const isOperador = user?.role === 'operador'
  const isAdmin = user?.role === 'administrador'
  const clienteIdVinculado = user?.cliente_id

  const [faturas, setFaturas] = useState<Fatura[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([])
  const [configEmpresa, setConfigEmpresa] = useState<ConfiguracoesEmpresa | null>(null)
  const [coraConfig, setCoraConfig] = useState<IntegracaoCoraConfig | null>(null)
  const [cobrancasFatura, setCobrancasFatura] = useState<CobrancaBoleto[]>([])
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [isGerandoBoleto, setIsGerandoBoleto] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // KPIs
  const [kpiFaturamentoMes, setKpiFaturamentoMes] = useState(0)
  const [kpiPaginasExcedentes, setKpiPaginasExcedentes] = useState(0)
  const [kpiFaturasPendentes, setKpiFaturasPendentes] = useState(0)

  // Modal Gerar Fatura com Leitura de Contadores e Subtração Automática
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedClienteId, setSelectedClienteId] = useState('')
  const [clienteContratos, setClienteContratos] = useState<Contrato[]>([])
  const [selectedContratoId, setSelectedContratoId] = useState('')
  const [mesReferencia, setMesReferencia] = useState('')

  // Modal Faturamento em Lote
  const [isModalLoteOpen, setIsModalLoteOpen] = useState(false)
  const [mesReferenciaLote, setMesReferenciaLote] = useState('')
  const [isExecutandoLote, setIsExecutandoLote] = useState(false)
  const [resultadoLote, setResultadoLote] = useState<{
    geradas: number
    puladas: number
    detalhes: {
      clienteNome: string
      status: 'gerada' | 'ja_existe' | 'sem_contrato'
      valor?: number
    }[]
  } | null>(null)

  // Leituras por equipamento
  const [leituraAnteriorMono, setLeituraAnteriorMono] = useState(0)
  const [leituraAtualMono, setLeituraAtualMono] = useState(0)
  const [leituraAnteriorColor, setLeituraAnteriorColor] = useState(0)
  const [leituraAtualColor, setLeituraAtualColor] = useState(0)
  const [descontoEquipamento, setDescontoEquipamento] = useState(0)
  const [acrescimoServicos, setAcrescimoServicos] = useState(0)
  const [observacoesFatura, setObservacoesFatura] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Modal Detalhes / Impressão
  const [selectedFatura, setSelectedFatura] = useState<Fatura | null>(null)
  const [isDetalhesOpen, setIsDetalhesOpen] = useState(false)
  const loadData = async () => {
    try {
      setIsLoading(true)
      let fatFilter = ''
      if (isClienteUser && clienteIdVinculado) {
        fatFilter = `cliente_id = "${clienteIdVinculado}"`
      }

      const [fatList, clList, contList, eqList, cfg, cora] = await Promise.all([
        faturasService.getAll(fatFilter),
        clientesService.getAll('status = "ativo"'),
        contratosService.getAll('status = "ativo"'),
        equipamentosService.getAll(),
        configuracoesService.get(),
        coraService.getConfig(),
      ])
      setFaturas(fatList)
      setClientes(clList)
      setContratos(contList)
      setEquipamentos(eqList)
      setConfigEmpresa(cfg)
      setCoraConfig(cora)

      // Calcular KPIs
      const now = new Date()
      const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

      // Faturamento do mês
      const currentMonthFats = fatList.filter(
        (f) => f.mes_referencia === currentMonthStr && f.status !== 'cancelada',
      )
      const sumMonth = currentMonthFats.reduce((acc, f) => acc + (f.valor_total || 0), 0)
      setKpiFaturamentoMes(sumMonth)

      // Páginas excedentes no mês
      const sumExcedentes = currentMonthFats.reduce(
        (acc, f) => acc + (f.paginas_excedentes || 0),
        0,
      )
      setKpiPaginasExcedentes(sumExcedentes)

      // Faturas pendentes de pagamento (status = gerada ou vencida)
      const pendentes = fatList.filter((f) => f.status === 'gerada' || f.status === 'vencida')
      const sumPendentes = pendentes.reduce((acc, f) => acc + (f.valor_total || 0), 0)
      setKpiFaturasPendentes(sumPendentes)

      // Checar se veio com cliente pré-selecionado de outra rota
      const state = location.state as { preselectClienteId?: string } | null
      if (state?.preselectClienteId) {
        handleOpenCreate(state.preselectClienteId)
      }
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar dados de faturamento',
        description: 'Não foi possível carregar a listagem.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('faturas', () => loadData())
  useRealtime('contratos', () => loadData())

  const handleOpenCreate = (preClienteId?: string) => {
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    setMesReferencia(currentMonth)

    const targetClientId = preClienteId || clientes[0]?.id || ''
    setSelectedClienteId(targetClientId)

    const conts = contratos.filter((c) => c.cliente_id === targetClientId)
    setClienteContratos(conts)
    if (conts.length > 0) {
      handleSelectContrato(conts[0], conts)
    } else {
      setSelectedContratoId('')
      resetLeituras()
    }

    setIsModalOpen(true)
  }

  // Abertura do Modal de Lote
  const handleOpenLote = () => {
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    setMesReferenciaLote(currentMonth)
    setResultadoLote(null)
    setIsModalLoteOpen(true)
  }

  // Clientes elegíveis para o faturamento em lote no período selecionado
  const clientesAtivosComContrato = useMemo(() => {
    return clientes.filter((c) => {
      if (c.status !== 'ativo') return false
      const temContrato = contratos.some((ct) => ct.cliente_id === c.id && ct.status === 'ativo')
      return temContrato
    })
  }, [clientes, contratos])

  const analiseLote = useMemo(() => {
    if (!mesReferenciaLote) {
      return { aGerar: [], jaFaturados: [], semContrato: [] }
    }

    const aGerar: { cliente: Cliente; contratos: Contrato[] }[] = []
    const jaFaturados: { cliente: Cliente; fatura: Fatura }[] = []
    const semContrato: Cliente[] = []

    clientes.forEach((cli) => {
      if (cli.status !== 'ativo') return
      const cliConts = contratos.filter((ct) => ct.cliente_id === cli.id && ct.status === 'ativo')
      if (cliConts.length === 0) {
        semContrato.push(cli)
        return
      }

      // Checar se já possui fatura para esse mês
      const fatExistente = faturas.find(
        (f) =>
          f.cliente_id === cli.id &&
          f.mes_referencia === mesReferenciaLote &&
          f.status !== 'cancelada',
      )

      if (fatExistente) {
        jaFaturados.push({ cliente: cli, fatura: fatExistente })
      } else {
        aGerar.push({ cliente: cli, contratos: cliConts })
      }
    })

    return { aGerar, jaFaturados, semContrato }
  }, [clientes, contratos, faturas, mesReferenciaLote])

  const handleExecutarFaturamentoLote = async () => {
    if (!mesReferenciaLote) return
    setIsExecutandoLote(true)

    const detalhes: {
      clienteNome: string
      status: 'gerada' | 'ja_existe' | 'sem_contrato'
      valor?: number
    }[] = []
    let geradasCount = 0
    let puladasCount = 0

    try {
      // 1. Processar cada cliente elegível
      for (const item of analiseLote.aGerar) {
        const cli = item.cliente
        const conts = item.contratos

        // Para cada contrato do cliente, gerar fatura (se houver mais de um ou o principal)
        for (const ct of conts) {
          const eq = equipamentos.find((e) => e.id === ct.equipamento_id)
          const monoAnterior = eq?.contador_monocromatico || 0
          const colorAnterior = eq?.contador_colorido || 0

          const isApenasExcedentes = ct.modalidade === 'apenas_excedentes'
          const paginasContratadas = isApenasExcedentes ? 0 : ct.paginas_contratadas_mensais || 0
          const valorBaseAluguel = ct.valor_mensal || 0
          const valorScanner = ct.valor_scanner || 0
          const valorTotal = valorBaseAluguel + valorScanner

          await faturasService.create({
            cliente_id: cli.id,
            contrato_id: ct.id,
            mes_referencia: mesReferenciaLote,
            paginas_contratadas: paginasContratadas,
            paginas_consumidas: paginasContratadas, // franquia contratada base inicial
            paginas_excedentes: 0,
            valor_base: valorTotal,
            valor_excedente: 0,
            valor_total: valorTotal,
            leitura_anterior_mono: monoAnterior,
            leitura_atual_mono: monoAnterior + paginasContratadas,
            leitura_anterior_color: colorAnterior,
            leitura_atual_color: colorAnterior,
            desconto: 0,
            acrescimo_servicos: 0,
            criado_por_user_id: user?.id,
            observacoes: `Fatura gerada automaticamente em lote no ciclo recorrente do mês ${formatMonthYear(mesReferenciaLote)}.`,
            status: 'gerada',
          })

          geradasCount++
          detalhes.push({
            clienteNome: cli.nome_razao_social,
            status: 'gerada',
            valor: valorTotal,
          })
        }
      }

      // Adicionar os que já existiam
      analiseLote.jaFaturados.forEach((j) => {
        puladasCount++
        detalhes.push({
          clienteNome: j.cliente.nome_razao_social,
          status: 'ja_existe',
          valor: j.fatura.valor_total,
        })
      })

      // Adicionar sem contrato
      analiseLote.semContrato.forEach((sc) => {
        puladasCount++
        detalhes.push({
          clienteNome: sc.nome_razao_social,
          status: 'sem_contrato',
        })
      })

      setResultadoLote({
        geradas: geradasCount,
        puladas: puladasCount,
        detalhes,
      })

      toast({
        title: 'Faturamento em lote concluído!',
        description: `${geradasCount} fatura(s) gerada(s) com sucesso. ${puladasCount} pulada(s).`,
      })

      await loadData()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro no faturamento em lote',
        description: err.message || 'Ocorreu uma falha durante o processamento.',
      })
    } finally {
      setIsExecutandoLote(false)
    }
  }

  const resetLeituras = () => {
    setLeituraAnteriorMono(0)
    setLeituraAtualMono(0)
    setLeituraAnteriorColor(0)
    setLeituraAtualColor(0)
    setDescontoEquipamento(0)
    setAcrescimoServicos(0)
    setObservacoesFatura('')
  }

  const handleSelectContrato = (ct: Contrato, currentConts?: Contrato[]) => {
    setSelectedContratoId(ct.id)
    // Obter equipamento vinculado para pegar os contadores anteriores
    const eq = equipamentos.find((e) => e.id === ct.equipamento_id) || ct.expand?.equipamento_id
    const prevMono = eq?.contador_monocromatico || 0
    const prevColor = eq?.contador_colorido || 0

    setLeituraAnteriorMono(prevMono)
    setLeituraAtualMono(prevMono + (ct.paginas_contratadas_mensais || 0))
    setLeituraAnteriorColor(prevColor)
    setLeituraAtualColor(prevColor)
    setDescontoEquipamento(0)
    setAcrescimoServicos(0)
  }

  // Quando o cliente selecionado muda
  const handleClienteChange = (cId: string) => {
    setSelectedClienteId(cId)
    const conts = contratos.filter((c) => c.cliente_id === cId)
    setClienteContratos(conts)
    if (conts.length > 0) {
      handleSelectContrato(conts[0], conts)
    } else {
      setSelectedContratoId('')
      resetLeituras()
    }
  }

  // Contrato atualmente selecionado no modal
  const activeContrato = clienteContratos.find((c) => c.id === selectedContratoId)
  const activeEquipamento =
    equipamentos.find((e) => e.id === activeContrato?.equipamento_id) ||
    activeContrato?.expand?.equipamento_id

  // Subtração automática do atual pelo anterior:
  const consumoMono = Math.max(0, leituraAtualMono - leituraAnteriorMono)
  const consumoColor = Math.max(0, leituraAtualColor - leituraAnteriorColor)
  const paginasConsumidas = consumoMono + consumoColor

  // Cálculos ao vivo da fatura
  const isApenasExcedentes = activeContrato?.modalidade === 'apenas_excedentes'
  const paginasContratadas = isApenasExcedentes
    ? 0
    : activeContrato?.paginas_contratadas_mensais || 0
  const valorBaseAluguel = activeContrato?.valor_mensal || 0
  const valorPorPaginaExcedente = activeContrato?.valor_pagina_excedente || 0

  const paginasExcedentesCalculadas = isApenasExcedentes
    ? paginasConsumidas
    : Math.max(0, paginasConsumidas - paginasContratadas)

  const valorExcedenteCalculado = paginasExcedentesCalculadas * valorPorPaginaExcedente
  const valorScanner = activeContrato?.valor_scanner || 0

  // Total geral a pagar com desconto e acréscimos por equipamento
  const subtotal =
    valorBaseAluguel + valorExcedenteCalculado + valorScanner + Number(acrescimoServicos)
  const valorTotalCalculado = Math.max(0, subtotal - Number(descontoEquipamento))

  const handleGerarFatura = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClienteId || !selectedContratoId) {
      toast({
        variant: 'destructive',
        title: 'Contrato não selecionado',
        description: 'Selecione um cliente e um contrato ativo para gerar a fatura.',
      })
      return
    }

    setIsSubmitting(true)
    try {
      await faturasService.create({
        cliente_id: selectedClienteId,
        contrato_id: selectedContratoId,
        mes_referencia: mesReferencia,
        paginas_contratadas: paginasContratadas,
        paginas_consumidas: Number(paginasConsumidas),
        paginas_excedentes: paginasExcedentesCalculadas,
        valor_base: valorBaseAluguel + valorScanner,
        valor_excedente: valorExcedenteCalculado,
        valor_total: valorTotalCalculado,
        leitura_anterior_mono: Number(leituraAnteriorMono),
        leitura_atual_mono: Number(leituraAtualMono),
        leitura_anterior_color: Number(leituraAnteriorColor),
        leitura_atual_color: Number(leituraAtualColor),
        desconto: Number(descontoEquipamento),
        acrescimo_servicos: Number(acrescimoServicos),
        criado_por_user_id: user?.id,
        observacoes: observacoesFatura,
        status: 'gerada',
      })

      // Atualizar contador do equipamento para as leituras mais recentes
      if (activeEquipamento) {
        try {
          await equipamentosService.update(activeEquipamento.id, {
            contador_monocromatico: Number(leituraAtualMono),
            contador_colorido: Number(leituraAtualColor),
          })
        } catch (e) {
          console.warn('Erro ao atualizar contador no equipamento:', e)
        }
      }

      toast({
        title: 'Fatura gerada com sucesso!',
        description: `Fatura de ${formatCurrency(valorTotalCalculado)} gerada e contador do equipamento atualizado.`,
      })
      setIsModalOpen(false)
      loadData()
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao gerar fatura',
        description: 'Não foi possível gravar o faturamento.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMarcarPaga = async (f: Fatura, e?: React.MouseEvent) => {
    e?.stopPropagation()
    try {
      await faturasService.marcarComoPaga(f.id)
      toast({
        title: 'Fatura quitada!',
        description: 'Status atualizado para "Paga".',
      })
      loadData()
      if (selectedFatura && selectedFatura.id === f.id) {
        setSelectedFatura({ ...selectedFatura, status: 'paga' })
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar fatura',
      })
    }
  }

  const handleCancelar = async (f: Fatura, e?: React.MouseEvent) => {
    e?.stopPropagation()
    try {
      await faturasService.cancelarFatura(f.id)
      toast({
        title: 'Fatura cancelada',
        description: 'Status alterado para "Cancelada".',
      })
      loadData()
      if (selectedFatura && selectedFatura.id === f.id) {
        setSelectedFatura({ ...selectedFatura, status: 'cancelada' })
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Erro ao cancelar fatura',
      })
    }
  }

  const handleOpenVisualizar = async (f: Fatura) => {
    setSelectedFatura(f)
    setIsDetalhesOpen(true)
    try {
      const cobs = await coraService.getCobrancasPorFatura(f.id)
      setCobrancasFatura(cobs)
    } catch {
      setCobrancasFatura([])
    }
  }

  // Disparar envio de fatura por e-mail para o cliente
  const handleEnviarEmailFatura = async (f: Fatura) => {
    const emailDestino = f.expand?.cliente_id?.email
    if (!emailDestino) {
      toast({
        variant: 'destructive',
        title: 'Cliente sem e-mail',
        description: 'Cadastre o e-mail do cliente para realizar o disparo da fatura.',
      })
      return
    }

    setIsSendingEmail(true)
    try {
      const res = await coraService.enviarFaturaEmail(f.id, emailDestino)
      toast({
        title: 'Fatura enviada com sucesso!',
        description: `Disparada para ${res.destinatario || emailDestino}.`,
      })
      // Atualizar localmente a fatura selecionada e a listagem
      const agora = new Date().toISOString()
      const updatedFat = { ...f, enviada_email_em: agora, enviada_email_para: emailDestino }
      setSelectedFatura(updatedFat)
      setFaturas((prev) => prev.map((item) => (item.id === f.id ? updatedFat : item)))
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Falha no envio de e-mail',
        description: err.message || 'Verifique as configurações de SMTP do servidor.',
      })
    } finally {
      setIsSendingEmail(false)
    }
  }

  // Gerar boleto estruturado Cora
  const handleGerarBoletoCora = async (f: Fatura) => {
    if (!coraConfig?.ativo || !coraConfig?.client_id) {
      toast({
        variant: 'destructive',
        title: 'Integração Cora não configurada',
        description:
          'Acesse o menu "Personalizar > Integração Cora" e informe as credenciais de API para habilitar a emissão.',
      })
      return
    }

    setIsGerandoBoleto(true)
    try {
      const novaCobranca = await coraService.registrarCobranca({
        fatura_id: f.id,
        valor: f.valor_total,
        data_vencimento: f.data_vencimento,
        status: 'pendente',
        criado_por_user_id: user?.id,
      })
      setCobrancasFatura((prev) => [novaCobranca, ...prev])
      toast({
        title: 'Boleto registrado com sucesso!',
        description:
          'A cobrança foi criada no ERP e sincronizará com a Cora assim que a chave de produção estiver validada.',
      })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao gerar cobrança',
        description: err.message || 'Não foi possível registrar o boleto.',
      })
    } finally {
      setIsGerandoBoleto(false)
    }
  }

  const handlePrint = () => {
    if (!selectedFatura) return

    const contrato = selectedFatura.expand?.contrato_id
    const equipDoContrato = contrato?.equipamento_id
      ? equipamentos.find((e) => e.id === contrato.equipamento_id)
      : null

    const diffMono =
      (selectedFatura.leitura_atual_mono ?? 0) - (selectedFatura.leitura_anterior_mono ?? 0)
    const diffColor =
      (selectedFatura.leitura_atual_color ?? 0) - (selectedFatura.leitura_anterior_color ?? 0)

    const pMono = diffMono > 0 ? diffMono : 0
    const pColor = diffColor > 0 ? diffColor : 0
    const pTotal = pMono + pColor > 0 ? pMono + pColor : selectedFatura.paginas_consumidas

    const printWin = window.open('', '_blank', 'width=900,height=750')
    if (!printWin) {
      window.print()
      return
    }

    const logoUrl = configEmpresa?.logo ? configuracoesService.getLogoUrl(configEmpresa) : ''

    printWin.document.open()
    printWin.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <title>Fatura ${selectedFatura.id.slice(0, 8).toUpperCase()} - STD</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @page { size: A4; margin: 15mm; }
            body { font-family: sans-serif; color: #111827; background: #fff; }
          </style>
        </head>
        <body class="p-6 bg-white">
          <div class="max-w-4xl mx-auto space-y-6 text-xs">
            <!-- Cabeçalho -->
            <div class="flex items-start justify-between border-b-2 border-gray-900 pb-4">
              <div class="flex items-center gap-4">
                ${logoUrl ? `<img src="${logoUrl}" class="h-14 max-w-[150px] object-contain" />` : ''}
                <div>
                  <h1 class="text-base font-bold uppercase text-gray-900">${configEmpresa?.razao_social || 'TD Technology System Soluções LTDA'}</h1>
                  ${configEmpresa?.nome_fantasia ? `<p class="text-xs text-gray-600">${configEmpresa.nome_fantasia}</p>` : ''}
                  <p class="text-[11px] text-gray-500">CNPJ: ${configEmpresa?.cnpj || '-'} • Tel: ${configEmpresa?.telefone || '-'}</p>
                  <p class="text-[11px] text-gray-500">${configEmpresa?.endereco || ''} ${configEmpresa?.cidade ? `• ${configEmpresa.cidade}/${configEmpresa.uf}` : ''}</p>
                </div>
              </div>
              <div class="text-right">
                <div class="border-2 border-gray-900 px-3 py-1.5 rounded text-center">
                  <span class="block text-[10px] uppercase font-bold text-gray-600">Fatura de Locação</span>
                  <span class="text-base font-mono font-bold text-gray-900">#${selectedFatura.id.slice(0, 8).toUpperCase()}</span>
                </div>
                <p class="text-[11px] text-gray-500 mt-1">Mês Ref: <strong>${formatMonthYear(selectedFatura.mes_referencia)}</strong></p>
                <p class="text-[10px] uppercase font-bold text-blue-800">Status: ${selectedFatura.status}</p>
              </div>
            </div>

            <!-- Dados Cliente -->
            <div class="p-3 rounded-lg bg-gray-50 border border-gray-200">
              <span class="text-gray-500 font-bold uppercase text-[10px] block">Dados do Cliente Sacado</span>
              <p class="text-sm font-bold text-gray-900 mt-0.5">${selectedFatura.expand?.cliente_id?.nome_razao_social || 'Cliente'}</p>
              <div class="grid grid-cols-2 gap-2 text-gray-600 mt-1">
                <p>CNPJ / CPF: ${selectedFatura.expand?.cliente_id?.documento || '-'}</p>
                <p>E-mail: ${selectedFatura.expand?.cliente_id?.email || '-'}</p>
                <p>Endereço: ${selectedFatura.expand?.cliente_id?.endereco || '-'} ${selectedFatura.expand?.cliente_id?.cidade ? ` - ${selectedFatura.expand?.cliente_id?.cidade}/${selectedFatura.expand?.cliente_id?.uf}` : ''}</p>
                <p>Data de Emissão: ${formatDate(selectedFatura.created)}</p>
              </div>
            </div>

            <!-- Resumo dos Equipamentos e Leituras Antes do Bloco Financeiro -->
            <div class="border border-blue-300 rounded-lg overflow-hidden bg-blue-50/20">
              <div class="bg-blue-100/60 px-3 py-2 border-b border-blue-200 flex justify-between items-center">
                <span class="text-xs font-bold text-blue-950 uppercase">Resumo dos Equipamentos Instalados & Contadores</span>
                <span class="text-[10px] text-blue-800 font-semibold">Apuração Operacional do Período</span>
              </div>
              <div class="p-3">
                <table class="w-full text-left text-xs">
                  <thead>
                    <tr class="text-gray-600 font-semibold border-b border-gray-200 text-[11px]">
                      <th class="pb-1.5">Equipamento / Modelo</th>
                      <th class="pb-1.5">S/N / Patrimônio</th>
                      <th class="pb-1.5 text-right">Páginas Mono (P&B)</th>
                      <th class="pb-1.5 text-right">Páginas Color</th>
                      <th class="pb-1.5 text-right">Total Apurado</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-100 text-gray-800">
                    <tr>
                      <td class="py-2 font-medium">${equipDoContrato ? `${equipDoContrato.marca} ${equipDoContrato.modelo}` : 'Equipamento em Locação'}</td>
                      <td class="py-2 font-mono text-gray-600">S/N: ${equipDoContrato?.numero_serie || '-'} ${equipDoContrato?.numero_patrimonio ? `• Pat: ${equipDoContrato.numero_patrimonio}` : ''}</td>
                      <td class="py-2 text-right font-mono">${pMono.toLocaleString('pt-BR')} págs</td>
                      <td class="py-2 text-right font-mono">${pColor.toLocaleString('pt-BR')} págs</td>
                      <td class="py-2 text-right font-mono font-bold text-blue-900">${pTotal.toLocaleString('pt-BR')} págs</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Bloco de Valores -->
            <div class="border border-gray-300 rounded-lg overflow-hidden">
              <table class="w-full text-left text-xs">
                <thead class="bg-gray-100 text-gray-700 font-semibold border-b border-gray-300">
                  <tr>
                    <th class="py-2.5 px-3">Item / Descrição</th>
                    <th class="py-2.5 px-3 text-right">Franquia</th>
                    <th class="py-2.5 px-3 text-right">Consumo</th>
                    <th class="py-2.5 px-3 text-right">Excedente</th>
                    <th class="py-2.5 px-3 text-right">Valor Total</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                  <tr>
                    <td class="py-2.5 px-3 font-medium">Locação Mensal de Equipamento de Impressão</td>
                    <td class="py-2.5 px-3 text-right">${selectedFatura.paginas_contratadas > 0 ? `${selectedFatura.paginas_contratadas.toLocaleString('pt-BR')} págs` : 'Sem franquia'}</td>
                    <td class="py-2.5 px-3 text-right">-</td>
                    <td class="py-2.5 px-3 text-right">-</td>
                    <td class="py-2.5 px-3 text-right font-semibold">${formatCurrency(selectedFatura.valor_base)}</td>
                  </tr>
                  <tr>
                    <td class="py-2.5 px-3 font-medium">Páginas Adicionais / Consumo Excedente</td>
                    <td class="py-2.5 px-3 text-right">-</td>
                    <td class="py-2.5 px-3 text-right">${selectedFatura.paginas_consumidas.toLocaleString('pt-BR')} págs</td>
                    <td class="py-2.5 px-3 text-right text-amber-700 font-semibold">+${selectedFatura.paginas_excedentes.toLocaleString('pt-BR')} págs</td>
                    <td class="py-2.5 px-3 text-right font-semibold">${formatCurrency(selectedFatura.valor_excedente)}</td>
                  </tr>
                  ${
                    selectedFatura.acrescimo_servicos && selectedFatura.acrescimo_servicos > 0
                      ? `
                    <tr>
                      <td colspan="4" class="py-2.5 px-3 text-gray-700 font-medium">Serviços Adicionais / Acréscimos</td>
                      <td class="py-2.5 px-3 text-right text-emerald-700 font-semibold">+${formatCurrency(selectedFatura.acrescimo_servicos)}</td>
                    </tr>
                  `
                      : ''
                  }
                  ${
                    selectedFatura.desconto && selectedFatura.desconto > 0
                      ? `
                    <tr>
                      <td colspan="4" class="py-2.5 px-3 text-gray-700 font-medium">Descontos Concedidos</td>
                      <td class="py-2.5 px-3 text-right text-red-600 font-semibold">−${formatCurrency(selectedFatura.desconto)}</td>
                    </tr>
                  `
                      : ''
                  }
                </tbody>
                <tfoot class="bg-gray-100 border-t-2 border-gray-400 font-bold">
                  <tr>
                    <td colspan="4" class="py-3 px-3 text-right uppercase">TOTAL GERAL A PAGAR:</td>
                    <td class="py-3 px-3 text-right text-blue-900 text-sm font-mono">${formatCurrency(selectedFatura.valor_total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <!-- Rodapé da Empresa -->
            <div class="border-t border-gray-200 pt-4 text-center text-gray-500 text-[10.5px]">
              <p class="font-semibold text-gray-700">${configEmpresa?.mensagem_rodape || 'STD — Eficiência, qualidade e tecnologia em outsourcing de impressão.'}</p>
              <p class="text-[9px] text-gray-400 mt-0.5">Emitido em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
            </div>
          </div>
          <script>
            window.addEventListener('load', () => {
              setTimeout(() => {
                window.focus();
                window.print();
              }, 400);
            });
          </script>
        </body>
      </html>
    `)
    printWin.document.close()
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Faturamento</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Gestão de leituras de contadores, franquias contratadas e emissão de cobranças
          </p>
        </div>
        {!isClienteUser && (
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button
                onClick={handleOpenLote}
                variant="outline"
                className="border-blue-300 text-blue-700 hover:bg-blue-50 flex items-center gap-1.5 font-medium shadow-xs"
              >
                <Sparkles className="w-4 h-4 text-blue-600" /> Gerar faturas do mês em lote
              </Button>
            )}
            {!isOperador && (
              <Button
                onClick={() => handleOpenCreate()}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Gerar Fatura Individual
              </Button>
            )}
          </div>
        )}
      </div>

      {/* 3 Cards de KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* KPI 1 */}
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Faturamento do Mês
            </span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-gray-900">
              {formatCurrency(kpiFaturamentoMes)}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">Aluguel fixo + excedentes apurados</p>
        </div>

        {/* KPI 2 */}
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Páginas Excedentes no Mês
            </span>
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-gray-900">
              +{kpiPaginasExcedentes.toLocaleString('pt-BR')} págs
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">Volume impresso além da franquia</p>
        </div>

        {/* KPI 3 */}
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Faturas Pendentes de Pagamento
            </span>
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-amber-700">
              {formatCurrency(kpiFaturasPendentes)}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">Faturas geradas ou vencidas em aberto</p>
        </div>
      </div>

      {/* Tabela de Faturas */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#F9FAFB] text-gray-600 font-semibold text-xs border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Mês Ref.</th>
                <th className="py-3 px-4">Contratadas</th>
                <th className="py-3 px-4">Consumidas</th>
                <th className="py-3 px-4">Excedentes</th>
                <th className="py-3 px-4">Valor Base</th>
                <th className="py-3 px-4">Valor Excedente</th>
                <th className="py-3 px-4 font-bold text-gray-900">Total</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-gray-500">
                    Carregando faturas...
                  </td>
                </tr>
              ) : faturas.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-gray-500">
                    Nenhuma fatura gerada no sistema.
                  </td>
                </tr>
              ) : (
                faturas.map((f) => (
                  <tr
                    key={f.id}
                    onClick={() => handleOpenVisualizar(f)}
                    className="hover:bg-gray-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4 font-semibold text-gray-900">
                      <Link
                        to={`/clientes/${f.cliente_id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="hover:text-blue-600"
                      >
                        {f.expand?.cliente_id?.nome_razao_social || 'Cliente'}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-gray-800">
                      {formatMonthYear(f.mes_referencia)}
                    </td>
                    <td className="py-3.5 px-4 text-gray-600">
                      {f.paginas_contratadas.toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3.5 px-4 text-gray-600">
                      {f.paginas_consumidas.toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3.5 px-4 text-gray-600 font-medium">
                      {f.paginas_excedentes > 0 ? (
                        <span className="text-amber-700 font-semibold">
                          +{f.paginas_excedentes.toLocaleString('pt-BR')}
                        </span>
                      ) : (
                        '0'
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-gray-600">{formatCurrency(f.valor_base)}</td>
                    <td className="py-3.5 px-4 text-gray-600">
                      {formatCurrency(f.valor_excedente)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-gray-900">
                      {formatCurrency(f.valor_total)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          f.status === 'paga'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : f.status === 'vencida'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : f.status === 'cancelada'
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {f.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenVisualizar(f)
                          }}
                          className="h-8 w-8 p-0 text-gray-500 hover:text-blue-600"
                          title="Visualizar fatura"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {f.status !== 'paga' && f.status !== 'cancelada' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleMarcarPaga(f, e)}
                            className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-800"
                            title="Marcar como Paga"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        )}
                        {f.status !== 'cancelada' && f.status !== 'paga' && !isOperador && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleCancelar(f, e)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                            title="Cancelar Fatura"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Gerar Fatura com Cálculo ao Vivo e Leitura de Contadores */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-blue-600" /> Faturamento com Subtração Automática
              de Leituras
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleGerarFatura} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="fat-cli">Cliente</Label>
                <Select value={selectedClienteId} onValueChange={handleClienteChange}>
                  <SelectTrigger id="fat-cli">
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome_razao_social}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fat-mes">Mês de Referência (YYYY-MM)</Label>
                <Input
                  id="fat-mes"
                  type="month"
                  value={mesReferencia}
                  onChange={(e) => setMesReferencia(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fat-cont">Contrato / Equipamento</Label>
              <Select
                value={selectedContratoId}
                onValueChange={(val) => {
                  const ct = clienteContratos.find((c) => c.id === val)
                  if (ct) handleSelectContrato(ct)
                }}
              >
                <SelectTrigger id="fat-cont">
                  <SelectValue placeholder="Selecione o contrato/equipamento" />
                </SelectTrigger>
                <SelectContent>
                  {clienteContratos.length === 0 ? (
                    <SelectItem value="none" disabled>
                      Nenhum contrato ativo
                    </SelectItem>
                  ) : (
                    clienteContratos.map((ct) => {
                      const eq = equipamentos.find((e) => e.id === ct.equipamento_id)
                      return (
                        <SelectItem key={ct.id} value={ct.id}>
                          {ct.numero_contrato || 'Contrato'} — {eq?.marca} {eq?.modelo} (Pat:{' '}
                          {eq?.numero_patrimonio || 'S/Pat'})
                        </SelectItem>
                      )
                    })
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* SEÇÃO DE LEITURAS COM SUBTRAÇÃO AUTOMÁTICA */}
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                  1. Apuração de Contadores por Equipamento
                </span>
                <span className="text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-semibold">
                  Subtração Automática: Atual − Anterior
                </span>
              </div>

              {/* Leituras Monocromático */}
              <div className="p-3 bg-white rounded-lg border border-gray-200 space-y-2">
                <span className="text-xs font-semibold text-gray-900 block">
                  Contador Monocromático (P&B)
                </span>
                <div className="grid grid-cols-3 gap-3 text-xs items-center">
                  <div>
                    <Label className="text-gray-500 text-[11px]">Leitura Anterior</Label>
                    <Input
                      type="number"
                      value={leituraAnteriorMono}
                      onChange={(e) => setLeituraAnteriorMono(Number(e.target.value))}
                      className="h-8 font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-blue-900 font-semibold text-[11px]">
                      Leitura Atual Informada *
                    </Label>
                    <Input
                      type="number"
                      value={leituraAtualMono}
                      onChange={(e) => setLeituraAtualMono(Number(e.target.value))}
                      className="h-8 font-mono border-blue-400 font-bold"
                      required
                    />
                  </div>
                  <div className="bg-blue-50/70 p-2 rounded text-center border border-blue-100">
                    <span className="text-[10px] text-blue-700 block uppercase font-medium">
                      Consumo Mono
                    </span>
                    <span className="text-sm font-bold text-blue-900 font-mono">
                      {consumoMono.toLocaleString('pt-BR')} págs
                    </span>
                  </div>
                </div>
              </div>

              {/* Leituras Colorido */}
              <div className="p-3 bg-white rounded-lg border border-gray-200 space-y-2">
                <span className="text-xs font-semibold text-gray-900 block">
                  Contador Colorido (Color)
                </span>
                <div className="grid grid-cols-3 gap-3 text-xs items-center">
                  <div>
                    <Label className="text-gray-500 text-[11px]">Leitura Anterior</Label>
                    <Input
                      type="number"
                      value={leituraAnteriorColor}
                      onChange={(e) => setLeituraAnteriorColor(Number(e.target.value))}
                      className="h-8 font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-blue-900 font-semibold text-[11px]">
                      Leitura Atual Informada *
                    </Label>
                    <Input
                      type="number"
                      value={leituraAtualColor}
                      onChange={(e) => setLeituraAtualColor(Number(e.target.value))}
                      className="h-8 font-mono border-blue-400 font-bold"
                      required
                    />
                  </div>
                  <div className="bg-blue-50/70 p-2 rounded text-center border border-blue-100">
                    <span className="text-[10px] text-blue-700 block uppercase font-medium">
                      Consumo Color
                    </span>
                    <span className="text-sm font-bold text-blue-900 font-mono">
                      {consumoColor.toLocaleString('pt-BR')} págs
                    </span>
                  </div>
                </div>
              </div>

              {/* Total Consumido e Franquia */}
              <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                <div className="p-2.5 rounded-lg bg-gray-100 border border-gray-200">
                  <span className="text-[10px] text-gray-500 block uppercase font-medium">
                    Total Consumido no Período
                  </span>
                  <p className="text-base font-bold text-gray-900">
                    {paginasConsumidas.toLocaleString('pt-BR')} págs
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-gray-100 border border-gray-200">
                  <span className="text-[10px] text-gray-500 block uppercase font-medium">
                    Franquia Contratada
                  </span>
                  <p className="text-base font-bold text-gray-900">
                    {isApenasExcedentes
                      ? 'Sem franquia'
                      : `${paginasContratadas.toLocaleString('pt-BR')} págs`}
                  </p>
                </div>
              </div>
            </div>

            {/* DESCONTOS E ACRÉSCIMOS POR EQUIPAMENTO */}
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
              <span className="text-xs font-bold text-gray-800 uppercase tracking-wide block">
                2. Ajustes Financeiros por Equipamento
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <Label htmlFor="fat-desc" className="text-red-700 font-semibold">
                    Desconto no Equipamento (R$)
                  </Label>
                  <Input
                    id="fat-desc"
                    type="number"
                    step="0.01"
                    min={0}
                    value={descontoEquipamento}
                    onChange={(e) => setDescontoEquipamento(Number(e.target.value))}
                    placeholder="0,00"
                    className="h-9"
                  />
                  <span className="text-[10px] text-gray-400">
                    Abatimentos, horas paradas ou bonificação
                  </span>
                </div>

                <div>
                  <Label htmlFor="fat-acresc" className="text-emerald-700 font-semibold">
                    Serviço a Acrescentar (R$)
                  </Label>
                  <Input
                    id="fat-acresc"
                    type="number"
                    step="0.01"
                    min={0}
                    value={acrescimoServicos}
                    onChange={(e) => setAcrescimoServicos(Number(e.target.value))}
                    placeholder="0,00"
                    className="h-9"
                  />
                  <span className="text-[10px] text-gray-400">
                    Suprimentos avulsos, frete ou serviços extras
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <Label htmlFor="fat-obs" className="text-xs text-gray-600">
                  Observações na Fatura
                </Label>
                <Textarea
                  id="fat-obs"
                  rows={2}
                  placeholder="Detalhes adicionais da apuração de contadores..."
                  value={observacoesFatura}
                  onChange={(e) => setObservacoesFatura(e.target.value)}
                  className="text-xs bg-white"
                />
              </div>
            </div>

            {/* RESUMO / CONTABILIDADE GERAL A PAGAR */}
            <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200 space-y-2 text-xs">
              <span className="text-xs font-bold text-blue-950 uppercase tracking-wide block">
                3. Contabilidade Geral do Faturamento
              </span>
              <div className="flex items-center justify-between text-blue-900">
                <span>Valor Base da Locação:</span>
                <span className="font-semibold">{formatCurrency(valorBaseAluguel)}</span>
              </div>
              {valorScanner > 0 && (
                <div className="flex items-center justify-between text-blue-900">
                  <span>Valor Scanner Faturado:</span>
                  <span className="font-semibold">{formatCurrency(valorScanner)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-blue-900">
                <span>
                  Páginas Excedentes ({paginasExcedentesCalculadas.toLocaleString('pt-BR')} págs):
                </span>
                <span className="font-semibold text-amber-800">
                  +{formatCurrency(valorExcedenteCalculado)}
                </span>
              </div>
              {acrescimoServicos > 0 && (
                <div className="flex items-center justify-between text-emerald-800">
                  <span>Serviços / Adicionais:</span>
                  <span className="font-semibold">+{formatCurrency(acrescimoServicos)}</span>
                </div>
              )}
              {descontoEquipamento > 0 && (
                <div className="flex items-center justify-between text-red-700">
                  <span>Descontos Aplicados:</span>
                  <span className="font-semibold">−{formatCurrency(descontoEquipamento)}</span>
                </div>
              )}
              <div className="pt-2.5 border-t border-blue-200 flex items-center justify-between text-blue-950 font-bold text-base">
                <span>Total Geral a Ser Pago:</span>
                <span className="text-xl text-blue-700 font-mono">
                  {formatCurrency(valorTotalCalculado)}
                </span>
              </div>
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !selectedContratoId}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                {isSubmitting ? 'Gerando...' : 'Gravar Fatura e Atualizar Contador'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Faturamento Recorrente em Lote */}
      <Dialog open={isModalLoteOpen} onOpenChange={setIsModalLoteOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900">
              <Sparkles className="w-5 h-5 text-blue-600" /> Gerar Faturas do Mês em Lote
            </DialogTitle>
          </DialogHeader>

          {!resultadoLote ? (
            <div className="space-y-4 pt-1">
              <p className="text-xs text-gray-600 leading-relaxed">
                Esta ação gera automaticamente as faturas do ciclo de locação recorrente para todos
                os clientes ativos que possuam contrato vigente e que ainda não possuam fatura
                emitida para o mês selecionado.
              </p>

              <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between gap-4">
                <div>
                  <Label
                    htmlFor="lote-mes"
                    className="text-xs font-semibold text-gray-700 block mb-1"
                  >
                    Mês de Referência do Faturamento
                  </Label>
                  <Input
                    id="lote-mes"
                    type="month"
                    value={mesReferenciaLote}
                    onChange={(e) => setMesReferenciaLote(e.target.value)}
                    className="h-9 w-48 text-sm bg-white"
                  />
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-gray-500 uppercase font-bold block">
                    Total a Gerar
                  </span>
                  <span className="text-2xl font-bold text-blue-600 font-mono">
                    {analiseLote.aGerar.length} cliente(s)
                  </span>
                </div>
              </div>

              {/* Resumo da Prévia */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/70 text-xs">
                  <span className="text-emerald-800 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Faturas a Gerar
                  </span>
                  <p className="text-xl font-bold text-emerald-900 mt-1 font-mono">
                    {analiseLote.aGerar.length}
                  </p>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    Clientes ativos com contrato e sem fatura
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/70 text-xs">
                  <span className="text-amber-800 font-bold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Já Faturados
                  </span>
                  <p className="text-xl font-bold text-amber-900 mt-1 font-mono">
                    {analiseLote.jaFaturados.length}
                  </p>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Serão pulados para evitar duplicidade
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-gray-200 bg-gray-50 text-xs">
                  <span className="text-gray-700 font-bold flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-gray-500" /> Sem Contrato
                  </span>
                  <p className="text-xl font-bold text-gray-800 mt-1 font-mono">
                    {analiseLote.semContrato.length}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Clientes ativos sem contrato ativo
                  </p>
                </div>
              </div>

              {/* Lista dos que serão gerados */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-gray-800 uppercase tracking-wide block">
                  Clientes que receberão faturas ({analiseLote.aGerar.length})
                </span>
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100 text-xs">
                  {analiseLote.aGerar.length === 0 ? (
                    <div className="p-4 text-center text-gray-400">
                      Nenhum cliente elegível para faturamento neste mês (todos já faturados ou sem
                      contrato).
                    </div>
                  ) : (
                    analiseLote.aGerar.map((item) => {
                      const valorEstimado = item.contratos.reduce(
                        (acc, ct) => acc + (ct.valor_mensal || 0) + (ct.valor_scanner || 0),
                        0,
                      )
                      return (
                        <div
                          key={item.cliente.id}
                          className="p-2.5 flex items-center justify-between hover:bg-gray-50"
                        >
                          <div>
                            <p className="font-semibold text-gray-900">
                              {item.cliente.nome_razao_social}
                            </p>
                            <p className="text-[11px] text-gray-500">
                              {item.contratos.length} contrato(s) vinculado(s)
                            </p>
                          </div>
                          <span className="font-mono font-bold text-gray-800">
                            {formatCurrency(valorEstimado)}
                          </span>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Lista dos que serão pulados */}
              {analiseLote.jaFaturados.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-xs font-bold text-amber-800 block">
                    Clientes pulados (já possuem fatura em {formatMonthYear(mesReferenciaLote)}):
                  </span>
                  <div className="max-h-28 overflow-y-auto border border-amber-200 bg-amber-50/40 rounded-lg p-2 text-xs space-y-1 text-amber-900">
                    {analiseLote.jaFaturados.map((item) => (
                      <div key={item.cliente.id} className="flex items-center justify-between">
                        <span>• {item.cliente.nome_razao_social}</span>
                        <span className="font-mono text-[11px] text-amber-800">
                          Fatura #{item.fatura.id.slice(0, 6).toUpperCase()} (
                          {formatCurrency(item.fatura.valor_total)})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setIsModalLoteOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleExecutarFaturamentoLote}
                  disabled={isExecutandoLote || analiseLote.aGerar.length === 0}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  {isExecutandoLote
                    ? 'Processando Faturas...'
                    : `Confirmar e Gerar ${analiseLote.aGerar.length} Fatura(s)`}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            /* Resumo Pós-Execução */
            <div className="space-y-4 pt-1">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-center space-y-1">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h3 className="font-bold text-base">Faturamento em Lote Concluído!</h3>
                <p className="text-xs text-emerald-700">
                  O ciclo de faturamento foi processado e todas as faturas geradas já constam na
                  listagem.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 rounded-lg border border-emerald-200 bg-white">
                  <span className="text-[11px] text-gray-500 uppercase font-bold block">
                    Faturas Geradas
                  </span>
                  <span className="text-2xl font-bold text-emerald-600 font-mono">
                    {resultadoLote.geradas}
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-amber-200 bg-white">
                  <span className="text-[11px] text-gray-500 uppercase font-bold block">
                    Clientes Pulados
                  </span>
                  <span className="text-2xl font-bold text-amber-600 font-mono">
                    {resultadoLote.puladas}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold text-gray-800 uppercase tracking-wide block">
                  Detalhamento por Cliente
                </span>
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100 text-xs">
                  {resultadoLote.detalhes.map((det, idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between">
                      <span className="font-medium text-gray-900">{det.clienteNome}</span>
                      <div className="flex items-center gap-2">
                        {det.valor !== undefined && (
                          <span className="font-mono text-gray-700">
                            {formatCurrency(det.valor)}
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            det.status === 'gerada'
                              ? 'bg-emerald-100 text-emerald-800'
                              : det.status === 'ja_existe'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {det.status === 'gerada'
                            ? 'Gerada'
                            : det.status === 'ja_existe'
                              ? 'Já existia'
                              : 'Sem contrato'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  onClick={() => {
                    setIsModalLoteOpen(false)
                    setResultadoLote(null)
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
                >
                  Concluir e Ver Faturas
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Detalhes / Impressão de Fatura */}
      <Dialog open={isDetalhesOpen} onOpenChange={setIsDetalhesOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedFatura && (
            <div className="space-y-6 pt-2">
              {/* CABEÇALHO PERSONALIZADO DA EMPRESA */}
              <div className="flex items-start justify-between border-b-2 border-gray-800 pb-4">
                <div className="flex items-center gap-3">
                  {configEmpresa?.logo && (
                    <img
                      src={configuracoesService.getLogoUrl(configEmpresa) || ''}
                      alt="Logo Empresa"
                      className="h-14 w-auto object-contain max-w-[150px]"
                    />
                  )}
                  <div>
                    <h2 className="text-lg font-bold uppercase text-gray-900">
                      {configEmpresa?.razao_social || 'STD'}
                    </h2>
                    {configEmpresa?.nome_fantasia && (
                      <p className="text-xs text-gray-600">{configEmpresa.nome_fantasia}</p>
                    )}
                    <p className="text-[11px] text-gray-500">
                      CNPJ: {configEmpresa?.cnpj || '-'} • Tel: {configEmpresa?.telefone || '-'}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      {configEmpresa?.endereco || ''}{' '}
                      {configEmpresa?.cidade ? `• ${configEmpresa.cidade}/${configEmpresa.uf}` : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="border border-gray-900 px-3 py-1.5 rounded text-center">
                    <span className="block text-[10px] uppercase font-bold text-gray-600">
                      Fatura de Locação
                    </span>
                    <span className="text-base font-mono font-bold text-gray-900">
                      #{selectedFatura.id.slice(0, 8).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-500 block mt-1">
                    Mês Ref: <strong>{formatMonthYear(selectedFatura.mes_referencia)}</strong>
                  </span>
                  <span
                    className={`mt-1 inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      selectedFatura.status === 'paga'
                        ? 'bg-emerald-100 text-emerald-800'
                        : selectedFatura.status === 'vencida'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {selectedFatura.status}
                  </span>
                </div>
              </div>

              {/* Informações do Cliente */}
              <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-xs">
                <span className="text-gray-400 font-semibold uppercase block">
                  Dados do Cliente Sacado
                </span>
                <p className="text-sm font-bold text-gray-900 mt-0.5">
                  {selectedFatura.expand?.cliente_id?.nome_razao_social}
                </p>
                <div className="grid grid-cols-2 gap-2 text-gray-600 mt-1">
                  <p>CNPJ / CPF: {selectedFatura.expand?.cliente_id?.documento || '-'}</p>
                  <p>E-mail: {selectedFatura.expand?.cliente_id?.email || '-'}</p>
                  <p>
                    Endereço: {selectedFatura.expand?.cliente_id?.endereco || '-'}{' '}
                    {selectedFatura.expand?.cliente_id?.cidade
                      ? ` - ${selectedFatura.expand?.cliente_id?.cidade}/${selectedFatura.expand?.cliente_id?.uf}`
                      : ''}
                  </p>
                  <p>Emissão: {formatDate(selectedFatura.created)}</p>
                </div>
              </div>

              {/* RESUMO DOS EQUIPAMENTOS INSTALADOS E QUANTIDADES DE PÁGINAS (Antes do bloco de valores) */}
              <div className="border border-blue-200 rounded-xl overflow-hidden bg-blue-50/30">
                <div className="bg-blue-600/10 px-3 py-2 border-b border-blue-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-950 uppercase tracking-wide">
                    Equipamentos Instalados & Contadores do Período
                  </span>
                  <span className="text-[10px] text-blue-700 font-semibold">
                    Resumo Operacional de Bilhetagem
                  </span>
                </div>
                <div className="p-3 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-gray-600 font-semibold border-b border-gray-200 text-[11px]">
                        <th className="pb-1.5">Equipamento / Modelo</th>
                        <th className="pb-1.5">S/N / Patrimônio</th>
                        <th className="pb-1.5 text-right">Págs Mono (P&B)</th>
                        <th className="pb-1.5 text-right">Págs Color</th>
                        <th className="pb-1.5 text-right">Total Apurado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-800">
                      {(() => {
                        const contrato = selectedFatura.expand?.contrato_id
                        const equipDoContrato = contrato?.equipamento_id
                          ? equipamentos.find((e) => e.id === contrato.equipamento_id)
                          : null

                        const diffMono =
                          (selectedFatura.leitura_atual_mono ?? 0) -
                          (selectedFatura.leitura_anterior_mono ?? 0)
                        const diffColor =
                          (selectedFatura.leitura_atual_color ?? 0) -
                          (selectedFatura.leitura_anterior_color ?? 0)

                        const pMono = diffMono > 0 ? diffMono : 0
                        const pColor = diffColor > 0 ? diffColor : 0
                        const pTotal =
                          pMono + pColor > 0 ? pMono + pColor : selectedFatura.paginas_consumidas

                        return (
                          <tr>
                            <td className="py-2 font-medium text-gray-900">
                              {equipDoContrato
                                ? `${equipDoContrato.marca} ${equipDoContrato.modelo}`
                                : 'Equipamento Contratado'}
                            </td>
                            <td className="py-2 font-mono text-gray-600 text-[11px]">
                              S/N: {equipDoContrato?.numero_serie || '-'}{' '}
                              {equipDoContrato?.numero_patrimonio
                                ? `• Pat: ${equipDoContrato.numero_patrimonio}`
                                : ''}
                            </td>
                            <td className="py-2 text-right font-mono text-gray-700">
                              {pMono.toLocaleString('pt-BR')} págs
                            </td>
                            <td className="py-2 text-right font-mono text-gray-700">
                              {pColor.toLocaleString('pt-BR')} págs
                            </td>
                            <td className="py-2 text-right font-mono font-bold text-blue-900">
                              {pTotal.toLocaleString('pt-BR')} págs
                            </td>
                          </tr>
                        )
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Quebra de Cálculo */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F9FAFB] text-gray-600 font-semibold border-b border-gray-200">
                    <tr>
                      <th className="py-2.5 px-3">Item / Descrição</th>
                      <th className="py-2.5 px-3 text-right">Franquia</th>
                      <th className="py-2.5 px-3 text-right">Consumo</th>
                      <th className="py-2.5 px-3 text-right">Excedente</th>
                      <th className="py-2.5 px-3 text-right">Valor Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr>
                      <td className="py-3 px-3 font-medium text-gray-900">
                        Locação Mensal de Equipamento de Impressão
                      </td>
                      <td className="py-3 px-3 text-right text-gray-600">
                        {selectedFatura.paginas_contratadas > 0
                          ? `${selectedFatura.paginas_contratadas.toLocaleString('pt-BR')} págs`
                          : 'Sem franquia'}
                      </td>
                      <td className="py-3 px-3 text-right text-gray-600">-</td>
                      <td className="py-3 px-3 text-right text-gray-600">-</td>
                      <td className="py-3 px-3 text-right font-semibold text-gray-900">
                        {formatCurrency(selectedFatura.valor_base)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-medium text-gray-900">
                        Páginas Adicionais / Consumo Excedente
                      </td>
                      <td className="py-3 px-3 text-right text-gray-600">-</td>
                      <td className="py-3 px-3 text-right text-gray-600">
                        {selectedFatura.paginas_consumidas.toLocaleString('pt-BR')} págs
                      </td>
                      <td className="py-3 px-3 text-right text-amber-700 font-semibold">
                        +{selectedFatura.paginas_excedentes.toLocaleString('pt-BR')} págs
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-gray-900">
                        {formatCurrency(selectedFatura.valor_excedente)}
                      </td>
                    </tr>
                    {selectedFatura.acrescimo_servicos && selectedFatura.acrescimo_servicos > 0 ? (
                      <tr>
                        <td colSpan={4} className="py-2.5 px-3 text-gray-700 font-medium">
                          Serviços Adicionais / Acréscimos
                        </td>
                        <td className="py-2.5 px-3 text-right text-emerald-700 font-semibold">
                          +{formatCurrency(selectedFatura.acrescimo_servicos)}
                        </td>
                      </tr>
                    ) : null}
                    {selectedFatura.desconto && selectedFatura.desconto > 0 ? (
                      <tr>
                        <td colSpan={4} className="py-2.5 px-3 text-gray-700 font-medium">
                          Descontos Concedidos no Equipamento
                        </td>
                        <td className="py-2.5 px-3 text-right text-red-600 font-semibold">
                          −{formatCurrency(selectedFatura.desconto)}
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                    <tr>
                      <td
                        colSpan={4}
                        className="py-3 px-3 font-bold text-gray-900 text-right uppercase"
                      >
                        TOTAL GERAL A PAGAR:
                      </td>
                      <td className="py-3 px-3 font-bold text-blue-700 text-base text-right font-mono">
                        {formatCurrency(selectedFatura.valor_total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* STATUS DE ENVIO DE E-MAIL E COBRANÇA CORA */}
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-blue-600" />
                    <span className="font-semibold text-gray-800">Status de Envio por E-mail:</span>
                  </div>
                  {selectedFatura.enviada_email_em ? (
                    <Badge
                      variant="outline"
                      className="bg-emerald-50 text-emerald-800 border-emerald-300"
                    >
                      Enviada em {formatDateTime(selectedFatura.enviada_email_em)}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-300">
                      Não enviada
                    </Badge>
                  )}
                </div>

                {selectedFatura.enviada_email_para && (
                  <p className="text-[11px] text-gray-500">
                    Destinatário registrado: <strong>{selectedFatura.enviada_email_para}</strong>
                  </p>
                )}

                {/* Status do Boleto Cora */}
                <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-purple-600" />
                    <span className="font-semibold text-gray-800">Cobrança / Boleto Cora:</span>
                  </div>
                  {coraConfig?.ativo && coraConfig?.client_id ? (
                    <Badge
                      variant="outline"
                      className="bg-purple-50 text-purple-800 border-purple-300"
                    >
                      Integração Ativa
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-amber-50 text-amber-800 border-amber-300"
                    >
                      Cora não configurada
                    </Badge>
                  )}
                </div>

                {cobrancasFatura.length > 0 && (
                  <div className="mt-1 pt-1 border-t border-gray-100 space-y-1">
                    {cobrancasFatura.map((cob) => (
                      <div
                        key={cob.id}
                        className="flex items-center justify-between text-[11px] bg-white p-1.5 rounded border border-gray-200"
                      >
                        <span>
                          Boleto #{cob.id.slice(0, 8).toUpperCase()} ({formatCurrency(cob.valor)})
                        </span>
                        <span className="font-semibold uppercase text-purple-700">
                          [{cob.status}]
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Botões de Ação na visualização */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrint}
                    className="flex items-center gap-1.5"
                  >
                    <Printer className="w-4 h-4" /> Imprimir / Exportar
                  </Button>

                  {isAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isSendingEmail}
                      onClick={() => handleEnviarEmailFatura(selectedFatura)}
                      className="border-blue-300 text-blue-700 hover:bg-blue-50 flex items-center gap-1.5"
                      title="Enviar fatura em PDF/demonstrativo para o e-mail do cliente"
                    >
                      <Send className="w-4 h-4 text-blue-600" />
                      {isSendingEmail ? 'Enviando e-mail...' : 'Enviar por E-mail'}
                    </Button>
                  )}

                  {/* Botão Gerar Boleto Cora */}
                  {coraConfig?.ativo && coraConfig?.client_id ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isGerandoBoleto}
                      onClick={() => handleGerarBoletoCora(selectedFatura)}
                      className="border-purple-300 text-purple-700 hover:bg-purple-50 flex items-center gap-1.5"
                    >
                      <CreditCard className="w-4 h-4 text-purple-600" />
                      {isGerandoBoleto ? 'Gerando...' : 'Gerar Boleto Cora'}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled
                      className="opacity-60 cursor-not-allowed border-dashed text-gray-400 flex items-center gap-1.5"
                      title="Integração Cora não configurada em Personalizar"
                    >
                      <CreditCard className="w-4 h-4" /> Boleto (Cora Pendente)
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {selectedFatura.status !== 'paga' && selectedFatura.status !== 'cancelada' && (
                    <Button
                      size="sm"
                      onClick={() => handleMarcarPaga(selectedFatura)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
                    >
                      <CheckCircle className="w-4 h-4" /> Marcar como Paga
                    </Button>
                  )}
                  {selectedFatura.status !== 'cancelada' && selectedFatura.status !== 'paga' && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleCancelar(selectedFatura)}
                      className="flex items-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" /> Cancelar Fatura
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => setIsDetalhesOpen(false)}>
                    Fechar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
