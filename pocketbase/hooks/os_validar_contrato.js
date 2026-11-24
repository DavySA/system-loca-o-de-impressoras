/**
 * STD — regras de negócio na criação de Ordens de Serviço.
 *
 * Validação obrigatória no servidor (a 0.0.34 validava só no frontend):
 *   — atendimento tipo "contrato": cliente_id e equipamento_id são obrigatórios;
 *   — tipo "particular": equipamento continua opcional.
 *
 * IMPORTANTE (JSVM): handler autossuficiente (sem funções top-level) e global $app.
 */

onRecordCreate((e) => {
  const rec = e.record
  const tipo = rec.getString('tipo_atendimento') || 'contrato'

  if (tipo === 'contrato') {
    if (!rec.getString('cliente_id')) {
      throw new BadRequestError('Atendimento por contrato exige o cliente selecionado.')
    }
    if (!rec.getString('equipamento_id')) {
      throw new BadRequestError(
        'Atendimento por contrato exige a seleção do equipamento (em atendimentos particulares ele é opcional).',
      )
    }
  }

  e.next()
}, 'ordens_servico')
