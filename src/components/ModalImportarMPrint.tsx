import React, { useState, useRef } from 'react'
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
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  RefreshCw,
  Printer,
  Building2,
  DollarSign,
  AlertCircle,
  FileCheck,
} from 'lucide-react'
import { formatCurrency, formatMonthYear } from '@/lib/formatters'
import { useToast } from '@/hooks/use-toast'
import { faturasService } from '@/services/faturas'
import { equipamentosService } from '@/services/equipamentos'
import {
  processarCsvMPrint,
  type MPrintLinhaProcessada,
  type MPrintParseResult,
} from '@/services/mprintCsv'
import type { Cliente, Equipamento, Contrato, Fatura, AppUser } from '@/types'

interface ModalImportarMPrintProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientes: Cliente[]
  equipamentos: Equipamento[]
  contratos: Contrato[]
  faturas: Fatura[]
  currentUser?: AppUser | null
  onSuccess: () => Promise<void> | void
}

export const ModalImportarMPrint: React.FC<ModalImportarMPrintProps> = ({
  open,
  onOpenChange,
  clientes,
  equipamentos,
  contratos,
  faturas,
  currentUser,
  onSuccess,
}) => {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [arquivoNome, setArquivoNome] = useState<string>('')
  const [csvRawText, setCsvRawText] = useState<string>('')
  const [parseResult, setParseResult] = useState<MPrintParseResult | null>(null)
  const [linhas, setLinhas] = useState<MPrintLinhaProcessada[]>([])
  const [isProcessando, setIsProcessando] = useState<boolean>(false)
  const [isCriandoFaturas, setIsCriandoFaturas] = useState<boolean>(false)
  const [filtroStatus, setFiltroStatus] = useState<
    'todas' | 'pendentes' | 'duplicadas' | 'prontas'
  >('todas')
  const [relatorioResultado, setRelatorioResultado] = useState<{
    criadas: number
    puladas: number
    pendentes: number
    detalhes: {
      empresa: string
      equipamento: string
      status: 'criada' | 'pulada' | 'pendente'
      faturaId?: string
      motivo?: string
      valor?: number
    }[]
  } | null>(null)

  // Reset ao fechar
  const handleClose = () => {
    if (isCriandoFaturas) return
    onOpenChange(false)
  }

  // Upload e leitura do arquivo CSV
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      toast({
        variant: 'destructive',
        title: 'Formato inválido',
        description: 'Selecione um arquivo .csv exportado pelo sistema MPrint.',
      })
      e.target.value = ''
      return
    }

    setArquivoNome(file.name)
    setRelatorioResultado(null)
    setIsProcessando(true)

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = (event.target?.result as string) || ''
        setCsvRawText(text)
        const resultado = processarCsvMPrint(text, {
          clientes,
          equipamentos,
          contratos,
          faturasExistentes: faturas,
        })
        setParseResult(resultado)
        setLinhas(resultado.linhas)

        toast({
          title: 'Arquivo CSV processado!',
          description: `${resultado.linhas.length} linha(s) de medição reconhecida(s). Confira os vínculos antes de faturar.`,
        })
      } catch (err: any) {
        toast({
          variant: 'destructive',
          title: 'Erro ao analisar CSV',
          description: err.message || 'Verifique a estrutura do arquivo.',
        })
        setParseResult(null)
        setLinhas([])
      } finally {
        setIsProcessando(false)
      }
    }

    reader.onerror = () => {
      toast({
        variant: 'destructive',
        title: 'Erro ao ler arquivo',
        description: 'Não foi possível carregar o conteúdo do CSV.',
      })
      setIsProcessando(false)
    }

    reader.readAsText(file, 'UTF-8')
    e.target.value = ''
  }

  // Reprocessar matching caso o usuário cadastre ou altere dados em outra aba
  const handleReprocessar = () => {
    if (!csvRawText) return
    try {
      const resultado = processarCsvMPrint(csvRawText, {
        clientes,
        equipamentos,
        contratos,
        faturasExistentes: faturas,
      })
      setParseResult(resultado)
      setLinhas(resultado.linhas)
      toast({
        title: 'Dados reprocessados',
        description: 'O mapeamento com clientes e equipamentos foi atualizado.',
      })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao reprocessar',
        description: err.message,
      })
    }
  }

  // Alterar seleção de uma linha
  const handleToggleSelecionada = (id: string) => {
    setLinhas((prev) => prev.map((l) => (l.id === id ? { ...l, selecionada: !l.selecionada } : l)))
  }

  // Selecionar ou desmarcar todas as válidas
  const handleToggleTodas = (marcar: boolean) => {
    setLinhas((prev) =>
      prev.map((l) => {
        // Se desmarcar ou marcar apenas linhas que tenham cliente e equipamento definidos
        if (!marcar) return { ...l, selecionada: false }
        if (l.duplicada) return { ...l, selecionada: false }
        return {
          ...l,
          selecionada: Boolean(l.clienteId && l.equipamentoId),
        }
      }),
    )
  }

  // Associação manual de Cliente
  const handleAssociarClienteManual = (linhaId: string, clienteId: string) => {
    const cli = clientes.find((c) => c.id === clienteId)
    setLinhas((prev) =>
      prev.map((l) => {
        if (l.id !== linhaId) return l

        // Tentar localizar contrato com novo cliente
        const novoContrato = contratos.find(
          (c) =>
            c.cliente_id === clienteId &&
            (!l.equipamentoId || c.equipamento_id === l.equipamentoId) &&
            c.status === 'ativo',
        )

        // Recalcular duplicidade
        let duplicada = false
        let motivo: string | undefined = undefined
        const faturaJaCriada = faturas.find(
          (f) =>
            f.cliente_id === clienteId &&
            f.status !== 'cancelada' &&
            f.mes_referencia === l.mesReferencia,
        )
        if (faturaJaCriada) {
          duplicada = true
          motivo = `Fatura (${faturaJaCriada.status}) já existente para este cliente em ${l.mesReferencia}.`
        }

        return {
          ...l,
          clienteId,
          clienteMatch: cli,
          clienteStatus: 'manual',
          contratoId: novoContrato?.id || l.contratoId,
          contratoMatch: novoContrato || l.contratoMatch,
          duplicada,
          motivoDuplicidade: motivo,
          selecionada: !duplicada && Boolean(l.equipamentoId),
        }
      }),
    )
  }

  // Associação manual de Equipamento
  const handleAssociarEquipamentoManual = (linhaId: string, equipamentoId: string) => {
    const eq = equipamentos.find((e) => e.id === equipamentoId)
    setLinhas((prev) =>
      prev.map((l) => {
        if (l.id !== linhaId) return l

        // Buscar contrato deste equipamento
        const novoContrato = contratos.find(
          (c) =>
            c.equipamento_id === equipamentoId &&
            (!l.clienteId || c.cliente_id === l.clienteId) &&
            c.status === 'ativo',
        )

        let tarifa = l.valorPorPagina
        let origemTarifa = l.origemTarifa
        if (tarifa <= 0 && novoContrato?.valor_pagina_excedente) {
          tarifa = novoContrato.valor_pagina_excedente
          origemTarifa = 'contrato'
        }

        return {
          ...l,
          equipamentoId,
          equipamentoMatch: eq,
          equipamentoStatus: 'manual',
          contratoId: novoContrato?.id || l.contratoId,
          contratoMatch: novoContrato || l.contratoMatch,
          valorPorPagina: tarifa,
          origemTarifa,
          valorTotalCalculado: Number((l.consumoCalculado * tarifa).toFixed(2)),
          selecionada: !l.duplicada && Boolean(l.clienteId),
        }
      }),
    )
  }

  // Edição manual de Valor por Página
  const handleEditarValorPagina = (linhaId: string, novoValor: number) => {
    setLinhas((prev) =>
      prev.map((l) => {
        if (l.id !== linhaId) return l
        const taxa = Math.max(0, novoValor)
        const total = Number((l.consumoCalculado * taxa).toFixed(2))
        return {
          ...l,
          valorPorPagina: taxa,
          origemTarifa: 'manual',
          valorTotalCalculado: total,
        }
      }),
    )
  }

  // Executar criação em lote das faturas e sincronização de contadores
  const handleConfirmarImportacaoEFaturamento = async () => {
    const selecionadas = linhas.filter((l) => l.selecionada)
    if (selecionadas.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Nenhuma linha selecionada',
        description: 'Selecione ao menos uma linha mapeada para faturar.',
      })
      return
    }

    setIsCriandoFaturas(true)

    const detalhes: {
      empresa: string
      equipamento: string
      status: 'criada' | 'pulada' | 'pendente'
      faturaId?: string
      motivo?: string
      valor?: number
    }[] = []

    let criadas = 0
    let puladas = 0
    let pendentes = 0

    try {
      for (const linha of linhas) {
        // Se não foi selecionada
        if (!linha.selecionada) {
          if (!linha.clienteId || !linha.equipamentoId) {
            pendentes++
            detalhes.push({
              empresa: linha.empresaRaw,
              equipamento: linha.equipamentoRaw,
              status: 'pendente',
              motivo: !linha.clienteId ? 'Cliente não associado' : 'Equipamento não associado',
            })
          } else if (linha.duplicada) {
            puladas++
            detalhes.push({
              empresa: linha.clienteMatch?.nome_razao_social || linha.empresaRaw,
              equipamento: linha.equipamentoMatch?.modelo || linha.equipamentoRaw,
              status: 'pulada',
              motivo: linha.motivoDuplicidade || 'Fatura já existente no período',
            })
          } else {
            puladas++
            detalhes.push({
              empresa: linha.empresaRaw,
              equipamento: linha.equipamentoRaw,
              status: 'pulada',
              motivo: 'Desmarcada pelo operador na prévia',
            })
          }
          continue
        }

        // Criar Fatura
        const cliId = linha.clienteId!
        const eqId = linha.equipamentoId!
        const ctMatch = linha.contratoMatch

        // Encontrar ou associar contrato válido
        let contratoId = ctMatch?.id
        if (!contratoId) {
          // Fallback para qualquer contrato ativo do cliente ou equipamento
          const cFallback = contratos.find(
            (c) => (c.cliente_id === cliId || c.equipamento_id === eqId) && c.status === 'ativo',
          )
          contratoId = cFallback?.id
        }

        // Se ainda não tiver contrato cadastrado no banco, buscar qualquer contrato dummy ou abortar linha
        if (!contratoId) {
          // Se realmente não há contrato nenhum ativo no sistema para esse cliente/equipamento,
          // usa o primeiro contrato do sistema como âncora relacional obrigatória do schema do PocketBase
          const primeiroContrato = contratos[0]
          contratoId = primeiroContrato?.id
        }

        const consumo = linha.consumoCalculado
        const valorPorPag = linha.valorPorPagina || 0.08
        const valorTotalFinal =
          linha.valorTotalCalculado > 0 ? linha.valorTotalCalculado : consumo * valorPorPag

        const obsImportacao = [
          `Contadores importados via MPrint (${linha.origemColeta}).`,
          linha.periodoRaw ? `Período: ${linha.periodoRaw}.` : '',
          linha.ipRaw && linha.ipRaw !== '—' ? `IP Coletor: ${linha.ipRaw}.` : '',
          `Leituras apuradas: Inicial ${linha.contadorInicial.toLocaleString('pt-BR')} → Final ${linha.contadorFinal.toLocaleString('pt-BR')}.`,
        ]
          .filter(Boolean)
          .join(' ')

        const novaFatura = await faturasService.create({
          cliente_id: cliId,
          contrato_id: contratoId || contratos[0]?.id || '',
          mes_referencia: linha.mesReferencia,
          paginas_contratadas: ctMatch?.paginas_contratadas_mensais || 0,
          paginas_consumidas: consumo,
          paginas_excedentes: Math.max(0, consumo - (ctMatch?.paginas_contratadas_mensais || 0)),
          valor_base: ctMatch?.valor_mensal || valorTotalFinal,
          valor_excedente: Math.max(
            0,
            (consumo - (ctMatch?.paginas_contratadas_mensais || 0)) * valorPorPag,
          ),
          valor_total: valorTotalFinal,
          leitura_anterior_mono: linha.contadorInicial,
          leitura_atual_mono: linha.contadorFinal,
          leitura_anterior_color: 0,
          leitura_atual_color: 0,
          desconto: 0,
          acrescimo_servicos: 0,
          status: 'gerada',
          criado_por_user_id: currentUser?.id,
          observacoes: obsImportacao,
        })

        // Sincronizar contador no cadastro do Equipamento
        try {
          await equipamentosService.update(eqId, {
            contador_monocromatico: linha.contadorFinal,
          })
        } catch (errEq) {
          console.warn('Aviso ao sincronizar contador do equipamento:', errEq)
        }

        criadas++
        detalhes.push({
          empresa: linha.clienteMatch?.nome_razao_social || linha.empresaRaw,
          equipamento: linha.equipamentoMatch
            ? `${linha.equipamentoMatch.marca} ${linha.equipamentoMatch.modelo}`
            : linha.equipamentoRaw,
          status: 'criada',
          faturaId: novaFatura.id,
          valor: valorTotalFinal,
        })
      }

      setRelatorioResultado({
        criadas,
        puladas,
        pendentes,
        detalhes,
      })

      toast({
        title: 'Faturamento MPrint concluído com sucesso!',
        description: `${criadas} fatura(s) gerada(s). ${puladas} pulada(s) ou duplicada(s).`,
      })

      await onSuccess()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao gerar faturas em lote',
        description: err.message || 'Falha durante o faturamento do arquivo.',
      })
    } finally {
      setIsCriandoFaturas(false)
    }
  }

  // Filtragem na prévia
  const linhasFiltradas = linhas.filter((l) => {
    if (filtroStatus === 'pendentes') return !l.clienteId || !l.equipamentoId
    if (filtroStatus === 'duplicadas') return l.duplicada
    if (filtroStatus === 'prontas') return l.clienteId && l.equipamentoId && !l.duplicada
    return true
  })

  const qtdProntas = linhas.filter((l) => l.clienteId && l.equipamentoId && !l.duplicada).length
  const qtdPendentes = linhas.filter((l) => !l.clienteId || !l.equipamentoId).length
  const qtdDuplicadas = linhas.filter((l) => l.duplicada).length
  const totalSelecionadoValor = linhas
    .filter((l) => l.selecionada)
    .reduce((acc, l) => acc + l.valorTotalCalculado, 0)
  const totalSelecionadoPaginas = linhas
    .filter((l) => l.selecionada)
    .reduce((acc, l) => acc + l.consumoCalculado, 0)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4 pr-6">
            <DialogTitle className="flex items-center gap-2 text-blue-900 text-lg">
              <FileSpreadsheet className="w-5 h-5 text-blue-600" /> Importar CSV de Contagem
              (MPrint)
            </DialogTitle>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              Sincronização com Faturamento Automático
            </Badge>
          </div>
        </DialogHeader>

        {/* ÁREA 1: Upload e Conferência */}
        {!parseResult && !relatorioResultado && (
          <div className="space-y-4 py-4 text-xs">
            <div className="p-4 bg-blue-50/70 rounded-xl border border-blue-200 text-blue-900 space-y-2">
              <p className="font-semibold text-sm flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-blue-700" /> Como funciona a importação:
              </p>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li>
                  Faça o upload do relatório CSV exportado pelo sistema coletor (MPrint) com
                  delimitador ponto-e-vírgula.
                </li>
                <li>
                  O STD fará a correspondência automática da Empresa/CNPJ e do Equipamento
                  cadastrados.
                </li>
                <li>
                  Você poderá conferir e ajustar as leituras, tarifas e associações manuais antes de
                  confirmar.
                </li>
                <li>
                  Faturas duplicadas são detectadas e protegidas automaticamente contra cobrança
                  repetida.
                </li>
                <li>
                  Ao confirmar, as faturas são emitidas e o odômetro de cada impressora é atualizado
                  no STD.
                </li>
              </ul>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50/40 rounded-xl p-8 text-center cursor-pointer transition-all space-y-3"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center mx-auto">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">
                  Clique para selecionar o relatório CSV do MPrint
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Arquivos .csv com cabeçalho (delimitador ponto-e-vírgula e campos entre aspas)
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs border-blue-300 text-blue-700"
              >
                Procurar no computador
              </Button>
            </div>
          </div>
        )}

        {/* ÁREA 2: Relatório de Conclusão após Faturar */}
        {relatorioResultado && (
          <div className="space-y-4 py-3 text-xs">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1">
              <h3 className="text-base font-bold flex items-center gap-2 text-emerald-800">
                <CheckCircle2 className="w-5 h-5" /> Faturamento em Lote Concluído!
              </h3>
              <p className="text-xs text-emerald-700">
                Os contadores dos equipamentos e as faturas do ciclo foram consolidados com sucesso.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-emerald-50/70 rounded-lg border border-emerald-200">
                <span className="text-[10.5px] uppercase font-bold text-emerald-700">
                  Faturas Criadas
                </span>
                <p className="text-2xl font-bold font-mono text-emerald-900">
                  {relatorioResultado.criadas}
                </p>
              </div>
              <div className="p-3 bg-amber-50/70 rounded-lg border border-amber-200">
                <span className="text-[10.5px] uppercase font-bold text-amber-700">Puladas</span>
                <p className="text-2xl font-bold font-mono text-amber-900">
                  {relatorioResultado.puladas}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-[10.5px] uppercase font-bold text-gray-600">Pendentes</span>
                <p className="text-2xl font-bold font-mono text-gray-800">
                  {relatorioResultado.pendentes}
                </p>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 border-b font-semibold text-gray-600">
                  <tr>
                    <th className="py-2.5 px-3">Cliente / Empresa</th>
                    <th className="py-2.5 px-3">Equipamento</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Motivo / Observação</th>
                    <th className="py-2.5 px-3 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {relatorioResultado.detalhes.map((d, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="py-2 px-3 font-semibold text-gray-900">{d.empresa}</td>
                      <td className="py-2 px-3 text-gray-700">{d.equipamento}</td>
                      <td className="py-2 px-3">
                        <Badge
                          variant="outline"
                          className={`text-[10px] capitalize ${
                            d.status === 'criada'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : d.status === 'pulada'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                          }`}
                        >
                          {d.status}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-gray-500">
                        {d.motivo || 'Faturada com sucesso'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-gray-900">
                        {d.valor ? formatCurrency(d.valor) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <DialogFooter className="pt-2">
              <Button onClick={handleClose} className="bg-blue-600 hover:bg-blue-700 text-white">
                Fechar e Ver Faturas
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* ÁREA 3: Prévia dos Registros com Matching Tolerante e Associação Manual */}
        {parseResult && !relatorioResultado && (
          <div className="space-y-4 py-2 text-xs">
            {/* Banner com Totais do Arquivo */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
              <div className="space-y-0.5">
                <span className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
                  <FileSpreadsheet className="w-4 h-4 text-blue-600" /> {arquivoNome}
                </span>
                <p className="text-[11px] text-gray-500">
                  {linhas.length} linha(s) de contagem •{' '}
                  {parseResult.totalConsolidadoCsv?.consumoPaginas
                    ? `Total Consolidado CSV: ${parseResult.totalConsolidadoCsv.consumoPaginas.toLocaleString('pt-BR')} páginas`
                    : ''}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleReprocessar}
                  className="h-8 text-xs text-gray-700"
                  title="Atualizar mapeamentos de clientes e impressoras"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1" /> Reprocessar Vínculos
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setParseResult(null)
                    setLinhas([])
                    setArquivoNome('')
                  }}
                  className="h-8 text-xs text-gray-700"
                >
                  Trocar Arquivo
                </Button>
              </div>
            </div>

            {/* Cards de Resumo */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-2.5 rounded-lg border bg-white shadow-2xs">
                <span className="text-[10px] text-gray-500 uppercase font-semibold">
                  Prontas para Faturar
                </span>
                <p className="text-xl font-bold font-mono text-emerald-700">{qtdProntas}</p>
                <span className="text-[10.5px] text-gray-400">Cliente e equip. vinculados</span>
              </div>

              <div className="p-2.5 rounded-lg border bg-white shadow-2xs">
                <span className="text-[10px] text-gray-500 uppercase font-semibold">
                  Pendentes de Vínculo
                </span>
                <p className="text-xl font-bold font-mono text-amber-600">{qtdPendentes}</p>
                <span className="text-[10.5px] text-gray-400">Associe manualmente abaixo</span>
              </div>

              <div className="p-2.5 rounded-lg border bg-white shadow-2xs">
                <span className="text-[10px] text-gray-500 uppercase font-semibold">
                  Duplicidades Detectadas
                </span>
                <p className="text-xl font-bold font-mono text-red-600">{qtdDuplicadas}</p>
                <span className="text-[10.5px] text-gray-400">Desmarcadas por padrão</span>
              </div>

              <div className="p-2.5 rounded-lg border bg-blue-50/70 border-blue-200 shadow-2xs">
                <span className="text-[10px] text-blue-700 uppercase font-semibold">
                  Total a Faturar
                </span>
                <p className="text-xl font-bold font-mono text-blue-900">
                  {formatCurrency(totalSelecionadoValor)}
                </p>
                <span className="text-[10.5px] text-blue-700">
                  {totalSelecionadoPaginas.toLocaleString('pt-BR')} páginas marcadas
                </span>
              </div>
            </div>

            {/* Barra de Filtros e Ações em Lote */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Button
                  type="button"
                  size="sm"
                  variant={filtroStatus === 'todas' ? 'default' : 'outline'}
                  onClick={() => setFiltroStatus('todas')}
                  className="h-7 text-xs"
                >
                  Todas ({linhas.length})
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={filtroStatus === 'prontas' ? 'default' : 'outline'}
                  onClick={() => setFiltroStatus('prontas')}
                  className="h-7 text-xs text-emerald-700"
                >
                  Prontas ({qtdProntas})
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={filtroStatus === 'pendentes' ? 'default' : 'outline'}
                  onClick={() => setFiltroStatus('pendentes')}
                  className="h-7 text-xs text-amber-700"
                >
                  Pendentes de Associação ({qtdPendentes})
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={filtroStatus === 'duplicadas' ? 'default' : 'outline'}
                  onClick={() => setFiltroStatus('duplicadas')}
                  className="h-7 text-xs text-red-700"
                >
                  Duplicadas ({qtdDuplicadas})
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleTodas(true)}
                  className="h-7 text-[11px] text-blue-700"
                >
                  Selecionar Válidas
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleTodas(false)}
                  className="h-7 text-[11px] text-gray-500"
                >
                  Desmarcar Todas
                </Button>
              </div>
            </div>

            {/* TABELA DE PRÉVIA */}
            <div className="border border-gray-200 rounded-lg overflow-x-auto max-h-[48vh]">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 sticky top-0 z-10 border-b font-semibold text-gray-600 shadow-2xs">
                  <tr>
                    <th className="py-2 px-2 text-center w-8">#</th>
                    <th className="py-2.5 px-3 min-w-[200px]">Empresa no CSV / STD</th>
                    <th className="py-2.5 px-3 min-w-[220px]">Equipamento no CSV / STD</th>
                    <th className="py-2.5 px-3 text-right">Cont. Inicial</th>
                    <th className="py-2.5 px-3 text-right">Cont. Final</th>
                    <th className="py-2.5 px-3 text-right font-bold text-gray-900">Consumo</th>
                    <th className="py-2.5 px-3 text-right min-w-[100px]">Valor/Pág (R$)</th>
                    <th className="py-2.5 px-3 text-right font-bold text-blue-900">Total</th>
                    <th className="py-2.5 px-3 min-w-[130px]">Status / Alertas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-sans">
                  {linhasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-gray-500">
                        Nenhuma linha encontrada para o filtro selecionado.
                      </td>
                    </tr>
                  ) : (
                    linhasFiltradas.map((linha) => {
                      const temPendencia = !linha.clienteId || !linha.equipamentoId
                      return (
                        <tr
                          key={linha.id}
                          className={`hover:bg-blue-50/30 transition-colors ${
                            linha.duplicada
                              ? 'bg-red-50/20'
                              : temPendencia
                                ? 'bg-amber-50/20'
                                : linha.selecionada
                                  ? 'bg-blue-50/10'
                                  : 'opacity-75'
                          }`}
                        >
                          {/* Checkbox de seleção */}
                          <td className="py-2 px-2 text-center">
                            <Checkbox
                              checked={linha.selecionada}
                              onCheckedChange={() => handleToggleSelecionada(linha.id)}
                              disabled={temPendencia}
                              title={
                                temPendencia
                                  ? 'Associe o cliente e o equipamento antes de faturar'
                                  : 'Marcar para gerar fatura'
                              }
                            />
                          </td>

                          {/* Cliente / Empresa */}
                          <td className="py-2 px-3">
                            <div className="space-y-1">
                              <span className="font-semibold text-gray-900 block leading-tight">
                                {linha.empresaRaw}
                              </span>
                              {linha.cnpjRaw && (
                                <span className="text-[10px] font-mono text-gray-400 block">
                                  CNPJ: {linha.cnpjRaw}
                                </span>
                              )}

                              {/* Associação do Cliente */}
                              {linha.clienteMatch ? (
                                <div className="flex items-center gap-1 mt-1">
                                  <Badge
                                    variant="outline"
                                    className={`text-[9.5px] px-1 py-0 ${
                                      linha.clienteStatus === 'exato'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                        : 'bg-blue-50 text-blue-700 border-blue-200'
                                    }`}
                                  >
                                    <Building2 className="w-2.5 h-2.5 mr-0.5" />
                                    {linha.clienteMatch.nome_razao_social}
                                  </Badge>
                                </div>
                              ) : (
                                <div className="pt-1">
                                  <Select
                                    value={linha.clienteId || ''}
                                    onValueChange={(val) =>
                                      handleAssociarClienteManual(linha.id, val)
                                    }
                                  >
                                    <SelectTrigger className="h-6 text-[10px] border-amber-400 bg-amber-50 text-amber-900 w-full">
                                      <SelectValue placeholder="Associar cliente manual..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {clientes.map((c) => (
                                        <SelectItem key={c.id} value={c.id} className="text-xs">
                                          {c.nome_razao_social}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Equipamento */}
                          <td className="py-2 px-3">
                            <div className="space-y-1">
                              <span className="font-semibold text-gray-900 block leading-tight">
                                {linha.equipamentoRaw}
                              </span>
                              <span className="text-[10px] text-gray-400 block font-mono">
                                Período: {linha.periodoRaw || formatMonthYear(linha.mesReferencia)}
                              </span>

                              {/* Associação de Equipamento */}
                              {linha.equipamentoMatch ? (
                                <div className="flex items-center gap-1 mt-1">
                                  <Badge
                                    variant="outline"
                                    className={`text-[9.5px] px-1 py-0 ${
                                      linha.equipamentoStatus === 'exato'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                        : 'bg-blue-50 text-blue-700 border-blue-200'
                                    }`}
                                  >
                                    <Printer className="w-2.5 h-2.5 mr-0.5" />
                                    {linha.equipamentoMatch.marca} {linha.equipamentoMatch.modelo} (
                                    {linha.equipamentoMatch.numero_serie})
                                  </Badge>
                                </div>
                              ) : (
                                <div className="pt-1">
                                  <Select
                                    value={linha.equipamentoId || ''}
                                    onValueChange={(val) =>
                                      handleAssociarEquipamentoManual(linha.id, val)
                                    }
                                  >
                                    <SelectTrigger className="h-6 text-[10px] border-amber-400 bg-amber-50 text-amber-900 w-full">
                                      <SelectValue placeholder="Associar equipamento..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {equipamentos.map((eq) => (
                                        <SelectItem key={eq.id} value={eq.id} className="text-xs">
                                          {eq.marca} {eq.modelo} — S/N: {eq.numero_serie}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Contador Inicial */}
                          <td className="py-2 px-3 text-right font-mono text-gray-600">
                            {linha.contadorInicial.toLocaleString('pt-BR')}
                          </td>

                          {/* Contador Final */}
                          <td className="py-2 px-3 text-right font-mono font-medium text-gray-900">
                            {linha.contadorFinal.toLocaleString('pt-BR')}
                          </td>

                          {/* Consumo Calculado */}
                          <td className="py-2 px-3 text-right font-mono font-bold text-gray-900">
                            {linha.consumoCalculado.toLocaleString('pt-BR')} págs
                          </td>

                          {/* Valor por Página (Editável) */}
                          <td className="py-2 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-[10px] text-gray-400">R$</span>
                              <Input
                                type="number"
                                step="0.001"
                                min="0"
                                value={linha.valorPorPagina}
                                onChange={(e) =>
                                  handleEditarValorPagina(linha.id, parseFloat(e.target.value) || 0)
                                }
                                className="h-6 w-16 text-right font-mono text-[11px] p-1 bg-white border-gray-300"
                                title={`Tarifa por página. Origem: ${linha.origemTarifa}`}
                              />
                            </div>
                            <span className="text-[9px] text-gray-400 block mt-0.5">
                              {linha.origemTarifa === 'contrato'
                                ? 'do contrato'
                                : linha.origemTarifa === 'manual'
                                  ? 'editado'
                                  : linha.origemTarifa === 'csv'
                                    ? 'do CSV'
                                    : 'padrão R$ 0,08'}
                            </span>
                          </td>

                          {/* Total Calculado */}
                          <td className="py-2 px-3 text-right font-mono font-bold text-blue-900">
                            {formatCurrency(linha.valorTotalCalculado)}
                          </td>

                          {/* Status / Alerta de Duplicidade */}
                          <td className="py-2 px-3">
                            {linha.duplicada ? (
                              <div className="space-y-0.5">
                                <Badge
                                  variant="outline"
                                  className="bg-red-50 text-red-700 border-red-300 text-[10px] flex items-center gap-1 w-fit"
                                >
                                  <AlertTriangle className="w-3 h-3 text-red-600" /> Já faturado
                                </Badge>
                                <span className="text-[10px] text-red-600 block line-clamp-1">
                                  {linha.motivoDuplicidade}
                                </span>
                              </div>
                            ) : temPendencia ? (
                              <Badge
                                variant="outline"
                                className="bg-amber-50 text-amber-700 border-amber-300 text-[10px] flex items-center gap-1 w-fit"
                              >
                                <AlertCircle className="w-3 h-3 text-amber-600" /> Requer vínculo
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px] flex items-center gap-1 w-fit"
                              >
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Pronto
                              </Badge>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Rodapé de Ações */}
            <DialogFooter className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t">
              <div className="text-xs text-gray-600">
                <span className="font-bold text-gray-900">
                  {linhas.filter((l) => l.selecionada).length} fatura(s) selecionada(s)
                </span>{' '}
                • Total previsto: {formatCurrency(totalSelecionadoValor)}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isCriandoFaturas}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmarImportacaoEFaturamento}
                  disabled={isCriandoFaturas || linhas.filter((l) => l.selecionada).length === 0}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 shadow-xs"
                >
                  <DollarSign className="w-4 h-4" />
                  {isCriandoFaturas ? 'Gerando Faturas...' : 'Confirmar e Faturar Lote'}
                </Button>
              </div>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
