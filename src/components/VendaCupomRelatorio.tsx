import React from 'react'
import type {
  GraficaVenda,
  GraficaCaixa,
  ConfiguracoesEmpresa,
  Cliente,
  ItemVendaCupom,
} from '@/types'
import { formatCurrency, formatDateTime, formatCnpjCpf, formatPhone } from '@/lib/formatters'
import { configuracoesService } from '@/services/configuracoes'
import defaultLogo from '@/assets/logo-png-copia-13bb2.png'

interface VendaCupomRelatorioProps {
  venda: GraficaVenda
  caixa?: GraficaCaixa | null
  configEmpresa: ConfiguracoesEmpresa | null
  clienteGrafica?: Cliente | null
  cabecalhoPersonalizado?: string | null
  formato?: 'bobina' | 'a5'
}

export function VendaCupomRelatorio({
  venda,
  caixa,
  configEmpresa,
  clienteGrafica,
  cabecalhoPersonalizado,
  formato = 'bobina',
}: VendaCupomRelatorioProps) {
  const logoSrc = configEmpresa?.logo ? configuracoesService.getLogoUrl(configEmpresa) : defaultLogo

  // Itens do cupom: parse de itens_cupom se houver, ou fallback para o item plano da venda
  const itens: ItemVendaCupom[] = React.useMemo(() => {
    if (venda.itens_cupom) {
      try {
        const parsed =
          typeof venda.itens_cupom === 'string' ? JSON.parse(venda.itens_cupom) : venda.itens_cupom
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
        }
      } catch {
        /* fallback */
      }
    }
    return [
      {
        produto_id: venda.produto_id,
        descricao: venda.descricao,
        quantidade: venda.quantidade || 1,
        preco_unitario: venda.preco_unitario || venda.valor_total / (venda.quantidade || 1),
        valor_total: venda.valor_total,
      },
    ]
  }, [venda])

  // Cabeçalho específico do cliente correspondente à gráfica (ou customizado)
  const cabecalhoEfetivo =
    cabecalhoPersonalizado?.trim() || clienteGrafica?.cabecalho_cupom?.trim() || ''

  const totalGeral = venda.valor_total || itens.reduce((acc, it) => acc + it.valor_total, 0)
  const totalItensQtd = itens.reduce((acc, it) => acc + (it.quantidade || 1), 0)

  const containerClasses =
    formato === 'bobina' ? 'max-w-[400px] p-4 text-[11px]' : 'max-w-[540px] p-6 text-[12px]'

  const formaPgtoLabel: Record<string, string> = {
    dinheiro: 'Dinheiro em Espécie',
    pix: 'PIX',
    cartao_debito: 'Cartão de Débito',
    cartao_credito: 'Cartão de Crédito',
    a_prazo: 'A Prazo / Faturado',
    outro: 'Outro',
  }

  return (
    <div
      className={`bg-white text-gray-900 mx-auto font-mono leading-tight border border-gray-300 shadow-sm print:border-none print:shadow-none print:p-1 print:max-w-none ${containerClasses}`}
    >
      {/* CABEÇALHO */}
      <div className="text-center border-b-2 border-dashed border-gray-800 pb-2 mb-2">
        <div className="w-16 h-10 mx-auto flex items-center justify-center mb-1">
          <img src={logoSrc} alt="Logo" className="max-h-10 max-w-[110px] object-contain" />
        </div>

        {/* Cabeçalho personalizado do Cliente vinculado à Gráfica (se cadastrado) */}
        {cabecalhoEfetivo ? (
          <div className="p-1.5 mb-1.5 bg-gray-50 border border-gray-300 rounded text-center whitespace-pre-line text-[10px] font-semibold text-gray-900">
            {cabecalhoEfetivo}
          </div>
        ) : (
          <>
            <h1 className="font-bold text-xs uppercase tracking-tight text-gray-900">
              {clienteGrafica?.nome_razao_social || configEmpresa?.razao_social || 'STD TECHNOLOGY'}
            </h1>
            {configEmpresa?.nome_fantasia && (
              <p className="text-[10px] text-gray-700">{configEmpresa.nome_fantasia}</p>
            )}
            <p className="text-[9.5px] text-gray-600">
              CNPJ/CPF: {formatCnpjCpf(clienteGrafica?.documento || configEmpresa?.cnpj) || '-'}
            </p>
            {(clienteGrafica?.telefone || configEmpresa?.telefone) && (
              <p className="text-[9.5px] text-gray-600">
                Tel: {formatPhone(clienteGrafica?.telefone || configEmpresa?.telefone)}
              </p>
            )}
            {(clienteGrafica?.endereco || configEmpresa?.endereco) && (
              <p className="text-[9px] text-gray-500">
                {clienteGrafica?.endereco || configEmpresa?.endereco}
                {clienteGrafica?.cidade || configEmpresa?.cidade
                  ? ` - ${clienteGrafica?.cidade || configEmpresa?.cidade}/${clienteGrafica?.uf || configEmpresa?.uf || ''}`
                  : ''}
              </p>
            )}
          </>
        )}

        <div className="mt-1.5 pt-1 border-t border-gray-400">
          <span className="font-bold text-[11px] uppercase tracking-wider block">
            CUPOM NÃO FISCAL — GRÁFICA RÁPIDA
          </span>
          <span className="text-[9.5px] text-gray-700 font-semibold block">
            {venda.numero_cupom
              ? `CUPOM: #${venda.numero_cupom}`
              : `VENDA #${venda.id.slice(0, 8).toUpperCase()}`}
          </span>
        </div>
      </div>

      {/* DADOS DA OPERAÇÃO / DATA / CAIXA */}
      <div className="border-b border-dashed border-gray-600 pb-2 mb-2 space-y-0.5 text-[10px]">
        <div className="flex justify-between">
          <span className="text-gray-600">DATA/HORA:</span>
          <span className="font-semibold">{formatDateTime(venda.data_hora || venda.created)}</span>
        </div>
        {caixa && (
          <div className="flex justify-between">
            <span className="text-gray-600">CAIXA REF:</span>
            <span>
              #{caixa.id.slice(0, 8).toUpperCase()} ({caixa.operador || 'Operador'})
            </span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-gray-600">FORMA PGTO:</span>
          <span className="font-bold uppercase">
            {formaPgtoLabel[venda.forma_pagamento || 'dinheiro'] || venda.forma_pagamento}
          </span>
        </div>
      </div>

      {/* DADOS DO CLIENTE (SE PREENCHIDOS) */}
      {(venda.cliente_nome || venda.cliente_documento || venda.cliente_telefone) && (
        <div className="border-b border-dashed border-gray-600 pb-2 mb-2 bg-gray-50/80 p-1.5 rounded text-[10px] space-y-0.5">
          <span className="font-bold block uppercase text-[10px] text-gray-800">
            &gt;&gt; DADOS DO CLIENTE
          </span>
          <div className="flex justify-between">
            <span className="text-gray-600">NOME:</span>
            <span className="font-bold uppercase truncate max-w-[220px]">
              {venda.cliente_nome || 'Consumidor Final'}
            </span>
          </div>
          {venda.cliente_documento && (
            <div className="flex justify-between">
              <span className="text-gray-600">DOC (CPF/CNPJ):</span>
              <span className="font-mono">{formatCnpjCpf(venda.cliente_documento)}</span>
            </div>
          )}
          {venda.cliente_telefone && (
            <div className="flex justify-between">
              <span className="text-gray-600">TELEFONE/WHATSAPP:</span>
              <span>{formatPhone(venda.cliente_telefone)}</span>
            </div>
          )}
        </div>
      )}

      {/* ITENS DO CUPOM (MÚLTIPLOS ITENS) */}
      <div className="border-b-2 border-dashed border-gray-800 pb-2 mb-2">
        <div className="flex justify-between items-center mb-1 text-[10.5px] font-bold border-b border-gray-300 pb-0.5">
          <span>ITENS DO PEDIDO ({itens.length})</span>
          <span>VALOR (R$)</span>
        </div>
        <div className="space-y-1.5 pt-1">
          {itens.map((it, idx) => (
            <div key={it.id || idx} className="text-[10px]">
              <div className="flex justify-between font-semibold">
                <span className="truncate max-w-[240px]">
                  {idx + 1}. {it.descricao}
                </span>
                <span className="font-mono">{formatCurrency(it.valor_total)}</span>
              </div>
              <div className="flex justify-between text-[9px] text-gray-600 font-mono pl-3">
                <span>
                  {it.quantidade} un. x {formatCurrency(it.preco_unitario)}
                </span>
                {it.suprimento_baixado_id ? <span>[baixa insumo ok]</span> : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* TOTALIZADORES */}
      <div className="border-b-2 border-dashed border-gray-800 pb-2 mb-2 space-y-1">
        <div className="flex justify-between text-[10.5px]">
          <span className="text-gray-600">QUANTIDADE TOTAL DE ITENS:</span>
          <span className="font-mono font-semibold">{totalItensQtd}</span>
        </div>
        <div className="flex justify-between text-xs font-bold pt-1 border-t border-gray-400">
          <span className="text-gray-900 uppercase">VALOR TOTAL DO CUPOM:</span>
          <span className="font-mono text-sm text-blue-900">{formatCurrency(totalGeral)}</span>
        </div>
      </div>

      {/* OBSERVAÇÕES */}
      {venda.observacoes && (
        <div className="border-b border-dashed border-gray-600 pb-2 mb-2 text-[9.5px]">
          <span className="font-bold block uppercase text-gray-700">OBSERVAÇÕES:</span>
          <p className="text-gray-600 italic whitespace-pre-line">{venda.observacoes}</p>
        </div>
      )}

      {/* MENSAGEM DE RODAPÉ */}
      <div className="text-center pt-2 text-[9px] text-gray-600 space-y-0.5">
        <p className="font-bold uppercase tracking-wider">OBRIGADO PELA PREFERÊNCIA!</p>
        <p>Documento auxiliar de venda balcão — STD Technology ERP</p>
        <p className="font-mono text-[8px] text-gray-400">
          Autenticação: {venda.id.toUpperCase()} • {new Date().toLocaleDateString('pt-BR')}
        </p>
      </div>
    </div>
  )
}
