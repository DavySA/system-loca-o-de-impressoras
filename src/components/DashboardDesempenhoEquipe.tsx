import React, { useState, useEffect } from 'react'
import {
  Users,
  Target,
  Wrench,
  DollarSign,
  Briefcase,
  Layers,
  CheckCircle2,
  TrendingUp,
  Percent,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { formatCurrency } from '@/lib/formatters'
import pb from '@/lib/pocketbase/client'
import type { AppUser, MetaColaborador } from '@/types'

interface DesempenhoColaborador {
  user: AppUser
  vendasGraficaValor: number
  vendasGraficaQtd: number
  osParticularesValor: number
  osTotalConcluidas: number
  faturamentoGerado: number
  metas: MetaColaborador[]
  metasAtingidasCount: number
  progressoMedioMetas: number
}

export function DashboardDesempenhoEquipe() {
  const [loading, setLoading] = useState(true)
  const [colaboradores, setColaboradores] = useState<DesempenhoColaborador[]>([])

  const hoje = new Date()
  const mesAtualStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
  const [periodoSelecionado, setPeriodoSelecionado] = useState<string>(mesAtualStr)

  const loadDesempenho = async () => {
    try {
      setLoading(true)

      // 1. Carregar colaboradores internos (administrador, operador, tecnico)
      const users = await pb.collection('users').getFullList<AppUser>({
        filter: 'role != "cliente"',
        sort: 'name',
      })

      // 2. Carregar vendas da gráfica no período
      const dataInicio = `${periodoSelecionado}-01 00:00:00`
      const dataFim = `${periodoSelecionado}-31 23:59:59`
      const vendas = await pb.collection('grafica_vendas').getFullList({
        filter: `data_hora >= "${dataInicio}" && data_hora <= "${dataFim}"`,
      })

      // 3. Carregar O.S. concluídas no período
      const oss = await pb.collection('ordens_servico').getFullList({
        filter: `status = "concluida" && data_conclusao >= "${dataInicio}" && data_conclusao <= "${dataFim}"`,
      })

      // 4. Carregar faturas do período
      const faturas = await pb.collection('faturas').getFullList({
        filter: `mes_referencia = "${periodoSelecionado}" && status != "cancelada"`,
      })

      // 5. Carregar metas vinculadas aos colaboradores
      const metas = await pb.collection('metas').getFullList<MetaColaborador>({
        sort: '-created',
      })

      // Montar resumo consolidado por operador/técnico
      const lista: DesempenhoColaborador[] = users.map((u) => {
        // Vendas do operador
        const vendasDoUser = vendas.filter((v: any) => v.operador_user_id === u.id)
        const vendasGraficaValor = vendasDoUser.reduce(
          (acc, v: any) => acc + (v.valor_total || 0),
          0,
        )
        const vendasGraficaQtd = vendasDoUser.reduce((acc, v: any) => acc + (v.quantidade || 0), 0)

        // O.S. atendidas pelo técnico
        const osDoUser = oss.filter((o: any) => o.tecnico_user_id === u.id)
        const osTotalConcluidas = osDoUser.length
        const osParticulares = osDoUser.filter((o: any) => o.tipo_atendimento === 'particular')
        const osParticularesValor = osParticulares.reduce(
          (acc, o: any) =>
            acc + (o.valor_total_particular || (o.valor_servico || 0) + (o.valor_pecas || 0)),
          0,
        )

        // Faturas geradas pelo usuário
        const fatDoUser = faturas.filter((f: any) => f.criado_por_user_id === u.id)
        const faturamentoGerado = fatDoUser.reduce((acc, f: any) => acc + (f.valor_total || 0), 0)

        // Metas do colaborador
        const metasDoUser = metas.filter((m) => m.user_id === u.id)
        let totalPercentual = 0
        let atingidasCount = 0

        metasDoUser.forEach((m) => {
          let alcancado = 0
          if (m.tipo_metrica === 'vendas_insumos_grafica') alcancado = vendasGraficaValor
          else if (m.tipo_metrica === 'servicos_grafica') alcancado = vendasGraficaValor
          else if (m.tipo_metrica === 'os_particulares') alcancado = osParticularesValor
          else if (m.tipo_metrica === 'atendimentos_concluidos') alcancado = osTotalConcluidas
          else if (m.tipo_metrica === 'faturamento_gerado') alcancado = faturamentoGerado

          const pct = Math.min(100, Math.round((alcancado / (m.valor_objetivo || 1)) * 100))
          totalPercentual += pct
          if (alcancado >= (m.valor_objetivo || 1)) atingidasCount++
        })

        const progressoMedioMetas =
          metasDoUser.length > 0 ? Math.round(totalPercentual / metasDoUser.length) : 0

        return {
          user: u,
          vendasGraficaValor,
          vendasGraficaQtd,
          osParticularesValor,
          osTotalConcluidas,
          faturamentoGerado,
          metas: metasDoUser,
          metasAtingidasCount: atingidasCount,
          progressoMedioMetas,
        }
      })

      // Ordenar por volume total de atividade decrescente
      lista.sort(
        (a, b) =>
          b.vendasGraficaValor +
          b.osParticularesValor +
          b.faturamentoGerado -
          (a.vendasGraficaValor + a.osParticularesValor + a.faturamentoGerado),
      )

      setColaboradores(lista)
    } catch (e) {
      console.warn('Erro ao carregar desempenho da equipe:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDesempenho()
  }, [periodoSelecionado])

  return (
    <Card className="border border-gray-200 shadow-xs bg-white">
      <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-100">
        <div>
          <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" /> Desempenho da Equipe por Operador & Técnico
          </CardTitle>
          <CardDescription className="text-xs text-gray-500">
            Acompanhamento em tempo real de vendas de balcão, O.S. concluídas, faturamento e
            cumprimento de metas
          </CardDescription>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">Ciclo:</span>
          <input
            type="month"
            value={periodoSelecionado}
            onChange={(e) => setPeriodoSelecionado(e.target.value)}
            className="h-8 px-2 rounded-md border border-gray-200 text-xs bg-gray-50 font-mono"
          />
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-3">
        {loading ? (
          <div className="py-8 text-center text-xs text-gray-500">
            Carregando indicadores da equipe...
          </div>
        ) : colaboradores.length === 0 ? (
          <div className="py-6 text-center text-xs text-gray-500">
            Nenhum colaborador registrado.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {colaboradores.map((item) => (
              <div
                key={item.user.id}
                className="bg-gray-50/60 rounded-xl p-3.5 border border-gray-200 shadow-2xs space-y-3 hover:bg-gray-50 transition-colors"
              >
                {/* Cabeçalho do Colaborador */}
                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center uppercase">
                      {item.user.name?.slice(0, 2) || 'OP'}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-900 leading-tight">
                        {item.user.name}
                      </h4>
                      <p className="text-[10px] text-gray-500 capitalize">{item.user.role}</p>
                    </div>
                  </div>

                  <Badge
                    variant="outline"
                    className={`text-[10px] font-semibold ${
                      item.progressoMedioMetas >= 100
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : item.progressoMedioMetas > 50
                          ? 'bg-blue-50 text-blue-800 border-blue-300'
                          : 'bg-gray-100 text-gray-700 border-gray-300'
                    }`}
                  >
                    {item.progressoMedioMetas}% das metas
                  </Badge>
                </div>

                {/* Métricas Principais */}
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-white p-2 rounded border border-gray-200">
                    <span className="text-[10px] text-gray-500 block uppercase font-medium">
                      Gráfica (Balcão)
                    </span>
                    <span className="font-bold text-gray-900 font-mono text-xs">
                      {formatCurrency(item.vendasGraficaValor)}
                    </span>
                    <span className="text-[9.5px] text-gray-400 block">
                      {item.vendasGraficaQtd} itens vendidos
                    </span>
                  </div>

                  <div className="bg-white p-2 rounded border border-gray-200">
                    <span className="text-[10px] text-gray-500 block uppercase font-medium">
                      O.S. Particulares
                    </span>
                    <span className="font-bold text-blue-900 font-mono text-xs">
                      {formatCurrency(item.osParticularesValor)}
                    </span>
                    <span className="text-[9.5px] text-gray-400 block">
                      Serviço + Peças à parte
                    </span>
                  </div>

                  <div className="bg-white p-2 rounded border border-gray-200">
                    <span className="text-[10px] text-gray-500 block uppercase font-medium">
                      Atendimentos O.S.
                    </span>
                    <span className="font-bold text-emerald-700 font-mono text-xs">
                      {item.osTotalConcluidas} concluídos
                    </span>
                    <span className="text-[9.5px] text-gray-400 block">No período do ciclo</span>
                  </div>

                  <div className="bg-white p-2 rounded border border-gray-200">
                    <span className="text-[10px] text-gray-500 block uppercase font-medium">
                      Faturamento Gerado
                    </span>
                    <span className="font-bold text-gray-900 font-mono text-xs">
                      {formatCurrency(item.faturamentoGerado)}
                    </span>
                    <span className="text-[9.5px] text-gray-400 block">Locações processadas</span>
                  </div>
                </div>

                {/* Status das Metas */}
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between items-center text-[10.5px]">
                    <span className="text-gray-600 font-medium flex items-center gap-1">
                      <Target className="w-3 h-3 text-amber-600" /> Cumprimento de Metas:
                    </span>
                    <span className="font-bold text-gray-900">
                      {item.metasAtingidasCount}/{item.metas.length} batida(s)
                    </span>
                  </div>
                  <Progress
                    value={item.progressoMedioMetas}
                    className="h-2 bg-gray-200 [&>div]:bg-amber-500"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default DashboardDesempenhoEquipe
