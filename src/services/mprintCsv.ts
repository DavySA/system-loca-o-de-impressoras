import type { Cliente, Equipamento, Contrato, Fatura } from '@/types'

export interface MPrintRawRow {
  linhaIndex: number
  empresa: string
  cnpj: string
  equipamento: string
  ip: string
  contadorInicial: number
  contadorFinal: number
  consumoPaginas: number
  valorPorPagina: number
  valorTotal: number
  periodoRaw: string
  origemColeta: string
  isTotalConsolidado: boolean
}

export interface MPrintLinhaProcessada {
  id: string
  linhaIndex: number
  // Dados brutos
  empresaRaw: string
  cnpjRaw: string
  equipamentoRaw: string
  ipRaw: string
  periodoRaw: string
  dataInicio?: string // yyyy-mm-dd
  dataFim?: string // yyyy-mm-dd
  mesReferencia: string // YYYY-MM
  contadorInicial: number
  contadorFinal: number
  consumoCalculado: number
  origemColeta: string

  // Matching
  clienteId?: string
  clienteMatch?: Cliente
  clienteStatus: 'exato' | 'parcial' | 'nao_encontrado' | 'manual'

  equipamentoId?: string
  equipamentoMatch?: Equipamento
  equipamentoStatus: 'exato' | 'parcial' | 'nao_encontrado' | 'manual'

  contratoId?: string
  contratoMatch?: Contrato

  // Tarifação
  valorPorPagina: number
  origemTarifa: 'csv' | 'contrato' | 'padrao' | 'manual'
  valorTotalCalculado: number

  // Duplicidade / Validação
  duplicada: boolean
  faturaExistenteId?: string
  motivoDuplicidade?: string
  selecionada: boolean
  erroValidacao?: string
}

export interface MPrintParseResult {
  linhas: MPrintLinhaProcessada[]
  totalConsolidadoCsv?: {
    equipamentosTexto?: string
    consumoPaginas?: number
    valorTotal?: number
    periodo?: string
  }
  resumo: {
    totalLinhasCsv: number
    linhasValidas: number
    clientesEncontrados: number
    equipamentosEncontrados: number
    duplicidadesDetectadas: number
    totalPaginas: number
    totalValor: number
  }
}

/**
 * Normaliza string removendo acentos, pontuações extras e convertendo para minúsculas
 */
export function normalizarTexto(texto: string | undefined | null): string {
  if (!texto) return ''
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Remove caracteres não numéricos (para comparar CNPJ/CPF)
 */
export function apenasDigitos(val: string | undefined | null): string {
  if (!val) return ''
  return val.replace(/\D/g, '')
}

/**
 * Converte valor em formato monetário brasileiro "1.234,56" ou "0,08" para float
 */
export function parseNumeroBr(val: string | undefined | null): number {
  if (!val) return 0
  const limpo = val
    .trim()
    .replace(/\s/g, '')
    .replace(/[R$\s]/g, '')
  if (!limpo || limpo === '—' || limpo === '-') return 0

  // Caso contenha vírgula, tratar como padrão pt-BR
  if (limpo.includes(',')) {
    const semPontoMilhar = limpo.replace(/\./g, '')
    const comPontoDecimal = semPontoMilhar.replace(',', '.')
    const parsed = parseFloat(comPontoDecimal)
    return isNaN(parsed) ? 0 : parsed
  }

  const parsed = parseFloat(limpo)
  return isNaN(parsed) ? 0 : parsed
}

/**
 * Faz parse de linhas no formato CSV com delimitador ponto-e-vírgula e aspas
 */
export function parseCsvLinhas(csvText: string): string[][] {
  const linhasMatriz: string[][] = []
  let linhaAtual: string[] = []
  let campoAtual = ''
  let dentroDeAspas = false

  const textoNormalizado = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  for (let i = 0; i < textoNormalizado.length; i++) {
    const char = textoNormalizado[i]
    const proxChar = textoNormalizado[i + 1]

    if (char === '"') {
      if (dentroDeAspas && proxChar === '"') {
        campoAtual += '"'
        i++ // pula a aspa duplicada de escape
      } else {
        dentroDeAspas = !dentroDeAspas
      }
    } else if (char === ';' && !dentroDeAspas) {
      linhaAtual.push(campoAtual.trim())
      campoAtual = ''
    } else if (char === '\n' && !dentroDeAspas) {
      linhaAtual.push(campoAtual.trim())
      campoAtual = ''
      if (linhaAtual.some((col) => col.length > 0)) {
        linhasMatriz.push(linhaAtual)
      }
      linhaAtual = []
    } else {
      campoAtual += char
    }
  }

  if (campoAtual.length > 0 || linhaAtual.length > 0) {
    linhaAtual.push(campoAtual.trim())
    if (linhaAtual.some((col) => col.length > 0)) {
      linhasMatriz.push(linhaAtual)
    }
  }

  return linhasMatriz
}

/**
 * Extrai período dd/mm/yyyy até dd/mm/yyyy e converte para YYYY-MM
 */
export function parsePeriodoMPrint(periodoStr: string): {
  dataInicio?: string
  dataFim?: string
  mesReferencia: string
} {
  const hoje = new Date()
  const mesPadrao = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`

  if (!periodoStr) return { mesReferencia: mesPadrao }

  // Regex tolerante para "01/10/2026 até 31/10/2026" ou "01/10/2026 a 31/10/2026"
  const regex = /(\d{2})\/(\d{2})\/(\d{4})/g
  const matches = [...periodoStr.matchAll(regex)]

  if (matches.length >= 2) {
    const d1 = matches[0]
    const d2 = matches[1]
    const dataInicio = `${d1[3]}-${d1[2]}-${d1[1]}`
    const dataFim = `${d2[3]}-${d2[2]}-${d2[1]}`
    // O mês de referência da fatura costuma ser o mês de apuração (d2 ou d1)
    const mesReferencia = `${d2[3]}-${d2[2]}`
    return { dataInicio, dataFim, mesReferencia }
  } else if (matches.length === 1) {
    const d = matches[0]
    const dataInicio = `${d[3]}-${d[2]}-${d[1]}`
    const mesReferencia = `${d[3]}-${d[2]}`
    return { dataInicio, mesReferencia }
  }

  return { mesReferencia: mesPadrao }
}

/**
 * Matching tolerante de Cliente por CNPJ (exato) ou por nome (tolerante com acentos/maiusculas)
 */
export function encontrarMelhorCliente(
  empresaRaw: string,
  cnpjRaw: string,
  clientes: Cliente[],
): { match?: Cliente; status: 'exato' | 'parcial' | 'nao_encontrado' } {
  const cnpjDigitos = apenasDigitos(cnpjRaw)
  if (cnpjDigitos.length >= 11) {
    const porCnpj = clientes.find((c) => apenasDigitos(c.documento) === cnpjDigitos)
    if (porCnpj) {
      return { match: porCnpj, status: 'exato' }
    }
  }

  const nomeNorm = normalizarTexto(empresaRaw)
  if (!nomeNorm) return { status: 'nao_encontrado' }

  // 1. Igualdade exata normalizada
  const exatoNome = clientes.find((c) => normalizarTexto(c.nome_razao_social) === nomeNorm)
  if (exatoNome) return { match: exatoNome, status: 'exato' }

  // 2. Um contém o outro (ex.: "Copiadora Silva" dentro de "Copiadora Silva LTDA")
  const contido = clientes.find((c) => {
    const cliNorm = normalizarTexto(c.nome_razao_social)
    return cliNorm.includes(nomeNorm) || nomeNorm.includes(cliNorm)
  })
  if (contido) return { match: contido, status: 'parcial' }

  // 3. Sobreposição de tokens/palavras significativas (> 3 caracteres)
  const palavrasEmpresa = nomeNorm.split(' ').filter((p) => p.length > 3)
  let melhorScore = 0
  let melhorCli: Cliente | undefined

  for (const c of clientes) {
    const cliNorm = normalizarTexto(c.nome_razao_social)
    let score = 0
    for (const p of palavrasEmpresa) {
      if (cliNorm.includes(p)) score++
    }
    if (score > melhorScore && score >= 1) {
      melhorScore = score
      melhorCli = c
    }
  }

  if (melhorCli && melhorScore >= 1) {
    return { match: melhorCli, status: 'parcial' }
  }

  return { status: 'nao_encontrado' }
}

/**
 * Matching tolerante de Equipamento por Marca + Modelo ou Número de Série
 */
export function encontrarMelhorEquipamento(
  equipamentoRaw: string,
  equipamentos: Equipamento[],
  clienteId?: string,
): { match?: Equipamento; status: 'exato' | 'parcial' | 'nao_encontrado' } {
  const equipNorm = normalizarTexto(equipamentoRaw)
  if (!equipNorm) return { status: 'nao_encontrado' }

  // Priorizar equipamentos vinculados ao cliente se clienteId for conhecido
  const candidatos = clienteId
    ? [
        ...equipamentos.filter((e) => e.cliente_id === clienteId),
        ...equipamentos.filter((e) => e.cliente_id !== clienteId),
      ]
    : equipamentos

  // 1. Igualdade exata combinada "marca modelo"
  for (const eq of candidatos) {
    const comboNorm = normalizarTexto(`${eq.marca} ${eq.modelo}`)
    if (comboNorm === equipNorm) {
      return { match: eq, status: 'exato' }
    }
  }

  // 2. Verifica se o texto do CSV contém marca E modelo
  for (const eq of candidatos) {
    const marcaNorm = normalizarTexto(eq.marca)
    const modeloNorm = normalizarTexto(eq.modelo)
    if (
      marcaNorm &&
      modeloNorm &&
      equipNorm.includes(marcaNorm) &&
      equipNorm.includes(modeloNorm)
    ) {
      return { match: eq, status: 'exato' }
    }
  }

  // 3. Verifica se contém o modelo completo (ex: bizhub C368, 2525, L2540, M404)
  for (const eq of candidatos) {
    const modeloNorm = normalizarTexto(eq.modelo)
    if (modeloNorm.length >= 3 && equipNorm.includes(modeloNorm)) {
      return { match: eq, status: 'parcial' }
    }
  }

  // 4. Se o texto contiver o número de série de algum equipamento
  for (const eq of candidatos) {
    const snNorm = normalizarTexto(eq.numero_serie)
    if (snNorm.length >= 4 && equipNorm.includes(snNorm)) {
      return { match: eq, status: 'exato' }
    }
  }

  return { status: 'nao_encontrado' }
}

/**
 * Parser principal do CSV MPrint gerado pelo sistema externo de bilhetagem
 */
export function processarCsvMPrint(
  csvContent: string,
  contexto: {
    clientes: Cliente[]
    equipamentos: Equipamento[]
    contratos: Contrato[]
    faturasExistentes: Fatura[]
  },
): MPrintParseResult {
  const matriz = parseCsvLinhas(csvContent)
  if (matriz.length < 2) {
    throw new Error('O arquivo CSV parece estar vazio ou não contém linhas de dados válidas.')
  }

  // Identificar índices dos cabeçalhos
  const headerLinha = matriz[0].map((col) => normalizarTexto(col))

  const findColIndex = (termos: string[]): number => {
    return headerLinha.findIndex((col) =>
      termos.some((t) => col === normalizarTexto(t) || col.includes(normalizarTexto(t))),
    )
  }

  const idxEmpresa = findColIndex(['Empresa', 'Cliente', 'Razão Social'])
  const idxCnpj = findColIndex(['CNPJ', 'Documento', 'CPF'])
  const idxEquipamento = findColIndex(['Equipamento', 'Impressora', 'Modelo'])
  const idxIp = findColIndex(['IP'])
  const idxContadorInicial = findColIndex(['Contador Inicial', 'Leitura Inicial', 'Inicial'])
  const idxContadorFinal = findColIndex(['Contador Final', 'Leitura Final', 'Final'])
  const idxConsumo = findColIndex(['Consumo (Páginas)', 'Consumo', 'Páginas'])
  const idxValorPagina = findColIndex(['Valor por Página (R$)', 'Valor por Página', 'Tarifa'])
  const idxValorTotal = findColIndex(['Valor Total (R$)', 'Valor Total', 'Total'])
  const idxPeriodo = findColIndex(['Período', 'Periodo', 'Competência', 'Mes'])
  const idxOrigem = findColIndex(['Origem Coleta', 'Origem', 'Coleta'])

  if (idxEmpresa === -1 || idxEquipamento === -1) {
    throw new Error(
      'Cabeçalho CSV incompatível: colunas "Empresa" e "Equipamento" são obrigatórias.',
    )
  }

  const linhasProcessadas: MPrintLinhaProcessada[] = []
  let totalConsolidadoCsv: MPrintParseResult['totalConsolidadoCsv'] | undefined = undefined

  // Percorrer a partir da linha 1 (ignorar cabeçalho na linha 0)
  for (let i = 1; i < matriz.length; i++) {
    const rawCols = matriz[i]
    if (rawCols.length === 0 || rawCols.every((c) => !c.trim())) continue

    const empresaRaw = (rawCols[idxEmpresa] || '').trim()
    const equipamentoRaw = (rawCols[idxEquipamento] || '').trim()

    // Verificar se é a linha final "TOTAL CONSOLIDADO"
    const empresaNorm = normalizarTexto(empresaRaw)
    const equipNorm = normalizarTexto(equipamentoRaw)
    if (
      empresaNorm.includes('total consolidado') ||
      empresaNorm.includes('consolidado') ||
      equipNorm.includes('total consolidado')
    ) {
      totalConsolidadoCsv = {
        equipamentosTexto: rawCols[idxEquipamento] || '',
        consumoPaginas:
          idxConsumo !== -1 ? Math.round(parseNumeroBr(rawCols[idxConsumo])) : undefined,
        valorTotal: idxValorTotal !== -1 ? parseNumeroBr(rawCols[idxValorTotal]) : undefined,
        periodo: idxPeriodo !== -1 ? rawCols[idxPeriodo] : undefined,
      }
      continue // Linha de totalizador é ignorada no processamento de faturas
    }

    const cnpjRaw = idxCnpj !== -1 ? (rawCols[idxCnpj] || '').trim() : ''
    const ipRaw = idxIp !== -1 ? (rawCols[idxIp] || '').trim() : ''
    const cInicial =
      idxContadorInicial !== -1 ? Math.round(parseNumeroBr(rawCols[idxContadorInicial])) : 0
    const cFinal =
      idxContadorFinal !== -1 ? Math.round(parseNumeroBr(rawCols[idxContadorFinal])) : 0
    const consumoRaw = idxConsumo !== -1 ? Math.round(parseNumeroBr(rawCols[idxConsumo])) : 0
    const consumoCalculado = consumoRaw > 0 ? consumoRaw : Math.max(0, cFinal - cInicial)

    const valorPaginaCsv = idxValorPagina !== -1 ? parseNumeroBr(rawCols[idxValorPagina]) : 0
    const valorTotalCsv = idxValorTotal !== -1 ? parseNumeroBr(rawCols[idxValorTotal]) : 0
    const periodoRaw = idxPeriodo !== -1 ? (rawCols[idxPeriodo] || '').trim() : ''
    const origemColeta = idxOrigem !== -1 ? (rawCols[idxOrigem] || '').trim() : 'MPrint'

    const { dataInicio, dataFim, mesReferencia } = parsePeriodoMPrint(periodoRaw)

    // 1. Matching do Cliente
    const cliResult = encontrarMelhorCliente(empresaRaw, cnpjRaw, contexto.clientes)
    const clienteMatch = cliResult.match

    // 2. Matching do Equipamento
    const eqResult = encontrarMelhorEquipamento(
      equipamentoRaw,
      contexto.equipamentos,
      clienteMatch?.id,
    )
    const equipamentoMatch = eqResult.match

    // 3. Localizar Contrato ativo do par Cliente/Equipamento
    let contratoMatch: Contrato | undefined = undefined
    if (clienteMatch && equipamentoMatch) {
      contratoMatch = contexto.contratos.find(
        (c) =>
          c.cliente_id === clienteMatch.id &&
          c.equipamento_id === equipamentoMatch.id &&
          c.status === 'ativo',
      )
      if (!contratoMatch) {
        // Tentar qualquer contrato do cliente
        contratoMatch = contexto.contratos.find(
          (c) => c.cliente_id === clienteMatch.id && c.status === 'ativo',
        )
      }
    } else if (equipamentoMatch) {
      contratoMatch = contexto.contratos.find(
        (c) => c.equipamento_id === equipamentoMatch.id && c.status === 'ativo',
      )
    }

    // 4. Tarifação: se o CSV trouxe 0,00, usar do contrato
    let valorPorPaginaFinal = valorPaginaCsv
    let origemTarifa: MPrintLinhaProcessada['origemTarifa'] = 'csv'

    if (valorPorPaginaFinal <= 0 && contratoMatch?.valor_pagina_excedente) {
      valorPorPaginaFinal = contratoMatch.valor_pagina_excedente
      origemTarifa = 'contrato'
    } else if (valorPorPaginaFinal <= 0) {
      valorPorPaginaFinal = 0.08 // sugestão padrão se não houver no contrato
      origemTarifa = 'padrao'
    }

    // Recalcular valor total: se o CSV já tinha valor > 0 e coerente, ou recalcular consumo * valorPagina
    let valorTotalFinal = valorTotalCsv
    if (valorTotalFinal <= 0) {
      // Se há contrato com valor fixo mensal, somar base + excedentes
      if (contratoMatch && contratoMatch.modalidade !== 'apenas_excedentes') {
        const franquia = contratoMatch.paginas_contratadas_mensais || 0
        const excedentes = Math.max(0, consumoCalculado - franquia)
        const valorExced = excedentes * valorPorPaginaFinal
        valorTotalFinal = (contratoMatch.valor_mensal || 0) + valorExced
      } else {
        valorTotalFinal = consumoCalculado * valorPorPaginaFinal
      }
    }

    // 5. Detectar duplicidade de fatura: mesmo cliente + equipamento/contrato + período
    let duplicada = false
    let faturaExistenteId: string | undefined = undefined
    let motivoDuplicidade: string | undefined = undefined

    if (clienteMatch) {
      const faturaJaCriada = contexto.faturasExistentes.find((f) => {
        if (f.cliente_id !== clienteMatch.id) return false
        if (f.status === 'cancelada') return false
        if (f.mes_referencia !== mesReferencia) return false

        // Se ambos tiverem contrato vinculado
        if (contratoMatch && f.contrato_id === contratoMatch.id) return true

        return true
      })

      if (faturaJaCriada) {
        duplicada = true
        faturaExistenteId = faturaJaCriada.id
        motivoDuplicidade = `Já existe fatura (${faturaJaCriada.status}) para ${clienteMatch.nome_razao_social} na competência ${mesReferencia}.`
      }
    }

    const linhaId = `mprint-${i}-${Date.now().toString(36)}`

    linhasProcessadas.push({
      id: linhaId,
      linhaIndex: i,
      empresaRaw,
      cnpjRaw,
      equipamentoRaw,
      ipRaw,
      periodoRaw,
      dataInicio,
      dataFim,
      mesReferencia,
      contadorInicial: cInicial,
      contadorFinal: cFinal,
      consumoCalculado,
      origemColeta,

      clienteId: clienteMatch?.id,
      clienteMatch,
      clienteStatus: cliResult.status,

      equipamentoId: equipamentoMatch?.id,
      equipamentoMatch,
      equipamentoStatus: eqResult.status,

      contratoId: contratoMatch?.id,
      contratoMatch,

      valorPorPagina: valorPorPaginaFinal,
      origemTarifa,
      valorTotalCalculado: Number(valorTotalFinal.toFixed(2)),

      duplicada,
      faturaExistenteId,
      motivoDuplicidade,
      // Desmarcar se duplicada ou se faltar cliente/equipamento para forçar conferência
      selecionada: !duplicada && Boolean(clienteMatch) && Boolean(equipamentoMatch),
    })
  }

  const clientesEncontrados = linhasProcessadas.filter((l) => l.clienteId).length
  const equipamentosEncontrados = linhasProcessadas.filter((l) => l.equipamentoId).length
  const duplicidadesDetectadas = linhasProcessadas.filter((l) => l.duplicada).length
  const totalPaginas = linhasProcessadas.reduce((acc, l) => acc + l.consumoCalculado, 0)
  const totalValor = linhasProcessadas.reduce((acc, l) => acc + l.valorTotalCalculado, 0)

  return {
    linhas: linhasProcessadas,
    totalConsolidadoCsv,
    resumo: {
      totalLinhasCsv: matriz.length - 1,
      linhasValidas: linhasProcessadas.length,
      clientesEncontrados,
      equipamentosEncontrados,
      duplicidadesDetectadas,
      totalPaginas,
      totalValor: Number(totalValor.toFixed(2)),
    },
  }
}
