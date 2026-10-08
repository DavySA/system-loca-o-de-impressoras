import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  ClipboardList,
  Building,
  Printer,
  Calendar,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Send,
  ExternalLink,
  PackagePlus,
  Trash2,
} from 'lucide-react'
import { ordensServicoService } from '@/services/ordensServico'
import { suprimentosService } from '@/services/suprimentos'
import { configuracoesService } from '@/services/configuracoes'
import {
  formatOSCode,
  formatDate,
  formatDateTime,
  formatCurrency,
  formatCnpjCpf,
} from '@/lib/formatters'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'
import { SignaturePad } from '@/components/SignaturePad'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Printer as PrintIcon, Wrench } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { OrdemServicoPrintDialog } from '@/components/OrdemServicoPrintDialog'
import type { OrdemServico, AtualizacaoOS, ConfiguracoesEmpresa, OSPeca, Suprimento } from '@/types'

export default function OrdemServicoDetalhe() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()

  const [ordem, setOrdem] = useState<OrdemServico | null>(null)
  const [atualizacoes, setAtualizacoes] = useState<AtualizacaoOS[]>([])
  const [ultimosAtendimentos, setUltimosAtendimentos] = useState<OrdemServico[]>([])
  const [pecasUtilizadas, setPecasUtilizadas] = useState<OSPeca[]>([])
  const [estoqueSuprimentos, setEstoqueSuprimentos] = useState<Suprimento[]>([])
  const [configEmpresa, setConfigEmpresa] = useState<ConfiguracoesEmpresa | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Dados Técnicos da OS: Contador atual e Parecer Técnico
  const [contadorAtual, setContadorAtual] = useState<number>(0)
  const [parecerTecnico, setParecerTecnico] = useState<string>('')
  const [assinaturaDataUrl, setAssinaturaDataUrl] = useState<string>('')
  const [assinaturaNome, setAssinaturaNome] = useState<string>('')
  const [assinaturaCpf, setAssinaturaCpf] = useState<string>('')
  const [isSavingDadosTecnicos, setIsSavingDadosTecnicos] = useState(false)

  // Modal / Formulário de Inserção de Peças com baixa automática
  const [isModalPecaOpen, setIsModalPecaOpen] = useState(false)
  const [pecaSelecionadaId, setPecaSelecionadaId] = useState<string>('')
  const [pecaQuantidade, setPecaQuantidade] = useState<number>(1)
  const [pecaValorCobrado, setPecaValorCobrado] = useState<number>(0)
  const [isSavingPeca, setIsSavingPeca] = useState(false)

  // Formulário nova atualização
  const [novoComentario, setNovoComentario] = useState('')
  const [novoStatus, setNovoStatus] = useState<
    'aberta' | 'em_andamento' | 'aguardando_peca' | 'concluida'
  >('em_andamento')
  const [isSubmittingUpdate, setIsSubmittingUpdate] = useState(false)

  // Modal Confirmação Concluir
  const [concluirModalOpen, setConcluirModalOpen] = useState(false)
  const [concluirComentario, setConcluirComentario] = useState('Serviço finalizado com sucesso.')
  const [tipoAtendimento, setTipoAtendimento] = useState<'contrato' | 'particular'>('contrato')
  const [valorServicoParticular, setValorServicoParticular] = useState<number>(0)

  // Modal Relatório de Impressão Dedicado
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false)

  const loadData = async () => {
    if (!id) return
    try {
      setIsLoading(true)
      const [os, atList, cfg, pecas, suprimentos] = await Promise.all([
        ordensServicoService.getById(id),
        ordensServicoService.getAtualizacoes(id),
        configuracoesService.get(),
        ordensServicoService.getPecas(id),
        suprimentosService.getAll(),
      ])
      setOrdem(os)
      setAtualizacoes(atList)
      setConfigEmpresa(cfg)
      setPecasUtilizadas(pecas)
      setEstoqueSuprimentos(suprimentos)
      setNovoStatus(os.status)
      setContadorAtual(
        os.contador_atual ||
          (os.expand?.equipamento_id?.contador_monocromatico || 0) +
            (os.expand?.equipamento_id?.contador_colorido || 0),
      )
      setParecerTecnico(os.parecer_tecnico || '')
      setAssinaturaDataUrl(os.assinatura_desenho || '')
      setAssinaturaNome(os.assinatura_nome || os.expand?.cliente_id?.nome_razao_social || '')
      setAssinaturaCpf(os.assinatura_cpf || '')
      setTipoAtendimento(os.tipo_atendimento || 'contrato')
      setValorServicoParticular(os.valor_servico || 0)

      if (os.equipamento_id) {
        try {
          const historico = await ordensServicoService.getAll(
            `equipamento_id = "${os.equipamento_id}" && id != "${os.id}"`,
          )
          setUltimosAtendimentos(historico.slice(0, 2))
        } catch {
          /* intentionally ignored */
        }
      }
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Ordem de serviço não encontrada',
        description: 'Não foi possível carregar esta O.S.',
      })
      navigate('/ordens-de-servico')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  useRealtime('ordens_servico', () => loadData())
  useRealtime('atualizacoes_os', () => loadData())
  useRealtime('os_pecas', () => loadData())
  useRealtime('suprimentos', () => loadData())

  const handleAddAtualizacao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !novoComentario.trim()) return

    setIsSubmittingUpdate(true)
    try {
      await ordensServicoService.addAtualizacao(
        id,
        user?.name || 'Administrador',
        novoComentario,
        novoStatus,
      )
      setNovoComentario('')
      toast({
        title: 'Atualização adicionada',
        description: 'Linha do tempo atualizada com sucesso.',
      })
      loadData()
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Erro ao adicionar atualização',
        description: 'Tente novamente.',
      })
    } finally {
      setIsSubmittingUpdate(false)
    }
  }

  const handleSalvarDadosTecnicos = async () => {
    if (!id) return
    setIsSavingDadosTecnicos(true)
    try {
      await ordensServicoService.update(id, {
        contador_atual: Number(contadorAtual),
        parecer_tecnico: parecerTecnico,
        assinatura_desenho: assinaturaDataUrl,
        assinatura_nome: assinaturaNome,
        assinatura_cpf: assinaturaCpf,
      })
      toast({
        title: 'Dados da O.S. salvos com sucesso',
        description:
          'Contador, parecer técnico e assinatura do cliente com Nome e CPF atualizados.',
      })
      loadData()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar dados',
        description: err.message || 'Tente novamente.',
      })
    } finally {
      setIsSavingDadosTecnicos(false)
    }
  }

  const handlePrint = () => {
    setIsPrintDialogOpen(true)
  }

  const handleConfirmarConclusao = async () => {
    if (!id) return
    try {
      // Calcular valor de peças e total particular se aplicável
      const totalPecasValor = pecasUtilizadas.reduce(
        (acc, p) => acc + (p.valor_cobrado || p.custo_unitario || 0) * p.quantidade,
        0,
      )
      const totalParticular =
        tipoAtendimento === 'particular'
          ? (Number(valorServicoParticular) || 0) + totalPecasValor
          : 0

      // Salvar dados técnicos, tipo de atendimento, valores de serviço e peças, técnico vinculado
      await ordensServicoService.update(id, {
        contador_atual: Number(contadorAtual),
        parecer_tecnico: parecerTecnico || concluirComentario,
        assinatura_desenho: assinaturaDataUrl,
        assinatura_nome: assinaturaNome,
        assinatura_cpf: assinaturaCpf,
        tipo_atendimento: tipoAtendimento,
        valor_servico: tipoAtendimento === 'particular' ? Number(valorServicoParticular) || 0 : 0,
        valor_pecas: totalPecasValor,
        valor_total_particular: totalParticular,
        tecnico_user_id: user?.id,
      })
      await ordensServicoService.marcarConcluida(
        id,
        user?.name || 'Administrador',
        concluirComentario,
      )
      toast({
        title: 'Ordem de Serviço concluída!',
        description: 'Status alterado para Concluída e dados arquivados.',
      })
      setConcluirModalOpen(false)
      loadData()
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Erro ao concluir O.S.',
        description: 'Tente novamente.',
      })
    }
  }

  // Gerenciamento de Peças e Baixa Automática
  const handleAdicionarPeca = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !pecaSelecionadaId) {
      toast({
        variant: 'destructive',
        title: 'Selecione uma peça',
        description: 'Escolha um item de suprimento do estoque.',
      })
      return
    }

    const sup = estoqueSuprimentos.find((s) => s.id === pecaSelecionadaId)
    if (!sup) return

    if ((sup.quantidade || 0) < pecaQuantidade) {
      toast({
        variant: 'destructive',
        title: 'Estoque insuficiente',
        description: `O estoque atual deste item é de apenas ${sup.quantidade} unidade(s).`,
      })
      return
    }

    setIsSavingPeca(true)
    try {
      await ordensServicoService.adicionarPeca({
        os_id: id,
        suprimento_id: pecaSelecionadaId,
        descricao_item: sup.item,
        quantidade: Number(pecaQuantidade),
        custo_unitario: sup.custo || 0,
        valor_cobrado: Number(pecaValorCobrado) || sup.valor_venda || sup.custo || 0,
      })

      // Adicionar atualização na timeline informando a baixa
      await ordensServicoService.addAtualizacao(
        id,
        user?.name || 'Técnico',
        `Peça aplicada: ${sup.item} (Qtd: ${pecaQuantidade}). Baixa automática realizada no estoque de Suprimentos.`,
        ordem?.status || 'em_andamento',
      )

      toast({
        title: 'Peça adicionada à O.S.!',
        description: `Baixa de ${pecaQuantidade} unidade(s) efetuada no estoque de Suprimentos com sucesso.`,
      })
      setIsModalPecaOpen(false)
      setPecaSelecionadaId('')
      setPecaQuantidade(1)
      setPecaValorCobrado(0)
      loadData()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao adicionar peça',
        description: err.message || 'Tente novamente.',
      })
    } finally {
      setIsSavingPeca(false)
    }
  }

  const handleRemoverPeca = async (pecaId: string, descricao: string, qtd: number) => {
    if (
      !confirm(
        `Deseja remover a peça "${descricao}" desta O.S.? A quantidade de ${qtd} unidade(s) será automaticamente devolvida ao estoque de Suprimentos.`,
      )
    )
      return

    try {
      await ordensServicoService.removerPeca(pecaId)
      if (id) {
        await ordensServicoService.addAtualizacao(
          id,
          user?.name || 'Sistema',
          `Peça removida da O.S.: ${descricao} (Qtd: ${qtd}). Quantidade devolvida ao estoque de Suprimentos.`,
          ordem?.status || 'em_andamento',
        )
      }
      toast({
        title: 'Peça removida',
        description: `Quantidade de ${qtd} unidade(s) restaurada no estoque de suprimentos.`,
      })
      loadData()
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao remover peça',
        description: 'Não foi possível remover e restaurar o estoque.',
      })
    }
  }

  if (isLoading) {
    return <div className="py-12 text-center text-sm text-gray-500">Carregando O.S....</div>
  }

  if (!ordem) return null

  const cliente = ordem.expand?.cliente_id
  const equipamento = ordem.expand?.equipamento_id
  const servico = ordem.expand?.servico_id

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'aberta':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            Aberta
          </span>
        )
      case 'em_andamento':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            Em Andamento
          </span>
        )
      case 'aguardando_peca':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Aguardando Peça
          </span>
        )
      case 'concluida':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Concluída
          </span>
        )
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
            {status}
          </span>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/ordens-de-servico')}
            className="h-9 w-9 p-0"
            title="Voltar"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight font-mono">
                {formatOSCode(ordem.id)}
              </h1>
              {getStatusBadge(ordem.status)}
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                  ordem.prioridade === 'alta'
                    ? 'bg-red-100 text-red-800'
                    : ordem.prioridade === 'media'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-gray-100 text-gray-700'
                }`}
              >
                Prioridade {ordem.prioridade}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Aberta em: {formatDate(ordem.data_abertura || ordem.created)} • Técnico:{' '}
              <strong>{ordem.tecnico_responsavel || 'Não atribuído'}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 print:hidden">
          <Button
            variant="outline"
            onClick={handlePrint}
            className="flex items-center gap-1.5 border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <PrintIcon className="w-4 h-4 text-blue-600" /> Imprimir O.S.
          </Button>

          {/* Botão Marcar como Concluída visível quando status for diferente de concluída */}
          {ordem.status !== 'concluida' && (
            <Button
              onClick={() => setConcluirModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4" /> Marcar como Concluída
            </Button>
          )}
        </div>
      </div>

      {/* CABEÇALHO DE IMPRESSÃO (Visível apenas na impressão ou estilizado) */}
      <div className="hidden print:block border-b-2 border-gray-800 pb-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {configEmpresa?.logo && (
              <img
                src={configuracoesService.getLogoUrl(configEmpresa) || ''}
                alt="Logo Empresa"
                className="h-16 w-auto object-contain max-w-[180px]"
              />
            )}
            <div>
              <h2 className="text-xl font-bold uppercase text-gray-900">
                {configEmpresa?.razao_social || 'PrintGest Locações'}
              </h2>
              {configEmpresa?.nome_fantasia && (
                <p className="text-xs text-gray-600">{configEmpresa.nome_fantasia}</p>
              )}
              <p className="text-xs text-gray-500">
                CNPJ: {configEmpresa?.cnpj || '-'}
                {configEmpresa?.inscricao_estadual
                  ? ` • IE: ${configEmpresa.inscricao_estadual}`
                  : ''}
              </p>
              <p className="text-xs text-gray-500">
                {configEmpresa?.endereco || ''} • Tel: {configEmpresa?.telefone || '-'} • E-mail:{' '}
                {configEmpresa?.email || '-'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="border-2 border-gray-900 px-4 py-2 text-center rounded">
              <span className="block text-[10px] uppercase font-bold text-gray-600">
                Comprovante de Atendimento
              </span>
              <span className="text-xl font-mono font-bold text-gray-900">
                {formatOSCode(ordem.id)}
              </span>
            </div>
            <span className="text-[11px] text-gray-500 block mt-1">
              Data: {formatDate(ordem.data_abertura || ordem.created)}
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Cliente e Equipamento (Clicáveis) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card Cliente */}
        <Card
          onClick={() => cliente && navigate(`/clientes/${cliente.id}`)}
          className="border border-gray-200 shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all cursor-pointer group"
        >
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1.5">
              <Building className="w-4 h-4 text-blue-600" /> Cliente
            </span>
            <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
          </CardHeader>
          <CardContent className="space-y-1">
            <h3 className="text-base font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
              {cliente?.nome_razao_social || 'Cliente não encontrado'}
            </h3>
            <p className="text-xs text-gray-500">Doc: {cliente?.documento || '-'}</p>
            <p className="text-xs text-gray-500">
              Contato: {cliente?.telefone || cliente?.email || '-'}
            </p>
          </CardContent>
        </Card>

        {/* Card Equipamento */}
        <Card
          onClick={() => equipamento && navigate(`/equipamentos/${equipamento.id}`)}
          className="border border-gray-200 shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all cursor-pointer group"
        >
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1.5">
              <Printer className="w-4 h-4 text-blue-600" /> Equipamento
            </span>
            <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
          </CardHeader>
          <CardContent className="space-y-1">
            <h3 className="text-base font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
              {equipamento
                ? `${equipamento.marca} ${equipamento.modelo}`
                : 'Equipamento não encontrado'}
            </h3>
            <p className="text-xs font-mono text-gray-500">
              S/N: {equipamento?.numero_serie || '-'}
            </p>
            <p className="text-xs text-gray-500">
              Status: <span className="capitalize">{equipamento?.status.replace('_', ' ')}</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Descrição do Problema */}
      <Card className="border border-gray-200 shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-900">
            Descrição do Problema / Solicitação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
            {ordem.descricao_problema}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100 text-xs">
            <div>
              <span className="text-gray-400 block font-medium">Serviço do Catálogo:</span>
              <span className="text-gray-800 font-semibold">
                {servico?.nome || 'Não especificado'}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block font-medium">Data Agendada:</span>
              <span className="text-gray-800 font-semibold">
                {ordem.data_agendada ? formatDate(ordem.data_agendada) : 'Não agendada'}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block font-medium">Data de Conclusão:</span>
              <span className="text-gray-800 font-semibold">
                {ordem.data_conclusao ? formatDateTime(ordem.data_conclusao) : 'Pendente'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Parecer Técnico e Contador Atual */}
      <Card className="border border-gray-200 shadow-xs">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-blue-600" /> Parecer Técnico & Leitura do Contador
            </CardTitle>
            <p className="text-xs text-gray-500 mt-0.5">
              Informe a leitura atual do contador e o diagnóstico técnico do atendimento
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleSalvarDadosTecnicos}
            disabled={isSavingDadosTecnicos}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs print:hidden"
          >
            {isSavingDadosTecnicos ? 'Salvando...' : 'Salvar Dados'}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="contador-os" className="text-xs font-semibold text-gray-700">
                Contador Atual da Impressora:
              </Label>
              <Input
                id="contador-os"
                type="number"
                min={0}
                value={contadorAtual}
                onChange={(e) => setContadorAtual(Number(e.target.value))}
                className="font-mono text-base font-bold text-gray-900"
                placeholder="Ex: 45200"
              />
              <span className="text-[11px] text-gray-400">
                Contador anterior:{' '}
                {(
                  (equipamento?.contador_monocromatico || 0) + (equipamento?.contador_colorido || 0)
                ).toLocaleString('pt-BR')}
              </span>
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="parecer-tec" className="text-xs font-semibold text-gray-700">
                Parecer Técnico / Solução Aplicada:
              </Label>
              <Textarea
                id="parecer-tec"
                rows={2}
                value={parecerTecnico}
                onChange={(e) => setParecerTecnico(e.target.value)}
                placeholder="Ex: Troca do rolete de tração realizada, limpeza da unidade óptica e testes de impressão 100% aprovados."
                className="text-xs sm:text-sm"
              />
            </div>
          </div>

          {/* Peças e Suprimentos Utilizados nesta O.S. (com baixa automática) */}
          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  <PackagePlus className="w-4 h-4 text-blue-600" /> Peças & Suprimentos Utilizados
                </h4>
                <p className="text-[11px] text-gray-500">
                  Ao registrar peças utilizadas, é dada baixa automática imediata no estoque de
                  Suprimentos.
                </p>
              </div>
              {ordem.status !== 'concluida' && (
                <Button
                  size="sm"
                  type="button"
                  onClick={() => setIsModalPecaOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 flex items-center gap-1"
                >
                  <PackagePlus className="w-3.5 h-3.5" /> Adicionar Peça / Insumo
                </Button>
              )}
            </div>

            {pecasUtilizadas.length === 0 ? (
              <div className="p-3 bg-gray-50 rounded-lg border border-dashed border-gray-200 text-center text-xs text-gray-500">
                Nenhuma peça ou suprimento registrado nesta O.S. ainda.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-left text-xs bg-white">
                  <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                    <tr>
                      <th className="py-2 px-3">Peça / Insumo</th>
                      <th className="py-2 px-3 text-center">Quantidade</th>
                      <th className="py-2 px-3 text-right">Custo Unitário</th>
                      <th className="py-2 px-3 text-right">Valor Cobrado</th>
                      <th className="py-2 px-3 text-right">Total</th>
                      {ordem.status !== 'concluida' && (
                        <th className="py-2 px-3 text-right">Ação</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pecasUtilizadas.map((p) => {
                      const totalPeca = (p.valor_cobrado || p.custo_unitario || 0) * p.quantidade
                      return (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="py-2.5 px-3 font-semibold text-gray-900">
                            {p.descricao_item}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-medium">
                            {p.quantidade}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-gray-600">
                            {formatCurrency(p.custo_unitario || 0)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-gray-600">
                            {formatCurrency(p.valor_cobrado || 0)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-900">
                            {formatCurrency(totalPeca)}
                          </td>
                          {ordem.status !== 'concluida' && (
                            <td className="py-2.5 px-3 text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                type="button"
                                onClick={() =>
                                  handleRemoverPeca(p.id, p.descricao_item, p.quantidade)
                                }
                                className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                title="Remover e devolver ao estoque"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Assinatura no display + Nome e CPF */}
          <div className="pt-4 border-t border-gray-200 space-y-3">
            <div>
              <Label className="text-xs font-semibold text-gray-700 block mb-1">
                Assinatura do Cliente / Recebedor do Chamado:
              </Label>
              <p className="text-[11px] text-gray-500 mb-2">
                Preencha o Nome e CPF da pessoa que assinou a O.S. para que constem no comprovante e
                na impressão permanente.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
              <div className="space-y-1">
                <Label htmlFor="as-nome" className="text-xs font-medium text-gray-700">
                  Nome de quem assinou *
                </Label>
                <Input
                  id="as-nome"
                  value={assinaturaNome}
                  onChange={(e) => setAssinaturaNome(e.target.value)}
                  placeholder="Nome completo do recebedor"
                  className="text-xs bg-white"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="as-cpf" className="text-xs font-medium text-gray-700">
                  CPF de quem assinou *
                </Label>
                <Input
                  id="as-cpf"
                  value={assinaturaCpf}
                  onChange={(e) => setAssinaturaCpf(formatCnpjCpf(e.target.value))}
                  placeholder="000.000.000-00"
                  className="text-xs bg-white font-mono"
                />
              </div>
            </div>

            <div className="max-w-md">
              <SignaturePad
                initialDataUrl={assinaturaDataUrl}
                onSave={(dataUrl) => setAssinaturaDataUrl(dataUrl)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Histórico: Dois Últimos Atendimentos deste Equipamento */}
      <Card className="border border-gray-200 shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600" /> Últimos 2 Atendimentos Deste Equipamento
          </CardTitle>
          <p className="text-xs text-gray-500 mt-0.5">
            Histórico prévio com pareceres técnicos e contadores registrados anteriormente
          </p>
        </CardHeader>
        <CardContent>
          {ultimosAtendimentos.length === 0 ? (
            <p className="text-xs text-gray-500 py-3 italic">
              Nenhum atendimento anterior encontrado para este equipamento.
            </p>
          ) : (
            <div className="space-y-3">
              {ultimosAtendimentos.map((ant, idx) => (
                <div
                  key={ant.id}
                  className="p-3 rounded-lg border border-gray-200 bg-gray-50/70 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-700 font-mono">
                      Atendimento #{idx + 1}: {formatOSCode(ant.id)}
                    </span>
                    <span className="text-gray-500">
                      {formatDate(ant.data_conclusao || ant.data_abertura || ant.created)} •{' '}
                      <strong>{ant.tecnico_responsavel || 'Técnico'}</strong>
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Problema: </span>
                    <span className="text-gray-600">{ant.descricao_problema}</span>
                  </div>
                  {ant.parecer_tecnico && (
                    <div className="bg-white p-2 rounded border border-gray-200">
                      <span className="font-semibold text-gray-800">Parecer Técnico: </span>
                      <span className="text-gray-700">{ant.parecer_tecnico}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-[11px] text-gray-500 pt-1">
                    <span>
                      Contador registrado:{' '}
                      <strong className="text-gray-800 font-mono">
                        {ant.contador_atual
                          ? ant.contador_atual.toLocaleString('pt-BR')
                          : 'Não informado'}
                      </strong>
                    </span>
                    <span>
                      Status: <strong className="capitalize">{ant.status}</strong>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ÁREA DE ASSINATURA PARA IMPRESSÃO (Folha de Papel) */}
      <div className="hidden print:block mt-8 pt-8 border-t border-gray-400">
        <div className="grid grid-cols-2 gap-12 text-center text-xs">
          <div>
            {assinaturaDataUrl ? (
              <img
                src={assinaturaDataUrl}
                alt="Assinatura Digital"
                className="h-16 mx-auto object-contain mb-1"
              />
            ) : (
              <div className="h-16 border-b border-gray-800 mb-1" />
            )}
            <p className="font-semibold text-gray-900">{cliente?.nome_razao_social || 'Cliente'}</p>
            <p className="text-[11px] text-gray-500">Assinatura do Responsável / Recebedor</p>
          </div>

          <div>
            <div className="h-16 border-b border-gray-800 mb-1" />
            <p className="font-semibold text-gray-900">
              {ordem.tecnico_responsavel || 'Técnico Autorizado'}
            </p>
            <p className="text-[11px] text-gray-500">Técnico TD Technology System ERP</p>
          </div>
        </div>

        {configEmpresa?.mensagem_rodape && (
          <p className="text-center text-[10px] text-gray-400 mt-6 italic">
            {configEmpresa.mensagem_rodape}
          </p>
        )}
      </div>

      {/* Linha do Tempo de Atualizações */}
      <Card className="border border-gray-200 shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" /> Histórico de Atualizações
          </CardTitle>
          <p className="text-xs text-gray-500 mt-0.5">
            Registro cronológico e imutável de eventos, mudanças de status e pareceres técnicos
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Adicionar atualização */}
          {ordem.status !== 'concluida' && (
            <form
              onSubmit={handleAddAtualizacao}
              className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3"
            >
              <span className="text-xs font-semibold text-gray-700 uppercase block">
                Adicionar atualização / parecer técnico
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <Textarea
                    placeholder="Descreva o procedimento realizado, diagnóstico ou pendência..."
                    rows={2}
                    value={novoComentario}
                    onChange={(e) => setNovoComentario(e.target.value)}
                    required
                    className="text-xs sm:text-sm bg-white"
                  />
                </div>

                <div className="space-y-2 flex flex-col justify-between">
                  <div>
                    <Label htmlFor="st-up" className="text-xs text-gray-600">
                      Alterar status para:
                    </Label>
                    <Select value={novoStatus} onValueChange={(val: any) => setNovoStatus(val)}>
                      <SelectTrigger id="st-up" className="h-9 text-xs bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aberta">Aberta</SelectItem>
                        <SelectItem value="em_andamento">Em Andamento</SelectItem>
                        <SelectItem value="aguardando_peca">Aguardando Peça</SelectItem>
                        <SelectItem value="concluida">Concluída</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmittingUpdate}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs h-9 flex items-center justify-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {isSubmittingUpdate ? 'Registrando...' : 'Registrar'}
                  </Button>
                </div>
              </div>
            </form>
          )}

          {/* Timeline Feed */}
          <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
            {atualizacoes.length === 0 ? (
              <p className="text-xs text-gray-500 py-4">Nenhum evento registrado ainda.</p>
            ) : (
              atualizacoes.map((at) => (
                <div key={at.id} className="relative group">
                  {/* Dot */}
                  <div className="absolute -left-6 top-1.5 w-4 h-4 rounded-full bg-white border-2 border-blue-600 group-hover:scale-110 transition-transform" />

                  <div className="bg-white p-3.5 rounded-lg border border-gray-200 shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{at.autor}</span>
                        <span className="text-[11px] px-2 py-0.2 rounded font-medium bg-gray-100 text-gray-700 border">
                          Status: {at.status_na_ocasiao}
                        </span>
                      </div>
                      <span className="text-gray-400 text-[11px]">
                        {formatDateTime(at.created)}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                      {at.comentario}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal de Adicionar Peça / Insumo com Baixa de Estoque */}
      <Dialog open={isModalPecaOpen} onOpenChange={setIsModalPecaOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <PackagePlus className="w-5 h-5 text-blue-600" /> Adicionar Peça / Insumo à O.S.
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAdicionarPeca} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="peca-select" className="text-xs font-medium text-gray-700">
                Item de Suprimento (Estoque Disponível) *
              </Label>
              <select
                id="peca-select"
                value={pecaSelecionadaId}
                onChange={(e) => {
                  const selId = e.target.value
                  setPecaSelecionadaId(selId)
                  const sup = estoqueSuprimentos.find((s) => s.id === selId)
                  if (sup) {
                    setPecaValorCobrado(sup.valor_venda || sup.custo || 0)
                  }
                }}
                required
                className="w-full text-xs rounded-md border border-gray-300 p-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="">Selecione a peça ou insumo...</option>
                {estoqueSuprimentos.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.item} (Estoque: {s.quantidade} un. | Custo: {formatCurrency(s.custo)})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="peca-qtd" className="text-xs font-medium text-gray-700">
                  Quantidade a Usar *
                </Label>
                <Input
                  id="peca-qtd"
                  type="number"
                  min="1"
                  value={pecaQuantidade}
                  onChange={(e) => setPecaQuantidade(Math.max(1, parseInt(e.target.value) || 1))}
                  required
                  className="text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="peca-valor" className="text-xs font-medium text-gray-700">
                  Valor Cobrado Un. (R$)
                </Label>
                <Input
                  id="peca-valor"
                  type="number"
                  step="0.01"
                  min="0"
                  value={pecaValorCobrado}
                  onChange={(e) => setPecaValorCobrado(parseFloat(e.target.value) || 0)}
                  className="text-xs font-mono"
                />
              </div>
            </div>

            <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-200 text-[11.5px] text-blue-900 leading-relaxed">
              ℹ️ <strong>Baixa Automática:</strong> Ao confirmar, o sistema reduzirá
              instantaneamente <strong>{pecaQuantidade} unidade(s)</strong> do estoque de
              Suprimentos.
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalPecaOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSavingPeca}
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSavingPeca ? 'Gravando e Baixando...' : 'Confirmar e Dar Baixa'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Marcar como Concluída */}
      <Dialog open={concluirModalOpen} onOpenChange={setConcluirModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="w-5 h-5" /> Concluir Ordem de Serviço
            </DialogTitle>
          </DialogHeader>

          <div className="py-2 space-y-3 text-sm">
            <p className="text-gray-600">
              Deseja marcar esta O.S. como concluída? O encerramento ficará registrado com timestamp
              atual.
            </p>

            {/* Atendimento Particular vs Coberto por Contrato */}
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2 text-xs">
              <Label className="font-semibold text-gray-800 block">
                Tipo de Cobrança do Atendimento:
              </Label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="tipoAtendimento"
                    value="contrato"
                    checked={tipoAtendimento === 'contrato'}
                    onChange={() => setTipoAtendimento('contrato')}
                  />
                  <span>Franquia / Contrato de Locação</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="tipoAtendimento"
                    value="particular"
                    checked={tipoAtendimento === 'particular'}
                    onChange={() => setTipoAtendimento('particular')}
                  />
                  <span className="font-semibold text-blue-700">
                    Particular (Serviço + Peças à parte)
                  </span>
                </label>
              </div>

              {tipoAtendimento === 'particular' && (
                <div className="pt-2 border-t border-gray-200 space-y-2">
                  <div className="space-y-1">
                    <Label htmlFor="val-serv" className="text-[11px] font-medium text-gray-700">
                      Mão de Obra / Valor do Serviço (R$):
                    </Label>
                    <Input
                      id="val-serv"
                      type="number"
                      step="0.01"
                      value={valorServicoParticular}
                      onChange={(e) => setValorServicoParticular(parseFloat(e.target.value) || 0)}
                      className="text-xs font-mono"
                    />
                  </div>
                  <div className="text-[11px] text-gray-600 flex justify-between bg-white p-2 rounded border">
                    <span>Peças aplicadas nesta O.S.:</span>
                    <strong className="font-mono">
                      {formatCurrency(
                        pecasUtilizadas.reduce(
                          (acc, p) =>
                            acc + (p.valor_cobrado || p.custo_unitario || 0) * p.quantidade,
                          0,
                        ),
                      )}
                    </strong>
                  </div>
                  <div className="text-xs text-blue-900 font-bold flex justify-between pt-1">
                    <span>Total do Atendimento Particular:</span>
                    <span className="font-mono text-emerald-700">
                      {formatCurrency(
                        (Number(valorServicoParticular) || 0) +
                          pecasUtilizadas.reduce(
                            (acc, p) =>
                              acc + (p.valor_cobrado || p.custo_unitario || 0) * p.quantidade,
                            0,
                          ),
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="parecer-fin" className="text-xs font-medium text-gray-700">
                Parecer de Conclusão:
              </Label>
              <Textarea
                id="parecer-fin"
                rows={3}
                value={concluirComentario}
                onChange={(e) => setConcluirComentario(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConcluirModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmarConclusao}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Confirmar Conclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Impressão Dedicado com HTML Isolado */}
      <OrdemServicoPrintDialog
        open={isPrintDialogOpen}
        onOpenChange={setIsPrintDialogOpen}
        ordem={ordem}
        configEmpresa={configEmpresa}
        ultimosAtendimentos={ultimosAtendimentos}
      />
    </div>
  )
}
