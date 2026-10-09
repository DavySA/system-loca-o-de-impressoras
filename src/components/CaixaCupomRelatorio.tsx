import React from 'react'
import type {
  GraficaCaixa,
  GraficaCaixaContador,
  GraficaVenda,
  ConfiguracoesEmpresa,
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
}

export function CaixaCupomRelatorio({
  caixa,
  contadores = [],
  vendas = [],
  configEmpresa,
}: CaixaCupomRelatorioProps) {
  const logoSrc = configEmpresa?.logo ? configuracoesService.getLogoUrl(configEmpresa) : defaultLogo
  const equipamentoPrincipal = caixa.expand?.equipamento_id

  // Totais de vendas
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

  return (
    <div className="bg-white text-gray-900 p-6 max-w-[420px] mx-auto font-mono text-[11px] leading-tight border border-gray-300 shadow-sm print:border-none print:shadow-none print:p-2 print:max-w-none">
      {/* CABEÇALHO */}
      <div className="text-center border-b-2 border-dashed border-gray-800 pb-3 mb-3">
        <div className="w-20 h-12 mx-auto flex items-center justify-center mb-1">
          <img src={logoSrc} alt="Logo" className="max-h-12 max-w-[120px] object-contain" />
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
          <span className="text-[10px] text-gray-700 font-semibold">
            CUPOM / FICHA DIÁRIA POR EQUIPAMENTO
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
      </div>

      {/* EQUIPAMENTO PRINCIPAL */}
      <div className="border-b border-dashed border-gray-600 pb-2 mb-2">
        <span className="font-bold block uppercase text-[10.5px] mb-1">
          &gt;&gt; EQUIPAMENTO DO CAIXA
        </span>
        {equipamentoPrincipal ? (
          <div className="space-y-0.5">
            <div className="flex justify-between">
              <span className="text-gray-600">MODELO:</span>
              <span className="font-bold">
                {equipamentoPrincipal.marca} {equipamentoPrincipal.modelo}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">S/N:</span>
              <span className="font-mono">{equipamentoPrincipal.numero_serie}</span>
            </div>
            {equipamentoPrincipal.numero_patrimonio && (
              <div className="flex justify-between">
                <span className="text-gray-600">PATRIMÔNIO:</span>
                <span>{equipamentoPrincipal.numero_patrimonio}</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500 italic">Equipamento geral ou não especificado.</p>
        )}
      </div>

      {/* CONTADORES E PRODUÇÃO */}
      <div className="border-b border-dashed border-gray-600 pb-2 mb-2">
        <span className="font-bold block uppercase text-[10.5px] mb-1">
          &gt;&gt; APURAÇÃO DE CONTADORES FÍSICOS
        </span>
        {contadores.length > 0 ? (
          <div className="space-y-2">
            {contadores.map((cnt) => {
              const eq = cnt.expand?.equipamento_id
              return (
                <div key={cnt.id} className="bg-gray-50 p-1.5 rounded border border-gray-200">
                  <div className="font-bold text-[10px] text-gray-800 border-b pb-0.5 mb-1 flex justify-between">
                    <span>{eq ? `${eq.marca} ${eq.modelo}` : 'Impressora'}</span>
                    <span className="text-[9px] text-gray-500 font-normal">
                      {eq?.numero_serie ? `S/N: ${eq.numero_serie}` : ''}
                    </span>
                  </div>
                  <table className="w-full text-[9.5px]">
                    <thead>
                      <tr className="text-gray-600 border-b border-gray-200">
                        <th className="text-left font-normal">TIPO</th>
                        <th className="text-right font-normal">INIC</th>
                        <th className="text-right font-normal">FIM</th>
                        <th className="text-right font-bold">PROD</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      <tr>
                        <td>MONO</td>
                        <td className="text-right font-mono">
                          {(cnt.abertura_mono || 0).toLocaleString('pt-BR')}
                        </td>
                        <td className="text-right font-mono">
                          {(cnt.fechamento_mono || cnt.abertura_mono || 0).toLocaleString('pt-BR')}
                        </td>
                        <td className="text-right font-mono font-bold text-emerald-800">
                          +
                          {(
                            cnt.delta_mono ??
                            Math.max(0, (cnt.fechamento_mono || 0) - (cnt.abertura_mono || 0))
                          ).toLocaleString('pt-BR')}
                        </td>
                      </tr>
                      <tr>
                        <td>COLOR</td>
                        <td className="text-right font-mono">
                          {(cnt.abertura_color || 0).toLocaleString('pt-BR')}
                        </td>
                        <td className="text-right font-mono">
                          {(cnt.fechamento_color || cnt.abertura_color || 0).toLocaleString(
                            'pt-BR',
                          )}
                        </td>
                        <td className="text-right font-mono font-bold text-emerald-800">
                          +
                          {(
                            cnt.delta_color ??
                            Math.max(0, (cnt.fechamento_color || 0) - (cnt.abertura_color || 0))
                          ).toLocaleString('pt-BR')}
                        </td>
                      </tr>
                      {(cnt.fechamento_copias || 0) > 0 && (
                        <tr>
                          <td>CÓPIAS</td>
                          <td className="text-right font-mono">
                            {(cnt.abertura_copias || 0).toLocaleString('pt-BR')}
                          </td>
                          <td className="text-right font-mono">
                            {(cnt.fechamento_copias || 0).toLocaleString('pt-BR')}
                          </td>
                          <td className="text-right font-mono font-bold">
                            +
                            {(
                              cnt.delta_copias ??
                              Math.max(0, (cnt.fechamento_copias || 0) - (cnt.abertura_copias || 0))
                            ).toLocaleString('pt-BR')}
                          </td>
                        </tr>
                      )}
                      {(cnt.fechamento_scanner || 0) > 0 && (
                        <tr>
                          <td>SCANNER</td>
                          <td className="text-right font-mono">
                            {(cnt.abertura_scanner || 0).toLocaleString('pt-BR')}
                          </td>
                          <td className="text-right font-mono">
                            {(cnt.fechamento_scanner || 0).toLocaleString('pt-BR')}
                          </td>
                          <td className="text-right font-mono font-bold">
                            +
                            {(
                              cnt.delta_scanner ??
                              Math.max(
                                0,
                                (cnt.fechamento_scanner || 0) - (cnt.abertura_scanner || 0),
                              )
                            ).toLocaleString('pt-BR')}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-600">MONO (INIC / FIM):</span>
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
              <span className="text-gray-600">COLOR (INIC / FIM):</span>
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
              <span className="font-mono font-bold text-emerald-800">
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
            {vendas.slice(0, 10).map((v, idx) => (
              <div key={v.id || idx} className="flex justify-between text-[10px]">
                <span className="truncate max-w-[240px]">
                  {v.quantidade}x {v.descricao}
                </span>
                <span className="font-mono font-semibold">
                  {formatCurrency(v.valor_total || 0)}
                </span>
              </div>
            ))}
            {vendas.length > 10 && (
              <p className="text-[9px] text-gray-500 text-center italic pt-0.5">
                + {vendas.length - 10} outro(s) item(ns) detalhado(s) no sistema
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
          &gt;&gt; RECEBIMENTOS POR MEIO DE PAGAMENTO
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
