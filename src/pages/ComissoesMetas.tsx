import React, { useState, useEffect } from 'react'
import {
  Target,
  Trophy,
  TrendingUp,
  Plus,
  Users,
  Award,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  Pencil,
  Trash2,
  BarChart3,
  DollarSign,
  Briefcase,
  Layers,
  Wrench,
  Percent,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'
import { metasService, type ProgressoMetaCalculado } from '@/services/metas'
import { usuariosService } from '@/services/usuarios'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { MetaColaborador, AppUser, PeriodoMeta, MetricaMeta, StatusMeta } from '@/types'

const METRICAS_LABELS: Record<MetricaMeta, { label: string; icon: any; isCurrency: boolean }> = {
  vendas_insumos_grafica: {
    label: 'Vendas & Insumos Gráfica Rápida (R$)',
    icon: Layers,
    isCurrency: true,
  },
  servicos_grafica: {
    label: 'Serviços Prestados da Gráfica (R$)',
    icon: Briefcase,
    isCurrency: true,
  },
  os_particulares: {
    label: 'O.S. Particulares (Serviço + Peças R$)',
    icon: Wrench,
    isCurrency: true,
  },
  atendimentos_concluidos: {
    label: 'Total de Atendimentos de O.S. Concluídos (Qtd)',
    icon: CheckCircle2,
    isCurrency: false,
  },
  faturamento_gerado: {
    label: 'Faturamento de Locação Gerado (R$)',
    icon: DollarSign,
    isCurrency: true,
  },
}

export default function ComissoesMetas() {
  const { user } = useAuth()
  const { toast } = useToast()
  const isAdmin = user?.role === 'administrador'

  const [metas, setMetas] = useState<MetaColaborador[]>([])
  const [progressos, setProgressos] = useState<Record<string, ProgressoMetaCalculado>>({})
  const [usuarios, setUsuarios] = useState<AppUser[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filtros
  const [colaboradorFiltro, setColaboradorFiltro] = useState<string>('todos')
  const [periodoFiltro, setPeriodoFiltro] = useState<string>('todos')

  // Modal Criação / Edição de Meta (Admin)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [metaEditando, setMetaEditando] = useState<MetaColaborador | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const hoje = new Date()
  const mesAtualPadrao = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`

  const [formData, setFormData] = useState<{
    user_id: string
    titulo: string
    periodo: PeriodoMeta
    mes_ano_referencia: string
    data_inicio: string
    data_fim: string
    tipo_metrica: MetricaMeta
    valor_objetivo: number
    tipo_comissao: 'percentual' | 'valor_fixo'
    valor_comissao: number
    status: StatusMeta
    observacoes: string
  }>({
    user_id: '',
    titulo: '',
    periodo: 'mensal',
    mes_ano_referencia: mesAtualPadrao,
    data_inicio: '',
    data_fim: '',
    tipo_metrica: 'vendas_insumos_grafica',
    valor_objetivo: 5000,
    tipo_comissao: 'percentual',
    valor_comissao: 5,
    status: 'em_andamento',
    observacoes: '',
  })

  const loadData = async () => {
    try {
      setIsLoading(true)
      // Se for admin, carrega todas as metas e a lista de colaboradores
      // Se for colaborador/operador/técnico, busca apenas as suas
      let metasList: MetaColaborador[] = []
      if (isAdmin) {
        const [mList, uList] = await Promise.all([
          metasService.getMetas(),
          usuariosService.getAll(),
        ])
        metasList = mList
        setUsuarios(uList.filter((u) => u.role !== 'cliente'))
      } else if (user?.id) {
        metasList = await metasService.getMetasPorUsuario(user.id)
      }

      setMetas(metasList)

      // Calcular o progresso em tempo real de cada meta
      const progMap: Record<string, ProgressoMetaCalculado> = {}
      for (const m of metasList) {
        try {
          const prog = await metasService.calcularProgresso(m)
          progMap[m.id] = prog
        } catch (e) {
          console.warn('Erro ao calcular progresso da meta', m.id, e)
        }
      }
      setProgressos(progMap)
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar metas',
        description: e.message || 'Não foi possível carregar os dados de desempenho.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user])

  useRealtime('metas', () => loadData())
  useRealtime('grafica_vendas', () => loadData())
  useRealtime('ordens_servico', () => loadData())
  useRealtime('faturas', () => loadData())

  const handleOpenCriar = () => {
    setMetaEditando(null)
    setFormData({
      user_id: usuarios[0]?.id || '',
      titulo: 'Meta Mensal de Vendas e Serviços',
      periodo: 'mensal',
      mes_ano_referencia: mesAtualPadrao,
      data_inicio: '',
      data_fim: '',
      tipo_metrica: 'vendas_insumos_grafica',
      valor_objetivo: 5000,
      tipo_comissao: 'percentual',
      valor_comissao: 5,
      status: 'em_andamento',
      observacoes: '',
    })
    setIsModalOpen(true)
  }

  const handleOpenEditar = (meta: MetaColaborador) => {
    setMetaEditando(meta)
    setFormData({
      user_id: meta.user_id,
      titulo: meta.titulo,
      periodo: meta.periodo,
      mes_ano_referencia: meta.mes_ano_referencia || mesAtualPadrao,
      data_inicio: meta.data_inicio || '',
      data_fim: meta.data_fim || '',
      tipo_metrica: meta.tipo_metrica,
      valor_objetivo: meta.valor_objetivo,
      tipo_comissao: meta.tipo_comissao || 'percentual',
      valor_comissao: meta.valor_comissao || 0,
      status: meta.status,
      observacoes: meta.observacoes || '',
    })
    setIsModalOpen(true)
  }

  const handleDeleteMeta = async (id: string, titulo: string) => {
    if (!confirm(`Deseja excluir a meta "${titulo}"?`)) return
    try {
      await metasService.delete(id)
      toast({ title: 'Meta excluída com sucesso' })
      loadData()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir meta',
        description: err.message || 'Tente novamente.',
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.user_id) {
      toast({
        variant: 'destructive',
        title: 'Colaborador obrigatório',
        description: 'Selecione um usuário para vincular a meta.',
      })
      return
    }

    setIsSaving(true)
    try {
      if (metaEditando) {
        await metasService.update(metaEditando.id, formData)
        toast({ title: 'Meta atualizada com sucesso!' })
      } else {
        await metasService.create(formData)
        toast({ title: 'Nova meta cadastrada com sucesso!' })
      }
      setIsModalOpen(false)
      loadData()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar meta',
        description: err.message || 'Verifique as informações preenchidas.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Filtragem das metas exibidas
  const metasFiltradas = metas.filter((m) => {
    if (colaboradorFiltro !== 'todos' && m.user_id !== colaboradorFiltro) return false
    if (periodoFiltro !== 'todos' && m.periodo !== periodoFiltro) return false
    return true
  })

  // Ranking de colaboradores para Admin
  const rankingColaboradores = usuarios
    .map((colab) => {
      const metasDoColab = metas.filter((m) => m.user_id === colab.id)
      const totalObjetivo = metasDoColab.reduce((acc, m) => acc + (m.valor_objetivo || 0), 0)
      const totalAlcancado = metasDoColab.reduce((acc, m) => {
        const prog = progressos[m.id]
        return acc + (prog?.valor_alcancado || 0)
      }, 0)
      const metasAtingidas = metasDoColab.filter((m) => progressos[m.id]?.atingida).length
      const totalComissao = metasDoColab.reduce((acc, m) => {
        const prog = progressos[m.id]
        return acc + (prog?.comissao_estimada || 0)
      }, 0)

      return {
        usuario: colab,
        metasCount: metasDoColab.length,
        metasAtingidas,
        totalObjetivo,
        totalAlcancado,
        totalComissao,
        aproveitamentoGeral:
          totalObjetivo > 0 ? Math.min(100, Math.round((totalAlcancado / totalObjetivo) * 100)) : 0,
      }
    })
    .filter((r) => r.metasCount > 0)
    .sort((a, b) => b.totalAlcancado - a.totalAlcancado)

  // Totais do Usuário Logado
  const minhasMetas = metas.filter((m) => m.user_id === user?.id)
  const totalMinhaComissao = minhasMetas.reduce((acc, m) => {
    return acc + (progressos[m.id]?.comissao_estimada || 0)
  }, 0)
  const metasBatidasCount = minhasMetas.filter((m) => progressos[m.id]?.atingida).length

  return (
    <div className="space-y-6">
      {/* Topo / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <Target className="w-6 h-6 text-amber-600" />
              {isAdmin ? 'Comissões & Metas da Equipe' : 'Minhas Metas & Desempenho'}
            </h1>
            <Badge
              variant="outline"
              className="bg-amber-50 text-amber-800 border-amber-300 font-semibold"
            >
              {isAdmin ? 'Gestão Corporativa' : 'Painel do Colaborador'}
            </Badge>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {isAdmin
              ? 'Defina objetivos para operadores e técnicos, monitore o progresso em tempo real e apure comissões.'
              : 'Acompanhe suas metas de produção, serviços concluídos e comissões acumuladas no ciclo vigente.'}
          </p>
        </div>

        {isAdmin && (
          <Button
            onClick={handleOpenCriar}
            className="bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" /> Nova Meta de Colaborador
          </Button>
        )}
      </div>

      {/* CARDS RESUMO / KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-gray-200 shadow-xs">
          <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">
              {isAdmin ? 'Total de Metas Ativas' : 'Minhas Metas Ativas'}
            </span>
            <Target className="w-4 h-4 text-amber-600" />
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-bold text-gray-900">
              {isAdmin ? metas.length : minhasMetas.length}
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {isAdmin
                ? `${metas.filter((m) => progressos[m.id]?.atingida).length} metas já batidas`
                : `${metasBatidasCount} de ${minhasMetas.length} batidas`}
            </p>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-xs">
          <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">
              {isAdmin ? 'Comissões Estimadas Totais' : 'Minha Comissão Estimada'}
            </span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-bold text-emerald-700 font-mono">
              {isAdmin
                ? formatCurrency(
                    metas.reduce((acc, m) => acc + (progressos[m.id]?.comissao_estimada || 0), 0),
                  )
                : formatCurrency(totalMinhaComissao)}
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Calculada com base na produção apurada
            </p>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-xs">
          <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">
              {isAdmin ? 'Média de Atingimento' : 'Aproveitamento Geral'}
            </span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-bold text-blue-900">
              {(() => {
                const targetMetas = isAdmin ? metas : minhasMetas
                if (targetMetas.length === 0) return '0%'
                const avg = Math.round(
                  targetMetas.reduce((acc, m) => acc + (progressos[m.id]?.percentual || 0), 0) /
                    targetMetas.length,
                )
                return `${avg}%`
              })()}
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">Progresso médio no período</p>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-xs">
          <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">
              {isAdmin ? 'Líder do Período' : 'Status Atual'}
            </span>
            <Trophy className="w-4 h-4 text-yellow-600" />
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-base font-bold text-gray-900 truncate">
              {isAdmin
                ? rankingColaboradores[0]?.usuario.name || 'Em apuração'
                : metasBatidasCount > 0
                  ? '🌟 Meta Superada!'
                  : 'Em Andamento'}
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {isAdmin
                ? rankingColaboradores[0]
                  ? `${rankingColaboradores[0].aproveitamentoGeral}% de aproveitamento`
                  : 'Sem dados no ciclo'
                : `${minhasMetas.length - metasBatidasCount} meta(s) em aberto`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* RANKING SIMPLES DE COLABORADORES (Visível para Admin) */}
      {isAdmin && rankingColaboradores.length > 0 && (
        <Card className="border border-gray-200 shadow-xs bg-linear-to-r from-amber-50/40 via-white to-blue-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-600" /> Ranking de Desempenho dos Colaboradores
            </CardTitle>
            <CardDescription className="text-xs text-gray-500">
              Classificação geral baseada no volume produzido e faturado pela equipe
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {rankingColaboradores.map((item, idx) => (
                <div
                  key={item.usuario.id}
                  className="bg-white p-3 rounded-lg border border-gray-200 shadow-2xs flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                        idx === 0
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : idx === 1
                            ? 'bg-gray-200 text-gray-800'
                            : idx === 2
                              ? 'bg-amber-50 text-amber-900'
                              : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      #{idx + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-xs text-gray-900">{item.usuario.name}</p>
                      <p className="text-[10.5px] text-gray-500 capitalize">{item.usuario.role}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-xs font-bold text-emerald-700 block">
                      {formatCurrency(item.totalAlcancado)}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      {item.metasAtingidas}/{item.metasCount} metas ({item.aproveitamentoGeral}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* FILTROS (ADMIN) */}
      {isAdmin && (
        <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-lg border border-gray-200 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
            <Users className="w-4 h-4 text-gray-500" /> Filtrar por:
          </div>

          <select
            value={colaboradorFiltro}
            onChange={(e) => setColaboradorFiltro(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 py-1 text-xs shadow-2xs"
          >
            <option value="todos">Todos os Colaboradores</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role})
              </option>
            ))}
          </select>

          <select
            value={periodoFiltro}
            onChange={(e) => setPeriodoFiltro(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 py-1 text-xs shadow-2xs"
          >
            <option value="todos">Todos os Períodos</option>
            <option value="mensal">Mensal</option>
            <option value="trimestral">Trimestral</option>
            <option value="semestral">Semestral</option>
            <option value="anual">Anual</option>
          </select>
        </div>
      )}

      {/* LISTAGEM DE METAS */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          {isAdmin ? 'Metas Definidas' : 'Minhas Metas no Período'} ({metasFiltradas.length})
        </h2>

        {isLoading ? (
          <div className="py-12 text-center text-sm text-gray-500">
            Calculando progresso e metas...
          </div>
        ) : metasFiltradas.length === 0 ? (
          <div className="p-8 text-center bg-gray-50 border border-dashed border-gray-300 rounded-lg space-y-2">
            <Target className="w-8 h-8 text-gray-400 mx-auto" />
            <p className="text-sm font-semibold text-gray-700">Nenhuma meta encontrada.</p>
            <p className="text-xs text-gray-500">
              {isAdmin
                ? 'Clique no botão acima para cadastrar a primeira meta da equipe.'
                : 'Você ainda não possui metas atribuídas para este ciclo.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {metasFiltradas.map((meta) => {
              const prog = progressos[meta.id]
              const metricaInfo = METRICAS_LABELS[meta.tipo_metrica] || {
                label: meta.tipo_metrica,
                icon: Target,
                isCurrency: true,
              }
              const IconeMetrica = metricaInfo.icon || Target
              const colabNome = meta.expand?.user_id?.name || 'Colaborador'
              const colabRole = meta.expand?.user_id?.role || 'Usuário'

              return (
                <Card
                  key={meta.id}
                  className={`border shadow-xs transition-all hover:shadow-md ${
                    prog?.atingida
                      ? 'border-emerald-300 bg-emerald-50/15'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-gray-900">{meta.titulo}</span>
                          {prog?.atingida && (
                            <Badge className="bg-emerald-600 text-white text-[10px] h-5">
                              BATIDA 🎉
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-gray-400" />
                          <strong className="text-gray-800">{colabNome}</strong> ({colabRole}) •{' '}
                          <span className="capitalize">{meta.periodo}</span>
                          {meta.mes_ano_referencia ? ` (${meta.mes_ano_referencia})` : ''}
                        </p>
                      </div>

                      {isAdmin && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditar(meta)}
                            className="h-7 w-7 p-0 text-gray-500 hover:text-blue-600"
                            title="Editar Meta"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteMeta(meta.id, meta.titulo)}
                            className="h-7 w-7 p-0 text-gray-500 hover:text-red-600"
                            title="Excluir Meta"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-gray-700">
                        <IconeMetrica className="w-4 h-4 text-blue-600" />
                        <span className="font-medium">{metricaInfo.label}</span>
                      </div>
                      <Badge variant="outline" className="font-mono text-[11px] bg-white">
                        Alvo:{' '}
                        {metricaInfo.isCurrency
                          ? formatCurrency(meta.valor_objetivo)
                          : `${meta.valor_objetivo} atendimentos`}
                      </Badge>
                    </div>

                    {/* Barra de Progresso */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600 font-medium">Progresso Atual:</span>
                        <span className="font-mono font-bold text-gray-900">
                          {prog ? `${prog.percentual}%` : 'Calculando...'}
                        </span>
                      </div>
                      <Progress
                        value={prog?.percentual || 0}
                        className={`h-2.5 ${
                          prog?.atingida ? '[&>div]:bg-emerald-600' : '[&>div]:bg-blue-600'
                        }`}
                      />
                      <div className="flex items-center justify-between text-[11px] text-gray-500 font-mono">
                        <span>
                          Alcançado:{' '}
                          <strong className="text-gray-900">
                            {metricaInfo.isCurrency
                              ? formatCurrency(prog?.valor_alcancado || 0)
                              : `${prog?.valor_alcancado || 0} un.`}
                          </strong>
                        </span>
                        <span>
                          Faltam:{' '}
                          <strong
                            className={prog?.atingida ? 'text-emerald-700' : 'text-amber-700'}
                          >
                            {prog?.atingida
                              ? 'Objetivo cumprido!'
                              : metricaInfo.isCurrency
                                ? formatCurrency(prog?.valor_restante || 0)
                                : `${prog?.valor_restante || 0} un.`}
                          </strong>
                        </span>
                      </div>
                    </div>

                    {/* Comissão / Premiação */}
                    {meta.valor_comissao ? (
                      <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs bg-amber-50/50 p-2 rounded border border-amber-200/60">
                        <span className="text-amber-900 flex items-center gap-1 font-medium">
                          <Percent className="w-3.5 h-3.5 text-amber-700" />
                          Regra de Comissão:{' '}
                          {meta.tipo_comissao === 'percentual'
                            ? `${meta.valor_comissao}% sobre produção`
                            : `Fixo de ${formatCurrency(meta.valor_comissao)}`}
                        </span>
                        <span className="font-mono font-bold text-emerald-800">
                          +{formatCurrency(prog?.comissao_estimada || 0)}
                        </span>
                      </div>
                    ) : null}

                    {meta.observacoes && (
                      <p className="text-[11px] text-gray-500 italic pt-1">{meta.observacoes}</p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* MODAL CRIAÇÃO / EDIÇÃO DE META (ADMIN) */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Target className="w-5 h-5 text-amber-600" />
              {metaEditando ? 'Editar Meta de Colaborador' : 'Nova Meta de Desempenho'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="m-colab">Colaborador Vinculado *</Label>
                <select
                  id="m-colab"
                  value={formData.user_id}
                  onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                  required
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-2xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Selecione o operador ou técnico...</option>
                  {usuarios.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} — {u.email} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="m-titulo">Título da Meta *</Label>
                <Input
                  id="m-titulo"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  required
                  placeholder="Ex: Meta Balcão de Vendas - Gráfica"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="m-periodo">Período</Label>
                <select
                  id="m-periodo"
                  value={formData.periodo}
                  onChange={(e) =>
                    setFormData({ ...formData, periodo: e.target.value as PeriodoMeta })
                  }
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-2xs"
                >
                  <option value="mensal">Mensal</option>
                  <option value="trimestral">Trimestral</option>
                  <option value="semestral">Semestral</option>
                  <option value="anual">Anual</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="m-mesref">Mês / Ano Referência</Label>
                <Input
                  id="m-mesref"
                  type="month"
                  value={formData.mes_ano_referencia}
                  onChange={(e) => setFormData({ ...formData, mes_ano_referencia: e.target.value })}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="m-metrica">Métrica de Apuração *</Label>
                <select
                  id="m-metrica"
                  value={formData.tipo_metrica}
                  onChange={(e) =>
                    setFormData({ ...formData, tipo_metrica: e.target.value as MetricaMeta })
                  }
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-2xs"
                >
                  <option value="vendas_insumos_grafica">
                    Vendas & Insumos da Gráfica Rápida (PDV/Balcão)
                  </option>
                  <option value="servicos_grafica">Serviços Especiais de Impressão</option>
                  <option value="os_particulares">
                    O.S. Particulares (Serviço + Peças à Parte)
                  </option>
                  <option value="atendimentos_concluidos">
                    Quantidade de Atendimentos de O.S. Concluídos
                  </option>
                  <option value="faturamento_gerado">Faturamento de Locação Gerado</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="m-objetivo">Valor / Quantidade Objetivo *</Label>
                <Input
                  id="m-objetivo"
                  type="number"
                  step="0.01"
                  min="1"
                  value={formData.valor_objetivo}
                  onChange={(e) =>
                    setFormData({ ...formData, valor_objetivo: parseFloat(e.target.value) || 0 })
                  }
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="m-comissao-tipo">Tipo de Comissão</Label>
                <select
                  id="m-comissao-tipo"
                  value={formData.tipo_comissao}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tipo_comissao: e.target.value as 'percentual' | 'valor_fixo',
                    })
                  }
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-2xs"
                >
                  <option value="percentual">Percentual (%) sobre o valor</option>
                  <option value="valor_fixo">Bônus Fixo (R$) ao bater a meta</option>
                </select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="m-comissao-val">
                  {formData.tipo_comissao === 'percentual'
                    ? 'Percentual de Comissão (%)'
                    : 'Valor do Bônus Fixo (R$)'}
                </Label>
                <Input
                  id="m-comissao-val"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.valor_comissao}
                  onChange={(e) =>
                    setFormData({ ...formData, valor_comissao: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="m-obs">Observações e Orientações</Label>
                <Textarea
                  id="m-obs"
                  rows={2}
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  placeholder="Orientações e regras de validação para o colaborador..."
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {isSaving ? 'Salvando...' : 'Salvar Meta'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
