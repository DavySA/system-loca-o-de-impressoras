import React from 'react'
import type {
  GraficaCaixa,
  GraficaCaixaContador,
  GraficaVenda,
  ConfiguracoesEmpresa,
  Equipamento,
} from '@/types'
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatCnpjCpf,
  formatPhone,
} from '@/lib/formatters'
import { configuracoesService } from '@/services/configuracoes'
import defaultLogo from '@/assets/logo-png-copia-13bb2.png'

interface CaixaCupomRelatorioProps {
  caixa: GraficaCaixa
  contadores?: GraficaCaixaContador[]
  vendas?: GraficaVenda[]
  configEmpresa: ConfiguracoesEmpresa | null
  formato?: 'bobina' | 'a5'
}

// Determina se o equipamento imprime em cores com base no campo ou contadores
function isEquipamentoColorido(eq?: Equipamento | null): boolean {
  if (!eq) return false
  if (eq.colorida !== undefined) return Boolean(eq.colorida)
  return (eq.contador_colorido || 0) > 0
}

export function CaixaCupomRelatorio({
  caixa,
  contadores = [],
  vendas = [],
  configEmpresa,
  formato = 'bobina',
}: CaixaCupomRelatorioProps) {
  const logoSrc = configEmpresa?.logo ? configuracoesService.getLogoUrl(configEmpresa) : defaultLogo

  // Equipamentos vinculados ao caixa: multi-equipamento (equipamentos_ids) com fallback para equipamento único legado
  const equipamentosVinculados: Equipamento[] = React.useMemo(() => {
    if (caixa.expand?.equipamentos_ids && caixa.expand.equipamentos_ids.length > 0) {
      return caixa.expand.equipamentos_ids
    }
    if (caixa.expand?.equipamento_id) {
      return [caixa.expand.equipamento_id]
    }
    // Caso contadores carreguem o equipamento expandido
    const equipsDosContadores = contadores
      .map((c) => c.expand?.equipamento_id)
      .filter((e): e is Equipamento => Boolean(e))
    if (equipsDosContadores.length > 0) {
      // Remover duplicatas
      const map = new Map<string, Equipamento>()
      equipsDosContadores.forEach((eq) => map.set(eq.id, eq))
      return Array.from(map.values())
    }
    return []
  }, [caixa, contadores])

  // Totais de vendas e custos
  const totalEntradas =
    caixa.total_entradas ?? vendas.reduce((acc, v) => acc + (v.valor_total || 0), 0)
  const totalCustos =
    caixa.total_custo_insumos ?? vendas.reduce((acc, v) => acc + (v.custo_total || 0), 0)
  const lucroTotal = caixa.lucro_total ?? totalEntradas - totalCustos

  // Totais por forma de pagamento
  const pagamentosMap: Record<string, number> = {}
  vendas.forEach((v) => {
    const forma = v.forma_pagamento || 'dinheiro'
    pagamentosMap[forma] = (pagamentosMap[forma] || 0) + (v.valor_total || 0)
  })

  // Insumos movimentados (saídas e baixas)
  const totalInsumosQtd = vendas.reduce((acc, v) => acc + (v.quantidade || 0), 0)

  // Conferência de gaveta
  const saldoInicial = caixa.saldo_inicial || 0
  const dinheiroVendas = pagamentosMap['dinheiro'] || 0
  const esperadoGaveta = saldoInicial + dinheiroVendas
  const informadoGaveta = caixa.saldo_final_dinheiro ?? esperadoGaveta
  const diferencaGaveta = informadoGaveta - esperadoGaveta

  // Totais consolidados de produção física apurados entre todos os equipamentos
  const consolidadoProducao = React.useMemo(() => {
    if (contadores.length > 0) {
      let totAberturaMono = 0
      let totFechamentoMono = 0
      let totDeltaMono = 0

      let totAberturaColor = 0
      let totFechamentoColor = 0
      let totDeltaColor = 0

      let totAberturaCopias = 0
      let totFechamentoCopias = 0
      let totDeltaCopias = 0

      let totAberturaScanner = 0
      let totFechamentoScanner = 0
      let totDeltaScanner = 0

      contadores.forEach((c) => {
        const abM = c.abertura_mono || 0
        const fcM = c.fechamento_mono ?? abM
        const dM = c.delta_mono ?? Math.max(0, fcM - abM)
        totAberturaMono += abM
        totFechamentoMono += fcM
        totDeltaMono += dM

        const abC = c.abertura_color || 0
        const fcC = c.fechamento_color ?? abC
        const dC = c.delta_color ?? Math.max(0, fcC - abC)
        totAberturaColor += abC
        totFechamentoColor += fcC
        totDeltaColor += dC

        const abCp = c.abertura_copias || 0
        const fcCp = c.fechamento_copias ?? abCp
        const dCp = c.delta_copias ?? Math.max(0, fcCp - abCp)
        totAberturaCopias += abCp
        totFechamentoCopias += fcCp
        totDeltaCopias += dCp

        const abSc = c.abertura_scanner || 0
        const fcSc = c.fechamento_scanner ?? abSc
        const dSc = c.delta_scanner ?? Math.max(0, fcSc - abSc)
        totAberturaScanner += abSc
        totFechamentoScanner += fcSc
        totDeltaScanner += dSc
      })

      return {
        totAberturaMono,
        totFechamentoMono,
        totDeltaMono,
        totAberturaColor,
        totFechamentoColor,
        totDeltaColor,
        totAberturaCopias,
        totFechamentoCopias,
        totDeltaCopias,
        totAberturaScanner,
        totFechamentoScanner,
        totDeltaScanner,
        totGeralProducao: totDeltaMono + totDeltaColor,
      }
    }

    // Fallback legado com dados acumulados no próprio caixa
    const abM = caixa.contador_abertura_mono || 0
    const fcM = caixa.contador_fechamento_mono ?? abM
    const dM = caixa.producao_mono ?? Math.max(0, fcM - abM)

    const abC = caixa.contador_abertura_color || 0
    const fcC = caixa.contador_fechamento_color ?? abC
    const dC = caixa.producao_color ?? Math.max(0, fcC - abC)

    return {
      totAberturaMono: abM,
      totFechamentoMono: fcM,
      totDeltaMono: dM,
      totAberturaColor: abC,
      totFechamentoColor: fcC,
      totDeltaColor: dC,
      totAberturaCopias: 0,
      totFechamentoCopias: 0,
      totDeltaCopias: 0,
      totAberturaScanner: 0,
      totFechamentoScanner: 0,
      totDeltaScanner: 0,
      totGeralProducao: dM + dC,
    }
  }, [caixa, contadores])

  const containerClasses =
    formato === 'bobina' ? 'max-w-[420px] p-5 text-[11px]' : 'max-w-[560px] p-6 text-[12px]'

  return (
    <div
      className={`bg-white text-gray-900 mx-auto font-mono leading-tight border border-gray-300 shadow-sm print:border-none print:shadow-none print:p-2 print:max-w-none ${containerClasses}`}
    >
      {/* CABEÇALHO */}
      <div className="text-center border-b-2 border-dashed border-gray-800 pb-3 mb-3">
        <div className="w-20 h-12 mx-auto flex items-center justify-center mb-1">
          <img src={logoSrc} alt="Logo" className="max-h-12 max-w-[130px] object-contain" />
        </div>
        <h1 className="font-bold text-xs uppercase tracking-tight text-gray-900">
          {configEmpresa?.razao_social || 'STD'}
        </h1>
        {configEmpresa?.nome_fantasia && (
          <p className="text-[10px] text-gray-700">{configEmpresa.nome_fantasia}</p>
        )}
        <p className="text-[9.5px] text-gray-600">
          CNPJ: {formatCnpjCpf(configEmpresa?.cnpj) || '-'} • Tel:{' '}
          {formatPhone(configEmpresa?.telefone) || '-'}
        </p>
        {configEmpresa?.endereco && (
          <p className="text-[9px] text-gray-500">
            {configEmpresa.endereco}
            {configEmpresa.cidade ? ` - ${configEmpresa.cidade}/${configEmpresa.uf}` : ''}
          </p>
        )}
        <div className="mt-2 pt-1 border-t border-gray-400">
          <span className="font-bold text-xs uppercase tracking-wider block">
            *** FECHAMENTO DE CAIXA — GRÁFICA RÁPIDA ***
          </span>
          <span className="text-[10px] text-gray-700 font-semibold block">
            CUPOM MULTI-EQUIPAMENTO COM LEITURA INDIVIDUAL
          </span>
        </div>
      </div>

      {/* DADOS GERAIS DO CAIXA */}
      <div className="border-b border-dashed border-gray-600 pb-2 mb-2 space-y-1">
        <div className="flex justify-between">
          <span className="text-gray-600">IDENTIFICADOR:</span>
          <span className="font-bold">#{caixa.id.slice(0, 8).toUpperCase()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">OPERADOR:</span>
          <span className="font-bold uppercase">{caixa.operador || 'Não informado'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">DATA REFERÊNCIA:</span>
          <span className="font-semibold">{formatDate(caixa.data)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">ABERTURA:</span>
          <span>{formatDateTime(caixa.data_abertura || caixa.created)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">FECHAMENTO:</span>
          <span>{caixa.data_fechamento ? formatDateTime(caixa.data_fechamento) : 'Em aberto'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">STATUS:</span>
          <span className="font-bold uppercase">
            {caixa.status === 'fechado' ? '[FECHADO - IMUTÁVEL]' : '[ABERTO]'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">PARQUE EM OPERAÇÃO:</span>
          <span className="font-bold">
            {equipamentosVinculados.length > 0
              ? `${equipamentosVinculados.length} equipamento(s)`
              : contadores.length > 0
                ? `${contadores.length} equipamento(s)`
                : '1 equipamento (legado)'}
          </span>
        </div>
      </div>

      {/* LISTA DE EQUIPAMENTOS EM OPERAÇÃO */}
      <div className="border-b border-dashed border-gray-600 pb-2 mb-2">
        <div className="flex justify-between items-center mb-1">
          <span className="font-bold block uppercase text-[10.5px]">
            &gt;&gt; EQUIPAMENTOS DO CAIXA (
            {equipamentosVinculados.length || contadores.length || 1})
          </span>
          <span className="text-[9.5px] text-gray-500 uppercase font-semibold">
            {formato === 'bobina' ? '80mm' : 'A5 Ficha'}
          </span>
        </div>
        {equipamentosVinculados.length > 0 ? (
          <div className="space-y-1">
            {equipamentosVinculados.map((eq, idx) => (
              <div
                key={eq.id || idx}
                className="bg-gray-50/70 p-1 rounded border border-gray-200 text-[10px]"
              >
                <div className="flex justify-between font-bold text-gray-900">
                  <span>
                    #{idx + 1} {eq.marca} {eq.modelo}
                  </span>
                  <span
                    className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-semibold ${
                      isEquipamentoColorido(eq)
                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {isEquipamentoColorido(eq) ? 'Color' : 'Mono'}
                  </span>
                </div>
                <div className="flex justify-between text-[9px] text-gray-600 font-mono">
                  <span>S/N: {eq.numero_serie || '-'}</span>
                  {eq.numero_patrimonio ? <span>PAT: {eq.numero_patrimonio}</span> : null}
                  <span>Tipo: {eq.tipo || 'Multifuncional'}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 italic text-[10px]">Equipamento geral ou não especificado.</p>
        )}
      </div>

      {/* APURAÇÃO INDIVIDUAL DOS CONTADORES POR EQUIPAMENTO */}
      <div className="border-b border-dashed border-gray-600 pb-2 mb-2">
        <div className="flex justify-between items-center mb-1">
          <span className="font-bold block uppercase text-[10.5px]">
            &gt;&gt; CONTADORES INDIVIDUAIS POR MÁQUINA
          </span>
          <span className="text-[9px] text-gray-600">
            {contadores.length > 0 ? `${contadores.length} medidor(es)` : 'Leitura consolidada'}
          </span>
        </div>

        {contadores.length > 0 ? (
          <div className="space-y-2">
            {contadores.map((cnt, idx) => {
              const eq =
                cnt.expand?.equipamento_id ||
                equipamentosVinculados.find((e) => e.id === cnt.equipamento_id)
              const abMono = cnt.abertura_mono || 0
              const fcMono = cnt.fechamento_mono ?? abMono
              const prodMono = cnt.delta_mono ?? Math.max(0, fcMono - abMono)

              const abColor = cnt.abertura_color || 0
              const fcColor = cnt.fechamento_color ?? abColor
              const prodColor = cnt.delta_color ?? Math.max(0, fcColor - abColor)

              const abCopias = cnt.abertura_copias || 0
              const fcCopias = cnt.fechamento_copias ?? abCopias
              const prodCopias = cnt.delta_copias ?? Math.max(0, fcCopias - abCopias)

              const abScan = cnt.abertura_scanner || 0
              const fcScan = cnt.fechamento_scanner ?? abScan
              const prodScan = cnt.delta_scanner ?? Math.max(0, fcScan - abScan)

              const totalProdMaquina = prodMono + prodColor

              return (
                <div
                  key={cnt.id || idx}
                  className="bg-gray-50 p-1.5 rounded border border-gray-300"
                >
                  <div className="font-bold text-[10px] text-gray-900 border-b pb-0.5 mb-1 flex justify-between items-center">
                    <span className="truncate max-w-[260px]">
                      {eq ? `${eq.marca} ${eq.modelo}` : `Equipamento #${idx + 1}`}
                    </span>
                    <span className="text-[9px] text-gray-600 font-mono font-normal">
                      {eq?.numero_serie ? `S/N: ${eq.numero_serie}` : ''}
                    </span>
                  </div>

                  <table className="w-full text-[9.5px]">
                    <thead>
                      <tr className="text-gray-600 border-b border-gray-200">
                        <th className="text-left font-normal">TIPO</th>
                        <th className="text-right font-normal">ABERTURA</th>
                        <th className="text-right font-normal">FECHAM.</th>
                        <th className="text-right font-bold text-gray-900">PRODUÇÃO</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      <tr>
                        <td className="font-semibold">MONO</td>
                        <td className="text-right font-mono">{abMono.toLocaleString('pt-BR')}</td>
                        <td className="text-right font-mono">{fcMono.toLocaleString('pt-BR')}</td>
                        <td className="text-right font-mono font-bold text-emerald-800">
                          +{prodMono.toLocaleString('pt-BR')}
                        </td>
                      </tr>
                      {(abColor > 0 || fcColor > 0 || isEquipamentoColorido(eq)) && (
                        <tr>
                          <td className="font-semibold text-purple-900">COLOR</td>
                          <td className="text-right font-mono">
                            {abColor.toLocaleString('pt-BR')}
                          </td>
                          <td className="text-right font-mono">
                            {fcColor.toLocaleString('pt-BR')}
                          </td>
                          <td className="text-right font-mono font-bold text-purple-800">
                            +{prodColor.toLocaleString('pt-BR')}
                          </td>
                        </tr>
                      )}
                      {(abCopias > 0 || fcCopias > 0) && (
                        <tr>
                          <td>CÓPIAS</td>
                          <td className="text-right font-mono">
                            {abCopias.toLocaleString('pt-BR')}
                          </td>
                          <td className="text-right font-mono">
                            {fcCopias.toLocaleString('pt-BR')}
                          </td>
                          <td className="text-right font-mono font-bold">
                            +{prodCopias.toLocaleString('pt-BR')}
                          </td>
                        </tr>
                      )}
                      {(abScan > 0 || fcScan > 0) && (
                        <tr>
                          <td>SCANNER</td>
                          <td className="text-right font-mono">{abScan.toLocaleString('pt-BR')}</td>
                          <td className="text-right font-mono">{fcScan.toLocaleString('pt-BR')}</td>
                          <td className="text-right font-mono font-bold">
                            +{prodScan.toLocaleString('pt-BR')}
                          </td>
                        </tr>
                      )}
                      <tr className="bg-gray-100/80 font-bold border-t border-gray-300">
                        <td className="py-0.5">SUBTOTAL</td>
                        <td className="text-right font-mono text-[9px]">
                          {(abMono + abColor).toLocaleString('pt-BR')}
                        </td>
                        <td className="text-right font-mono text-[9px]">
                          {(fcMono + fcColor).toLocaleString('pt-BR')}
                        </td>
                        <td className="text-right font-mono text-emerald-900">
                          +{totalProdMaquina.toLocaleString('pt-BR')} págs
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )
            })}
          </div>
        ) : (
          /* Fallback para caixas legados de equipamento único */
          <div className="space-y-1 bg-gray-50 p-2 rounded border border-gray-200">
            <div className="flex justify-between">
              <span className="text-gray-600">MONO (ABERTURA → FECHAM.):</span>
              <span className="font-mono">
                {(caixa.contador_abertura_mono || 0).toLocaleString('pt-BR')} →{' '}
                {(
                  caixa.contador_fechamento_mono ||
                  caixa.contador_abertura_mono ||
                  0
                ).toLocaleString('pt-BR')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">PRODUÇÃO MONO:</span>
              <span className="font-mono font-bold text-emerald-800">
                +
                {(
                  caixa.producao_mono ??
                  Math.max(
                    0,
                    (caixa.contador_fechamento_mono || 0) - (caixa.contador_abertura_mono || 0),
                  )
                ).toLocaleString('pt-BR')}{' '}
                págs
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">COLOR (ABERTURA → FECHAM.):</span>
              <span className="font-mono">
                {(caixa.contador_abertura_color || 0).toLocaleString('pt-BR')} →{' '}
                {(
                  caixa.contador_fechamento_color ||
                  caixa.contador_abertura_color ||
                  0
                ).toLocaleString('pt-BR')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">PRODUÇÃO COLOR:</span>
              <span className="font-mono font-bold text-purple-800">
                +
                {(
                  caixa.producao_color ??
                  Math.max(
                    0,
                    (caixa.contador_fechamento_color || 0) - (caixa.contador_abertura_color || 0),
                  )
                ).toLocaleString('pt-BR')}{' '}
                págs
              </span>
            </div>
          </div>
        )}
      </div>

      {/* TOTAIS FÍSICOS CONSOLIDADOS DO CAIXA (SOMA DE TODAS AS MÁQUINAS) */}
      <div className="border-b-2 border-dashed border-gray-800 pb-2 mb-2 bg-emerald-50/60 p-2 rounded">
        <span className="font-bold block uppercase text-[10.5px] text-emerald-950 mb-1">
          &gt;&gt; TOTAL CONSOLIDADO DE PRODUÇÃO DO CAIXA
        </span>
        <div className="space-y-0.5 text-[10px]">
          <div className="flex justify-between">
            <span className="text-gray-700">TOTAL MONOCROMÁTICO PRODUZIDO:</span>
            <span className="font-mono font-bold text-gray-900">
              +{consolidadoProducao.totDeltaMono.toLocaleString('pt-BR')} págs
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-700">TOTAL COLORIDO PRODUZIDO:</span>
            <span className="font-mono font-bold text-purple-900">
              +{consolidadoProducao.totDeltaColor.toLocaleString('pt-BR')} págs
            </span>
          </div>
          {consolidadoProducao.totDeltaCopias > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-700">TOTAL CÓPIAS FÍSICAS:</span>
              <span className="font-mono font-semibold">
                +{consolidadoProducao.totDeltaCopias.toLocaleString('pt-BR')}
              </span>
            </div>
          )}
          {consolidadoProducao.totDeltaScanner > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-700">TOTAL DIGITALIZAÇÕES/SCANNER:</span>
              <span className="font-mono font-semibold">
                +{consolidadoProducao.totDeltaScanner.toLocaleString('pt-BR')}
              </span>
            </div>
          )}
          <div className="flex justify-between font-bold text-xs pt-1 border-t border-emerald-300 text-emerald-950">
            <span>VOLUME TOTAL IMPRESSO (MONO + COLOR):</span>
            <span className="font-mono">
              +{consolidadoProducao.totGeralProducao.toLocaleString('pt-BR')} páginas
            </span>
          </div>
        </div>
      </div>

      {/* MOVIMENTO DE INSUMOS E SERVIÇOS PRESTADOS */}
      <div className="border-b border-dashed border-gray-600 pb-2 mb-2">
        <div className="flex justify-between items-center mb-1">
          <span className="font-bold uppercase text-[10.5px]">
            &gt;&gt; SERVIÇOS & INSUMOS ({vendas.length})
          </span>
          <span className="text-[10px] text-gray-600 font-mono">{totalInsumosQtd} itens</span>
        </div>
        {vendas.length > 0 ? (
          <div className="space-y-1 max-h-48 overflow-hidden">
            {vendas.slice(0, 12).map((v, idx) => (
              <div key={v.id || idx} className="flex justify-between text-[10px]">
                <span className="truncate max-w-[250px]">
                  {v.quantidade}x {v.descricao}
                </span>
                <span className="font-mono font-semibold">
                  {formatCurrency(v.valor_total || 0)}
                </span>
              </div>
            ))}
            {vendas.length > 12 && (
              <p className="text-[9px] text-gray-500 text-center italic pt-0.5">
                + {vendas.length - 12} outro(s) item(ns) detalhado(s) no sistema
              </p>
            )}
          </div>
        ) : (
          <p className="text-gray-500 italic text-[10px]">Nenhum serviço/venda registrado.</p>
        )}
      </div>

      {/* FORMAS DE PAGAMENTO */}
      <div className="border-b border-dashed border-gray-600 pb-2 mb-2 space-y-1">
        <span className="font-bold block uppercase text-[10.5px] mb-1">
          &gt;&gt; RECEBIMENTOS POR FORMA DE PAGAMENTO
        </span>
        <div className="space-y-0.5 text-[10.5px]">
          <div className="flex justify-between">
            <span>DINHEIRO (ESPÉCIE):</span>
            <span className="font-mono">{formatCurrency(pagamentosMap['dinheiro'] || 0)}</span>
          </div>
          <div className="flex justify-between">
            <span>PIX:</span>
            <span className="font-mono">{formatCurrency(pagamentosMap['pix'] || 0)}</span>
          </div>
          <div className="flex justify-between">
            <span>CARTÃO DE DÉBITO:</span>
            <span className="font-mono">{formatCurrency(pagamentosMap['cartao_debito'] || 0)}</span>
          </div>
          <div className="flex justify-between">
            <span>CARTÃO DE CRÉDITO:</span>
            <span className="font-mono">
              {formatCurrency(pagamentosMap['cartao_credito'] || 0)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>A PRAZO / FATURADO:</span>
            <span className="font-mono">{formatCurrency(pagamentosMap['a_prazo'] || 0)}</span>
          </div>
          {pagamentosMap['outro'] ? (
            <div className="flex justify-between">
              <span>OUTROS:</span>
              <span className="font-mono">{formatCurrency(pagamentosMap['outro'] || 0)}</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* TOTAIS E VALORES */}
      <div className="border-b-2 border-dashed border-gray-800 pb-2.5 mb-2.5 space-y-1">
        <span className="font-bold block uppercase text-[10.5px] mb-1">
          &gt;&gt; RESUMO FINANCEIRO DO DIA
        </span>
        <div className="flex justify-between">
          <span className="text-gray-700">FUNDO INICIAL (TROCO):</span>
          <span className="font-mono font-semibold">{formatCurrency(saldoInicial)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="font-bold">TOTAL RECEBIDO (VENDAS):</span>
          <span className="font-mono font-bold text-blue-900">{formatCurrency(totalEntradas)}</span>
        </div>
        <div className="flex justify-between text-[10.5px]">
          <span className="text-gray-600">CUSTO DE INSUMOS/MÍDIAS:</span>
          <span className="font-mono text-gray-700">- {formatCurrency(totalCustos)}</span>
        </div>
        <div className="flex justify-between text-xs font-bold pt-1 border-t border-gray-400">
          <span className="text-emerald-900">LUCRO ESTIMADO DO DIA:</span>
          <span className="font-mono text-emerald-800">{formatCurrency(lucroTotal)}</span>
        </div>
      </div>

      {/* CONFERÊNCIA DE GAVETA */}
      <div className="border-b-2 border-dashed border-gray-800 pb-2.5 mb-3 space-y-1 bg-gray-50 p-2 rounded">
        <span className="font-bold block uppercase text-[10.5px] text-gray-900">
          &gt;&gt; CONFERÊNCIA FÍSICA DA GAVETA
        </span>
        <div className="flex justify-between text-[10.5px]">
          <span className="text-gray-600">DINHEIRO ESPERADO (Fundo + Dinheiro):</span>
          <span className="font-mono font-semibold">{formatCurrency(esperadoGaveta)}</span>
        </div>
        <div className="flex justify-between text-xs font-bold">
          <span>DINHEIRO INFORMADO EM GAVETA:</span>
          <span className="font-mono text-gray-900">{formatCurrency(informadoGaveta)}</span>
        </div>
        <div className="flex justify-between text-xs font-bold pt-1 border-t border-gray-300">
          <span>DIFERENÇA APURADA:</span>
          <span
            className={`font-mono ${
              diferencaGaveta === 0
                ? 'text-emerald-700'
                : diferencaGaveta > 0
                  ? 'text-blue-700'
                  : 'text-red-700'
            }`}
          >
            {diferencaGaveta > 0
              ? `+${formatCurrency(diferencaGaveta)} (Sobra)`
              : diferencaGaveta < 0
                ? `${formatCurrency(diferencaGaveta)} (Falta)`
                : 'R$ 0,00 (Exato)'}
          </span>
        </div>
      </div>

      {/* OBSERVAÇÕES */}
      {(caixa.observacoes_abertura || caixa.observacoes_fechamento) && (
        <div className="border-b border-dashed border-gray-600 pb-2 mb-2 text-[10px] space-y-1">
          <span className="font-bold block uppercase">&gt;&gt; OBSERVAÇÕES:</span>
          {caixa.observacoes_abertura && (
            <p>
              <strong>Abertura:</strong> {caixa.observacoes_abertura}
            </p>
          )}
          {caixa.observacoes_fechamento && (
            <p>
              <strong>Fechamento:</strong> {caixa.observacoes_fechamento}
            </p>
          )}
        </div>
      )}

      {/* ASSINATURA */}
      <div className="pt-4 text-center space-y-2">
        <div className="border-b border-gray-700 w-48 mx-auto h-8" />
        <p className="font-bold uppercase text-[10px]">
          {caixa.operador || 'Operador Responsável'}
        </p>
        <p className="text-[9px] text-gray-500">Responsável pelo Fechamento do Caixa</p>
        <p className="text-[8.5px] text-gray-400 pt-2 border-t border-gray-200">
          STD • Impresso em {formatDateTime(new Date().toISOString())}
        </p>
      </div>
    </div>
  )
}

export default CaixaCupomRelatorio
