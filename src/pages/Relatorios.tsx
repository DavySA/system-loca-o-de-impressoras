import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  FileText,
  BarChart3,
  Download,
  Printer,
  Calendar,
  Users,
  Printer as PrinterIcon,
  TrendingUp,
  Search,
  Filter,
  DollarSign,
  Layers,
  ArrowUpDown,
} from 'lucide-react'
import { faturasService } from '@/services/faturas'
import { clientesService } from '@/services/clientes'
import { equipamentosService } from '@/services/equipamentos'
import { contratosService } from '@/services/contratos'
import { configuracoesService } from '@/services/configuracoes'
import {
  formatCurrency,
  formatMonthYear,
  formatDate,
  formatCompactCurrency,
} from '@/lib/formatters'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Fatura, Cliente, Equipamento, Contrato, ConfiguracoesEmpresa } from '@/types'

export default function Relatorios() {
  const [faturas, setFaturas] = useState<Fatura[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([])
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [configEmpresa, setConfigEmpresa] = useState<ConfiguracoesEmpresa | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Filtros de tempo
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0')

  const [selectedMesAno, setSelectedMesAno] = useState<string>(`${currentYear}-${currentMonth}`)
  const [filtroClienteId, setFiltroClienteId] = useState<string>('todos')
  const [activeTab, setActiveTab] = useState<'faturamento' | 'consumo'>('faturamento')
  const [tipoRanking, setTipoRanking] = useState<'cliente' | 'equipamento'>('equipamento')

  const relatorioRef = useRef<HTMLDivElement>(null)

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [fatList, cliList, eqList, contList, cfg] = await Promise.all([
        faturasService.getAll(),
        clientesService.getAll(),
        equipamentosService.getAll(),
        contratosService.getAll(),
        configuracoesService.get(),
      ])
      setFaturas(fatList)
      setClientes(cliList)
      setEquipamentos(eqList)
      setContratos(contList)
      setConfigEmpresa(cfg)
    } catch (e) {
      console.error('Erro ao carregar dados dos relatórios:', e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // 1. DADOS DE FATURAMENTO POR CLIENTE NO MÊS SELECIONADO
  const faturamentoPorCliente = useMemo(() => {
    // Filtrar faturas do mês selecionado
    const faturasDoMes = faturas.filter((f) => {
      const matchMes = f.mes_referencia === selectedMesAno
      const matchCliente = filtroClienteId === 'todos' || f.cliente_id === filtroClienteId
      return matchMes && matchCliente && f.status !== 'cancelada'
    })

    // Agrupar por cliente
    const agrupado: Record<
      string,
      {
        clienteId: string
        clienteNome: string
        documento: string
        faturasQtd: number
        totalBase: number
        totalExcedente: number
        totalGeral: number
        paginasContratadas: number
        paginasConsumidas: number
        statusPagamento: string[]
      }
    > = {}

    faturasDoMes.forEach((fat) => {
      const cli = clientes.find((c) => c.id === fat.cliente_id)
      const cId = fat.cliente_id
      if (!agrupado[cId]) {
        agrupado[cId] = {
          clienteId: cId,
          clienteNome: cli?.nome_razao_social || 'Cliente não identificado',
          documento: cli?.documento || '-',
          faturasQtd: 0,
          totalBase: 0,
          totalExcedente: 0,
          totalGeral: 0,
          paginasContratadas: 0,
          paginasConsumidas: 0,
          statusPagamento: [],
        }
      }

      agrupado[cId].faturasQtd += 1
      agrupado[cId].totalBase += fat.valor_base || 0
      agrupado[cId].totalExcedente += fat.valor_excedente || 0
      agrupado[cId].totalGeral += fat.valor_total || 0
      agrupado[cId].paginasContratadas += fat.paginas_contratadas || 0
      agrupado[cId].paginasConsumidas += fat.paginas_consumidas || 0
      if (!agrupado[cId].statusPagamento.includes(fat.status)) {
        agrupado[cId].statusPagamento.push(fat.status)
      }
    })

    return Object.values(agrupado).sort((a, b) => b.totalGeral - a.totalGeral)
  }, [faturas, clientes, selectedMesAno, filtroClienteId])

  // Totalizadores de faturamento
  const totaisFaturamento = useMemo(() => {
    return faturamentoPorCliente.reduce(
      (acc, item) => ({
        totalBase: acc.totalBase + item.totalBase,
        totalExcedente: acc.totalExcedente + item.totalExcedente,
        totalGeral: acc.totalGeral + item.totalGeral,
        paginasConsumidas: acc.paginasConsumidas + item.paginasConsumidas,
        clientesCount: acc.clientesCount + 1,
      }),
      { totalBase: 0, totalExcedente: 0, totalGeral: 0, paginasConsumidas: 0, clientesCount: 0 },
    )
  }, [faturamentoPorCliente])

  // 2. RANKING DE CONSUMO DE PÁGINAS (NO MÊS OU TOTAL HISTÓRICO)
  // Ranking por Equipamento
  const rankingPorEquipamento = useMemo(() => {
    // Pegar as faturas do mês selecionado que possuem leitura
    const faturasDoMes = faturas.filter(
      (f) => f.mes_referencia === selectedMesAno && f.status !== 'cancelada',
    )

    const resultado = equipamentos.map((eq) => {
      // Procurar se houve fatura deste equipamento no mês
      const fatEquip = faturasDoMes.find((f) => {
        const ct = contratos.find((c) => c.id === f.contrato_id)
        return ct?.equipamento_id === eq.id
      })

      let monoMes = 0
      let colorMes = 0

      if (fatEquip) {
        const dMono = (fatEquip.leitura_atual_mono ?? 0) - (fatEquip.leitura_anterior_mono ?? 0)
        const dColor = (fatEquip.leitura_atual_color ?? 0) - (fatEquip.leitura_anterior_color ?? 0)
        monoMes = dMono > 0 ? dMono : 0
        colorMes = dColor > 0 ? dColor : 0
      }

      // Se não tem fatura no mês com diferença, usar o contador acumulado do equipamento para visualização
      const totalAcumuladoMono = eq.contador_monocromatico || 0
      const totalAcumuladoColor = eq.contador_colorido || 0

      // Cliente alocado atualmente
      const contratoAtivo = contratos.find(
        (c) => c.equipamento_id === eq.id && c.status === 'ativo',
      )
      const clienteAtivo = contratoAtivo
        ? clientes.find((c) => c.id === contratoAtivo.cliente_id)
        : null

      return {
        id: eq.id,
        marca: eq.marca,
        modelo: eq.modelo,
        numero_serie: eq.numero_serie,
        numero_patrimonio: eq.numero_patrimonio,
        clienteNome: clienteAtivo?.nome_razao_social || 'Disponível / Não locado',
        status: eq.status,
        monoMes,
        colorMes,
        totalMes: monoMes + colorMes,
        totalAcumuladoMono,
        totalAcumuladoColor,
        totalAcumuladoGeral: totalAcumuladoMono + totalAcumuladoColor,
      }
    })

    return resultado.sort((a, b) => {
      // Priorizar os que tiveram consumo no mês, se zero ordenar pelo acumulado total
      if (b.totalMes !== a.totalMes) return b.totalMes - a.totalMes
      return b.totalAcumuladoGeral - a.totalAcumuladoGeral
    })
  }, [equipamentos, faturas, contratos, clientes, selectedMesAno])

  // Ranking por Cliente
  const rankingPorCliente = useMemo(() => {
    const faturasDoMes = faturas.filter(
      (f) => f.mes_referencia === selectedMesAno && f.status !== 'cancelada',
    )

    const mapaClientes: Record<
      string,
      {
        clienteId: string
        nome: string
        documento: string
        monoMes: number
        colorMes: number
        totalMes: number
        equipamentosCount: number
      }
    > = {}

    clientes.forEach((cli) => {
      const conts = contratos.filter((c) => c.cliente_id === cli.id && c.status === 'ativo')
      mapaClientes[cli.id] = {
        clienteId: cli.id,
        nome: cli.nome_razao_social,
        documento: cli.documento || '-',
        monoMes: 0,
        colorMes: 0,
        totalMes: 0,
        equipamentosCount: conts.length,
      }
    })

    faturasDoMes.forEach((fat) => {
      if (mapaClientes[fat.cliente_id]) {
        const dMono = (fat.leitura_atual_mono ?? 0) - (fat.leitura_anterior_mono ?? 0)
        const dColor = (fat.leitura_atual_color ?? 0) - (fat.leitura_anterior_color ?? 0)
        const pMono = dMono > 0 ? dMono : 0
        const pColor = dColor > 0 ? dColor : 0
        const pTot = pMono + pColor > 0 ? pMono + pColor : fat.paginas_consumidas || 0

        mapaClientes[fat.cliente_id].monoMes += pMono
        mapaClientes[fat.cliente_id].colorMes += pColor
        mapaClientes[fat.cliente_id].totalMes += pTot
      }
    })

    return Object.values(mapaClientes).sort((a, b) => b.totalMes - a.totalMes)
  }, [clientes, faturas, contratos, selectedMesAno])

  // EXPORTAÇÃO CSV
  const handleExportCSV = () => {
    if (activeTab === 'faturamento') {
      const header = [
        'Cliente',
        'Documento',
        'Mes_Referencia',
        'Qtd_Faturas',
        'Paginas_Contratadas',
        'Paginas_Consumidas',
        'Valor_Base',
        'Valor_Excedente',
        'Valor_Total',
        'Status',
      ]

      const rows = faturamentoPorCliente.map((item) => [
        `"${item.clienteNome.replace(/"/g, '""')}"`,
        `"${item.documento}"`,
        `"${selectedMesAno}"`,
        item.faturasQtd,
        item.paginasContratadas,
        item.paginasConsumidas,
        item.totalBase.toFixed(2),
        item.totalExcedente.toFixed(2),
        item.totalGeral.toFixed(2),
        `"${item.statusPagamento.join(', ')}"`,
      ])

      const csvContent = [header.join(';'), ...rows.map((r) => r.join(';'))].join('\n')
      downloadFile(
        csvContent,
        `relatorio-faturamento-${selectedMesAno}.csv`,
        'text/csv;charset=utf-8;',
      )
    } else {
      // Exportação Ranking Consumo
      if (tipoRanking === 'equipamento') {
        const header = [
          'Marca',
          'Modelo',
          'Serie_SN',
          'Patrimonio',
          'Cliente_Alocado',
          'Mono_Mes',
          'Color_Mes',
          'Total_Mes',
          'Mono_Acumulado',
          'Color_Acumulado',
          'Total_Acumulado',
        ]
        const rows = rankingPorEquipamento.map((eq) => [
          `"${eq.marca}"`,
          `"${eq.modelo}"`,
          `"${eq.numero_serie}"`,
          `"${eq.numero_patrimonio || ''}"`,
          `"${eq.clienteNome.replace(/"/g, '""')}"`,
          eq.monoMes,
          eq.colorMes,
          eq.totalMes,
          eq.totalAcumuladoMono,
          eq.totalAcumuladoColor,
          eq.totalAcumuladoGeral,
        ])
        const csvContent = [header.join(';'), ...rows.map((r) => r.join(';'))].join('\n')
        downloadFile(
          csvContent,
          `relatorio-consumo-equipamentos-${selectedMesAno}.csv`,
          'text/csv;charset=utf-8;',
        )
      } else {
        const header = [
          'Cliente',
          'Documento',
          'Equipamentos_Instalados',
          'Mono_Mes',
          'Color_Mes',
          'Total_Mes',
        ]
        const rows = rankingPorCliente.map((c) => [
          `"${c.nome.replace(/"/g, '""')}"`,
          `"${c.documento}"`,
          c.equipamentosCount,
          c.monoMes,
          c.colorMes,
          c.totalMes,
        ])
        const csvContent = [header.join(';'), ...rows.map((r) => r.join(';'))].join('\n')
        downloadFile(
          csvContent,
          `relatorio-consumo-clientes-${selectedMesAno}.csv`,
          'text/csv;charset=utf-8;',
        )
      }
    }
  }

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob(['\ufeff' + content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  // IMPRESSÃO / PDF VIA PRINT DEDICADO DO RELATÓRIO
  const handlePrintRelatorio = () => {
    const content = relatorioRef.current?.innerHTML
    if (!content) return

    const printWin = window.open('', '_blank', 'width=950,height=800')
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
          <title>Relatório Mensal - TD Technology System ERP</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @page { size: A4 portrait; margin: 12mm 15mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111827; background: #fff; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border-bottom: 1px solid #e5e7eb; padding: 6px 8px; font-size: 11px; }
            th { background-color: #f9fafb; font-weight: 600; text-align: left; }
          </style>
        </head>
        <body class="p-6 bg-white">
          <div class="max-w-4xl mx-auto space-y-4">
            <!-- Cabeçalho -->
            <div class="flex items-center justify-between border-b-2 border-gray-900 pb-3 mb-4">
              <div class="flex items-center gap-3">
                ${logoUrl ? `<img src="${logoUrl}" class="h-12 max-w-[140px] object-contain" />` : ''}
                <div>
                  <h1 class="text-sm font-bold uppercase text-gray-900">${configEmpresa?.razao_social || 'TD Technology System Soluções LTDA'}</h1>
                  <p class="text-[10px] text-gray-600">${configEmpresa?.nome_fantasia || 'TD Technology System ERP'} • CNPJ: ${configEmpresa?.cnpj || '-'}</p>
                  <p class="text-[10px] text-gray-500">${configEmpresa?.endereco || ''} ${configEmpresa?.cidade ? `• ${configEmpresa.cidade}/${configEmpresa.uf}` : ''} • Tel: ${configEmpresa?.telefone || '-'}</p>
                </div>
              </div>
              <div class="text-right">
                <span class="block text-[9px] uppercase font-bold text-gray-600">Relatório Gerencial</span>
                <span class="text-base font-bold text-blue-900 font-mono">${formatMonthYear(selectedMesAno)}</span>
                <p class="text-[9px] text-gray-400 mt-0.5">Emissão: ${formatDate(new Date().toISOString())}</p>
              </div>
            </div>

            <!-- Conteúdo Renderizado -->
            <div>${content}</div>

            <!-- Rodapé -->
            <div class="border-t border-gray-200 pt-3 text-center text-[9.5px] text-gray-500 mt-6">
              <p>${configEmpresa?.mensagem_rodape || 'TD Technology System ERP — Eficiência, qualidade e tecnologia em outsourcing de impressão.'}</p>
              <p class="text-[8.5px] text-gray-400 mt-0.5">Emitido eletronicamente em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
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
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" /> Relatórios Mensais
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Demonstrativos consolidados de faturamento por cliente, consumo de páginas e exportações
          </p>
        </div>

        {/* Botões de Ação Exportar & Imprimir */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 text-xs border-gray-300 hover:bg-gray-50 text-gray-700"
          >
            <Download className="w-4 h-4 text-emerald-600" /> Exportar CSV
          </Button>
          <Button
            onClick={handlePrintRelatorio}
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 text-xs shadow-xs"
          >
            <Printer className="w-4 h-4" /> Imprimir Relatório / PDF
          </Button>
        </div>
      </div>

      {/* Barra de Filtros de Período e Cliente */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <div className="flex-1 sm:max-w-xs space-y-1">
          <Label htmlFor="rel-mes" className="text-xs font-semibold text-gray-700">
            Mês de Referência:
          </Label>
          <Input
            id="rel-mes"
            type="month"
            value={selectedMesAno}
            onChange={(e) => setSelectedMesAno(e.target.value)}
            className="h-9 text-xs"
          />
        </div>

        <div className="flex-1 sm:max-w-sm space-y-1">
          <Label htmlFor="rel-cli" className="text-xs font-semibold text-gray-700">
            Filtrar Cliente (Opcional):
          </Label>
          <Select value={filtroClienteId} onValueChange={setFiltroClienteId}>
            <SelectTrigger id="rel-cli" className="h-9 text-xs">
              <SelectValue placeholder="Todos os clientes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Clientes</SelectItem>
              {clientes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome_razao_social}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="sm:ml-auto self-end sm:self-center pt-2 sm:pt-4 text-right">
          <span className="text-[11px] text-gray-500 block">Período Selecionado:</span>
          <span className="text-sm font-bold text-gray-900 capitalize">
            {formatMonthYear(selectedMesAno)}
          </span>
        </div>
      </div>

      {/* Cards de Resumo Rápido */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-xs text-gray-500 font-semibold uppercase">
            Total Faturado no Mês
          </span>
          <p className="text-xl font-bold text-gray-900 mt-1">
            {formatCurrency(totaisFaturamento.totalGeral)}
          </p>
          <span className="text-[10px] text-emerald-600 font-medium">
            Base: {formatCurrency(totaisFaturamento.totalBase)} • Exced:{' '}
            {formatCurrency(totaisFaturamento.totalExcedente)}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-xs text-gray-500 font-semibold uppercase">Páginas Consumidas</span>
          <p className="text-xl font-bold text-blue-900 mt-1 font-mono">
            {totaisFaturamento.paginasConsumidas.toLocaleString('pt-BR')} págs
          </p>
          <span className="text-[10px] text-gray-500 font-medium">
            Em faturas apuradas do período
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-xs text-gray-500 font-semibold uppercase">Clientes Faturados</span>
          <p className="text-xl font-bold text-gray-900 mt-1">
            {totaisFaturamento.clientesCount} de {clientes.length}
          </p>
          <span className="text-[10px] text-gray-500 font-medium">Com faturas emitidas</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-xs text-gray-500 font-semibold uppercase">Parque Operacional</span>
          <p className="text-xl font-bold text-gray-900 mt-1">
            {equipamentos.filter((e) => e.status === 'locado').length} / {equipamentos.length}
          </p>
          <span className="text-[10px] text-blue-600 font-medium">Equipamentos locados</span>
        </div>
      </div>

      {/* Abas: 1. Faturamento por Cliente | 2. Ranking de Consumo de Páginas */}
      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="space-y-4">
        <div className="flex items-center justify-between border-b border-gray-200 pb-2">
          <TabsList className="bg-gray-100 p-1">
            <TabsTrigger value="faturamento" className="text-xs flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" /> Faturamento por Cliente
            </TabsTrigger>
            <TabsTrigger value="consumo" className="text-xs flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" /> Ranking de Consumo de Páginas
            </TabsTrigger>
          </TabsList>

          {activeTab === 'consumo' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Agrupar por:</span>
              <Select value={tipoRanking} onValueChange={(v: any) => setTipoRanking(v)}>
                <SelectTrigger className="h-8 text-xs w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="equipamento">Por Equipamento</SelectItem>
                  <SelectItem value="cliente">Por Cliente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* CONTAINER IMPRIMÍVEL DO RELATÓRIO */}
        <div ref={relatorioRef}>
          {/* TAB 1: FATURAMENTO POR CLIENTE */}
          <TabsContent value="faturamento" className="m-0 space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
              <div className="p-4 bg-gray-50/70 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase">
                    Faturamento por Cliente — {formatMonthYear(selectedMesAno)}
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Valores apurados incluindo franquia contratada, consumo excedente e total geral
                  </p>
                </div>
                <span className="text-xs font-semibold text-gray-600">
                  {faturamentoPorCliente.length} clientes listados
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F9FAFB] text-gray-600 font-semibold border-b border-gray-200">
                    <tr>
                      <th className="py-3 px-4">Cliente / Razão Social</th>
                      <th className="py-3 px-4">Documento</th>
                      <th className="py-3 px-4 text-center">Faturas</th>
                      <th className="py-3 px-4 text-right">Franquia</th>
                      <th className="py-3 px-4 text-right">Consumo</th>
                      <th className="py-3 px-4 text-right">Valor Base</th>
                      <th className="py-3 px-4 text-right">Excedentes</th>
                      <th className="py-3 px-4 text-right font-bold text-gray-900">
                        Total Faturado
                      </th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {isLoading ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-gray-500">
                          Carregando dados de faturamento...
                        </td>
                      </tr>
                    ) : faturamentoPorCliente.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-gray-500">
                          Nenhum faturamento registrado para o período de{' '}
                          {formatMonthYear(selectedMesAno)}.
                        </td>
                      </tr>
                    ) : (
                      faturamentoPorCliente.map((item) => (
                        <tr key={item.clienteId} className="hover:bg-gray-50/80 transition-colors">
                          <td className="py-3 px-4 font-semibold text-gray-900">
                            {item.clienteNome}
                          </td>
                          <td className="py-3 px-4 text-gray-500 font-mono text-[11px]">
                            {item.documento}
                          </td>
                          <td className="py-3 px-4 text-center text-gray-600 font-medium">
                            {item.faturasQtd}
                          </td>
                          <td className="py-3 px-4 text-right text-gray-600 font-mono">
                            {item.paginasContratadas.toLocaleString('pt-BR')} págs
                          </td>
                          <td className="py-3 px-4 text-right text-blue-900 font-mono font-medium">
                            {item.paginasConsumidas.toLocaleString('pt-BR')} págs
                          </td>
                          <td className="py-3 px-4 text-right text-gray-700">
                            {formatCurrency(item.totalBase)}
                          </td>
                          <td className="py-3 px-4 text-right text-amber-700 font-semibold">
                            {item.totalExcedente > 0
                              ? `+${formatCurrency(item.totalExcedente)}`
                              : 'R$ 0,00'}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-blue-950 font-mono">
                            {formatCurrency(item.totalGeral)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {item.statusPagamento.map((st) => (
                              <span
                                key={st}
                                className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase mx-0.5 ${
                                  st === 'paga'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : st === 'vencida'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {st}
                              </span>
                            ))}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {faturamentoPorCliente.length > 0 && (
                    <tfoot className="bg-gray-50 border-t-2 border-gray-300 font-bold text-gray-900">
                      <tr>
                        <td colSpan={3} className="py-3 px-4 uppercase text-right">
                          TOTAIS CONSOLIDADOS DO MÊS:
                        </td>
                        <td className="py-3 px-4 text-right text-xs">{/* Franquia Total */}</td>
                        <td className="py-3 px-4 text-right text-blue-900 font-mono text-xs">
                          {totaisFaturamento.paginasConsumidas.toLocaleString('pt-BR')} págs
                        </td>
                        <td className="py-3 px-4 text-right text-xs font-mono">
                          {formatCurrency(totaisFaturamento.totalBase)}
                        </td>
                        <td className="py-3 px-4 text-right text-xs font-mono text-amber-800">
                          {formatCurrency(totaisFaturamento.totalExcedente)}
                        </td>
                        <td className="py-3 px-4 text-right text-sm font-mono text-blue-900">
                          {formatCurrency(totaisFaturamento.totalGeral)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: RANKING DE CONSUMO DE PÁGINAS */}
          <TabsContent value="consumo" className="m-0 space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
              <div className="p-4 bg-gray-50/70 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase">
                    Ranking de Consumo de Páginas —{' '}
                    {tipoRanking === 'equipamento' ? 'Por Equipamento' : 'Por Cliente'} (
                    {formatMonthYear(selectedMesAno)})
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Discriminação detalhada de páginas monocromáticas (P&B) e coloridas (Color)
                  </p>
                </div>
              </div>

              {tipoRanking === 'equipamento' ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F9FAFB] text-gray-600 font-semibold border-b border-gray-200">
                      <tr>
                        <th className="py-3 px-4">Posição / Equipamento</th>
                        <th className="py-3 px-4">S/N & Patrimônio</th>
                        <th className="py-3 px-4">Cliente Alocado</th>
                        <th className="py-3 px-4 text-right">P&B no Mês</th>
                        <th className="py-3 px-4 text-right">Color no Mês</th>
                        <th className="py-3 px-4 text-right font-bold text-blue-900">
                          Total no Mês
                        </th>
                        <th className="py-3 px-4 text-right font-medium text-gray-500">
                          Contador Acumulado Geral
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {rankingPorEquipamento.map((eq, idx) => (
                        <tr key={eq.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="py-3 px-4 font-semibold text-gray-900">
                            <span className="inline-block w-6 text-center font-bold text-gray-400 mr-2">
                              #{idx + 1}
                            </span>
                            {eq.marca} {eq.modelo}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-gray-600">
                            {eq.numero_serie}{' '}
                            {eq.numero_patrimonio ? `• Pat: ${eq.numero_patrimonio}` : ''}
                          </td>
                          <td className="py-3 px-4 text-gray-700">{eq.clienteNome}</td>
                          <td className="py-3 px-4 text-right font-mono text-gray-700">
                            {eq.monoMes > 0 ? `${eq.monoMes.toLocaleString('pt-BR')} págs` : '-'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-gray-700">
                            {eq.colorMes > 0 ? `${eq.colorMes.toLocaleString('pt-BR')} págs` : '-'}
                          </td>
                          <td className="py-3 px-4 text-right font-bold font-mono text-blue-900 text-xs">
                            {eq.totalMes > 0 ? `${eq.totalMes.toLocaleString('pt-BR')} págs` : '-'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-gray-500 text-[11px]">
                            {eq.totalAcumuladoGeral.toLocaleString('pt-BR')} págs
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F9FAFB] text-gray-600 font-semibold border-b border-gray-200">
                      <tr>
                        <th className="py-3 px-4">Posição / Cliente</th>
                        <th className="py-3 px-4">Documento</th>
                        <th className="py-3 px-4 text-center">Equipamentos Ativos</th>
                        <th className="py-3 px-4 text-right">Páginas Mono (P&B)</th>
                        <th className="py-3 px-4 text-right">Páginas Color</th>
                        <th className="py-3 px-4 text-right font-bold text-blue-900">
                          Total Geral Consumido
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {rankingPorCliente.map((c, idx) => (
                        <tr key={c.clienteId} className="hover:bg-gray-50/80 transition-colors">
                          <td className="py-3 px-4 font-semibold text-gray-900">
                            <span className="inline-block w-6 text-center font-bold text-gray-400 mr-2">
                              #{idx + 1}
                            </span>
                            {c.nome}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-gray-500">
                            {c.documento}
                          </td>
                          <td className="py-3 px-4 text-center text-gray-700 font-medium">
                            {c.equipamentosCount}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-gray-700">
                            {c.monoMes.toLocaleString('pt-BR')} págs
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-gray-700">
                            {c.colorMes.toLocaleString('pt-BR')} págs
                          </td>
                          <td className="py-3 px-4 text-right font-bold font-mono text-blue-900 text-xs">
                            {c.totalMes.toLocaleString('pt-BR')} págs
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
