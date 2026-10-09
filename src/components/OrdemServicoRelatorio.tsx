import React from 'react'
import {
  formatOSCode,
  formatDate,
  formatDateTime,
  formatCnpjCpf,
  formatPhone,
} from '@/lib/formatters'
import type { OrdemServico, ConfiguracoesEmpresa } from '@/types'
import { configuracoesService } from '@/services/configuracoes'
import defaultLogo from '@/assets/logo-png-copia-13bb2.png'

interface OrdemServicoRelatorioProps {
  ordem: OrdemServico
  configEmpresa: ConfiguracoesEmpresa | null
  ultimosAtendimentos: OrdemServico[]
}

export function OrdemServicoRelatorio({
  ordem,
  configEmpresa,
  ultimosAtendimentos,
}: OrdemServicoRelatorioProps) {
  const cliente = ordem.expand?.cliente_id
  const equipamento = ordem.expand?.equipamento_id
  const servico = ordem.expand?.servico_id

  const logoSrc = configEmpresa?.logo ? configuracoesService.getLogoUrl(configEmpresa) : defaultLogo

  const contadorTotal =
    ordem.contador_atual ||
    (equipamento?.contador_monocromatico || 0) + (equipamento?.contador_colorido || 0)

  return (
    <div className="bg-white text-gray-900 p-8 max-w-4xl mx-auto font-sans leading-normal print:p-0 print:max-w-none text-xs">
      {/* 1. CABEÇALHO PERSONALIZADO */}
      <header className="border-b-2 border-gray-900 pb-4 mb-5 flex items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-24 h-16 flex items-center justify-center shrink-0">
            <img
              src={logoSrc}
              alt={configEmpresa?.razao_social || 'STD'}
              className="max-h-16 max-w-[140px] object-contain"
            />
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900 uppercase tracking-tight">
              {configEmpresa?.razao_social || 'STD - Gestão de Locação e Outsourcing'}
            </h1>
            {configEmpresa?.nome_fantasia && (
              <p className="text-[11px] font-semibold text-gray-700">
                {configEmpresa.nome_fantasia}
              </p>
            )}
            <p className="text-[10.5px] text-gray-600 mt-0.5">
              <span>CNPJ: {formatCnpjCpf(configEmpresa?.cnpj) || '12.345.678/0001-99'}</span>
              {configEmpresa?.inscricao_estadual && (
                <span> • IE: {configEmpresa.inscricao_estadual}</span>
              )}
            </p>
            <p className="text-[10px] text-gray-500">
              {configEmpresa?.endereco || 'Av. Paulista, 1500 - Conjunto 82'}
              {configEmpresa?.cidade ? ` - ${configEmpresa.cidade}/${configEmpresa.uf}` : ''}
              {configEmpresa?.telefone ? ` • Tel: ${formatPhone(configEmpresa.telefone)}` : ''}
              {configEmpresa?.email ? ` • E-mail: ${configEmpresa.email}` : ''}
            </p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="border-2 border-gray-900 px-3 py-1.5 rounded bg-gray-50 text-center min-w-[160px]">
            <span className="block text-[9px] uppercase font-bold text-gray-600 tracking-wider">
              Ordem de Serviço
            </span>
            <span className="text-lg font-mono font-bold text-gray-900">
              {formatOSCode(ordem.id)}
            </span>
          </div>
          <p className="text-[10px] text-gray-500 mt-1">
            Emissão: {formatDate(new Date().toISOString())}
          </p>
        </div>
      </header>

      {/* 2. DADOS GERAIS DA O.S., CLIENTE E EQUIPAMENTO */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Bloco Cliente */}
        <div className="border border-gray-300 rounded p-3 bg-gray-50/50">
          <h2 className="text-[10.5px] font-bold uppercase tracking-wider text-gray-700 border-b border-gray-200 pb-1 mb-2">
            Dados do Cliente
          </h2>
          <div className="space-y-1 text-[11px]">
            <p>
              <strong className="text-gray-700">Razão Social/Nome:</strong>{' '}
              <span className="font-semibold text-gray-900">
                {cliente?.nome_razao_social || 'Cliente não identificado'}
              </span>
            </p>
            <p>
              <strong className="text-gray-700">Documento:</strong>{' '}
              <span>{formatCnpjCpf(cliente?.documento) || '-'}</span>
            </p>
            <p>
              <strong className="text-gray-700">Telefone / E-mail:</strong>{' '}
              <span>
                {cliente?.telefone ? formatPhone(cliente.telefone) : '-'} / {cliente?.email || '-'}
              </span>
            </p>
            <p>
              <strong className="text-gray-700">Endereço:</strong>{' '}
              <span>
                {cliente?.endereco || '-'}
                {cliente?.cidade ? ` - ${cliente.cidade}/${cliente.uf}` : ''}
              </span>
            </p>
          </div>
        </div>

        {/* Bloco Equipamento */}
        <div className="border border-gray-300 rounded p-3 bg-gray-50/50">
          <h2 className="text-[10.5px] font-bold uppercase tracking-wider text-gray-700 border-b border-gray-200 pb-1 mb-2">
            Dados do Equipamento
          </h2>
          <div className="space-y-1 text-[11px]">
            <p>
              <strong className="text-gray-700">Equipamento/Modelo:</strong>{' '}
              <span className="font-semibold text-gray-900">
                {equipamento ? `${equipamento.marca} ${equipamento.modelo}` : '-'}
              </span>
            </p>
            <p>
              <strong className="text-gray-700">Número de Série (S/N):</strong>{' '}
              <span className="font-mono">{equipamento?.numero_serie || '-'}</span>
            </p>
            <p>
              <strong className="text-gray-700">Patrimônio:</strong>{' '}
              <span className="font-mono font-semibold text-gray-800">
                {equipamento?.numero_patrimonio || 'Não informado'}
              </span>
            </p>
            <p>
              <strong className="text-gray-700">Contador Registrado no Atendimento:</strong>{' '}
              <span className="font-mono font-bold text-blue-900">
                {contadorTotal > 0 ? contadorTotal.toLocaleString('pt-BR') : 'Não informado'}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* 3. INFORMAÇÕES DO ATENDIMENTO & DIAGNÓSTICO */}
      <div className="border border-gray-300 rounded p-3 mb-4 space-y-3">
        <div className="grid grid-cols-4 gap-2 border-b border-gray-200 pb-2 text-[10.5px]">
          <div>
            <span className="text-gray-500 block uppercase font-medium text-[9.5px]">
              Status O.S.:
            </span>
            <span className="font-bold uppercase text-gray-900">
              {ordem.status.replace('_', ' ')}
            </span>
          </div>
          <div>
            <span className="text-gray-500 block uppercase font-medium text-[9.5px]">
              Prioridade:
            </span>
            <span className="font-bold uppercase text-gray-900">{ordem.prioridade}</span>
          </div>
          <div>
            <span className="text-gray-500 block uppercase font-medium text-[9.5px]">
              Abertura / Agendada:
            </span>
            <span className="font-semibold text-gray-900">
              {formatDate(ordem.data_abertura || ordem.created)}{' '}
              {ordem.data_agendada ? `(Ag: ${formatDate(ordem.data_agendada)})` : ''}
            </span>
          </div>
          <div>
            <span className="text-gray-500 block uppercase font-medium text-[9.5px]">
              Técnico Responsável:
            </span>
            <span className="font-semibold text-gray-900">
              {ordem.tecnico_responsavel || 'Técnico Autorizado'}
            </span>
          </div>
        </div>

        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-1">
            Serviço Solicitado / Descrição do Problema
          </h3>
          <p className="text-[10.5px] text-gray-500 mb-1">
            <strong>Categoria/Serviço:</strong> {servico?.nome || 'Manutenção Corretiva'}
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded p-2 text-[11px] text-gray-800 whitespace-pre-wrap leading-relaxed">
            {ordem.descricao_problema || 'Nenhum detalhe informado.'}
          </div>
        </div>

        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-1">
            Parecer Técnico / Resolução do Atendimento
          </h3>
          <div className="bg-gray-50 border border-gray-200 rounded p-2 text-[11px] text-gray-800 whitespace-pre-wrap leading-relaxed min-h-[50px]">
            {ordem.parecer_tecnico || 'Atendimento em andamento / parecer técnico não concluído.'}
          </div>
        </div>
      </div>

      {/* 4. HISTÓRICO: DOIS ÚLTIMOS ATENDIMENTOS DESTE EQUIPAMENTO */}
      <div className="border border-gray-300 rounded p-3 mb-6">
        <h2 className="text-[10.5px] font-bold uppercase tracking-wider text-gray-700 border-b border-gray-200 pb-1 mb-2">
          Histórico dos 2 Últimos Atendimentos deste Equipamento
        </h2>
        {ultimosAtendimentos.length === 0 ? (
          <p className="text-[10.5px] text-gray-500 italic py-1">
            Nenhum atendimento anterior registrado para este equipamento.
          </p>
        ) : (
          <div className="space-y-2">
            {ultimosAtendimentos.map((ant, idx) => (
              <div
                key={ant.id}
                className="border border-gray-200 bg-gray-50/50 rounded p-2 text-[10.5px] space-y-1"
              >
                <div className="flex items-center justify-between font-semibold">
                  <span className="text-blue-900 font-mono">
                    #{idx + 1} - O.S. {formatOSCode(ant.id)} (
                    {formatDate(ant.data_conclusao || ant.data_abertura || ant.created)})
                  </span>
                  <span className="text-gray-600">
                    Técnico: {ant.tecnico_responsavel || 'Técnico'} • Status:{' '}
                    <strong className="capitalize">{ant.status}</strong>
                  </span>
                </div>
                <p>
                  <strong className="text-gray-700">Defeito relatado:</strong>{' '}
                  <span className="text-gray-800">{ant.descricao_problema}</span>
                </p>
                {ant.parecer_tecnico && (
                  <p>
                    <strong className="text-gray-700">Parecer Técnico:</strong>{' '}
                    <span className="text-gray-800">{ant.parecer_tecnico}</span>
                  </p>
                )}
                <p className="text-[10px] text-gray-600">
                  Contador registrado:{' '}
                  <strong className="font-mono text-gray-900">
                    {ant.contador_atual
                      ? ant.contador_atual.toLocaleString('pt-BR')
                      : 'Não informado'}
                  </strong>
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. CAMPOS DE ASSINATURA NO RODAPÉ */}
      <div className="pt-4 border-t-2 border-gray-800 mb-6">
        <div className="grid grid-cols-2 gap-12 text-center">
          {/* Assinatura do Técnico */}
          <div className="flex flex-col items-center">
            <div className="h-16 w-full border-b border-gray-700 flex items-end justify-center pb-1">
              {/* Linha para assinatura física do técnico */}
            </div>
            <p className="text-[11px] font-bold text-gray-900 mt-1.5 uppercase">
              {ordem.tecnico_responsavel || 'Técnico Responsável'}
            </p>
            <p className="text-[10px] text-gray-500">Técnico Autorizado — STD</p>
            <p className="text-[9.5px] text-gray-400 mt-0.5">Data: _____/_____/_________</p>
          </div>

          {/* Assinatura do Cliente */}
          <div className="flex flex-col items-center">
            <div className="h-16 w-full border-b border-gray-700 flex items-end justify-center pb-1">
              {ordem.assinatura_desenho ? (
                <img
                  src={ordem.assinatura_desenho}
                  alt="Assinatura Digital do Cliente"
                  className="max-h-14 max-w-[200px] object-contain"
                />
              ) : null}
            </div>
            <p className="text-[11px] font-bold text-gray-900 mt-1.5 uppercase">
              {ordem.assinatura_nome || cliente?.nome_razao_social || 'Cliente / Responsável'}
            </p>
            {ordem.assinatura_cpf && (
              <p className="text-[10px] font-mono text-gray-700">
                CPF: {formatCnpjCpf(ordem.assinatura_cpf)}
              </p>
            )}
            <p className="text-[10px] text-gray-500">
              Assinatura do Recebedor / Conferência do Serviço
            </p>
            <p className="text-[9.5px] text-gray-400 mt-0.5">Data: _____/_____/_________</p>
          </div>
        </div>
      </div>

      {/* 6. RODAPÉ PERSONALIZADO */}
      <footer className="text-center text-[10px] text-gray-500 border-t border-gray-200 pt-3 space-y-1">
        <p className="font-semibold text-gray-700">
          {configEmpresa?.mensagem_rodape ||
            'STD — Eficiência, qualidade e tecnologia em outsourcing de impressão.'}
        </p>
        <p className="text-[9px] text-gray-400">
          Documento emitido eletronicamente via STD em {formatDateTime(new Date().toISOString())}
        </p>
      </footer>
    </div>
  )
}
export default OrdemServicoRelatorio
