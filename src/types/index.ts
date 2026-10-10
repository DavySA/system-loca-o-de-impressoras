export type UserRole = 'administrador' | 'tecnico' | 'cliente' | 'operador'

export type ModuloSistema =
  | 'dashboard'
  | 'clientes'
  | 'equipamentos'
  | 'ordens_servico'
  | 'faturamento'
  | 'suprimentos'
  | 'grafica_rapida'
  | 'comissoes_metas'
  | 'relatorios'
  | 'servicos'
  | 'usuarios'
  | 'personalizar'
  | 'meu_contrato'

export interface AppUser {
  id: string
  email: string
  name?: string
  avatar?: string
  role?: UserRole
  cliente_id?: string
  permissoes?: ModuloSistema[]
  expand?: {
    cliente_id?: Cliente
  }
}

export interface Cliente {
  id: string
  nome_razao_social: string
  tipo: 'Pessoa Jurídica' | 'Pessoa Física'
  documento?: string
  email?: string
  telefone?: string
  cidade?: string
  uf?: string
  endereco?: string
  status: 'ativo' | 'inativo'
  contrato_digital?: string // Arquivo de contrato escaneado e assinado (PDF/imagem)
  created: string
  updated: string
}

export interface Equipamento {
  id: string
  marca: string
  modelo: string
  numero_serie: string
  numero_patrimonio?: string
  contador_monocromatico: number
  contador_colorido: number
  data_aquisicao?: string
  status: 'disponivel' | 'locado' | 'em_manutencao' | 'inativo'
  tipo?: string
  colorida?: boolean
  created: string
  updated: string
  expand?: {
    contrato_atual?: Contrato
  }
}

export interface Contrato {
  id: string
  cliente_id: string
  equipamento_id: string
  numero_contrato?: string
  duracao_meses?: number
  modalidade?: 'com_franquia' | 'apenas_excedentes'
  valor_scanner?: number
  outros_servicos?: string
  data_inicio: string
  data_fim?: string
  valor_mensal: number
  paginas_contratadas_mensais: number
  valor_pagina_excedente: number
  status: 'ativo' | 'inativo' | 'encerrado'
  created: string
  updated: string
  expand?: {
    cliente_id?: Cliente
    equipamento_id?: Equipamento
  }
}

export interface Servico {
  id: string
  nome: string
  descricao?: string
  categoria:
    | 'Manutenção Preventiva'
    | 'Manutenção Corretiva'
    | 'Instalação'
    | 'Suprimentos'
    | 'Visita Técnica'
  preco: number
  duracao_estimada?: string
  created: string
  updated: string
}

export interface OrdemServico {
  id: string
  cliente_id: string
  equipamento_id: string
  servico_id: string
  prioridade: 'baixa' | 'media' | 'alta'
  descricao_problema: string
  data_agendada?: string
  data_abertura?: string
  data_conclusao?: string
  tecnico_responsavel?: string
  tecnico_user_id?: string
  tipo_atendimento?: 'contrato' | 'particular'
  valor_servico?: number
  valor_pecas?: number
  valor_total_particular?: number
  contador_atual?: number
  assinatura_desenho?: string
  assinatura_nome?: string
  assinatura_cpf?: string
  parecer_tecnico?: string
  status: 'aberta' | 'em_andamento' | 'aguardando_peca' | 'concluida'
  created: string
  updated: string
  expand?: {
    cliente_id?: Cliente
    equipamento_id?: Equipamento
    servico_id?: Servico
    tecnico_user_id?: AppUser
  }
}

export interface OSPeca {
  id: string
  os_id: string
  suprimento_id: string
  descricao_item: string
  quantidade: number
  custo_unitario?: number
  valor_cobrado?: number
  created: string
  updated: string
  expand?: {
    suprimento_id?: Suprimento
    os_id?: OrdemServico
  }
}

export interface AtualizacaoOS {
  id: string
  os_id: string
  autor: string
  comentario: string
  status_na_ocasiao: 'aberta' | 'em_andamento' | 'aguardando_peca' | 'concluida'
  created: string
  updated: string
}

export interface Fatura {
  id: string
  contrato_id: string
  cliente_id: string
  mes_referencia: string
  paginas_contratadas: number
  paginas_consumidas: number
  paginas_excedentes: number
  valor_base: number
  valor_excedente: number
  valor_total: number
  status: 'gerada' | 'paga' | 'vencida' | 'cancelada'
  leitura_anterior_mono?: number
  leitura_atual_mono?: number
  leitura_anterior_color?: number
  leitura_atual_color?: number
  desconto?: number
  acrescimo_servicos?: number
  observacoes?: string
  data_vencimento?: string
  enviada_email_em?: string
  enviada_email_para?: string
  criado_por_user_id?: string
  boleto_pdf?: string
  created: string
  updated: string
  expand?: {
    cliente_id?: Cliente
    contrato_id?: Contrato
    criado_por_user_id?: AppUser
  }
}

// ----------------------------------------------------
// INTEGRAÇÃO BANCO CORA & COBRANÇAS / BOLETOS
// ----------------------------------------------------

export interface IntegracaoCoraConfig {
  id: string
  ativo: boolean
  ambiente: 'sandbox' | 'producao'
  client_id?: string
  client_secret?: string
  chave_pix?: string
  certificado_nome?: string
  instrucoes_padrao?: string
  juros_mensal_percentual?: number
  multa_percentual?: number
  created: string
  updated: string
}

export interface CobrancaBoleto {
  id: string
  fatura_id: string
  status: 'pendente' | 'gerado' | 'pago' | 'cancelado'
  cora_invoice_id?: string
  valor: number
  data_vencimento?: string
  codigo_barras?: string
  linha_digitavel?: string
  pix_copia_cola?: string
  pix_qr_code_url?: string
  pdf_url?: string
  criado_por_user_id?: string
  created: string
  updated: string
  expand?: {
    fatura_id?: Fatura
    criado_por_user_id?: AppUser
  }
}

// ----------------------------------------------------
// COMISSÕES & METAS
// ----------------------------------------------------

export type PeriodoMeta = 'mensal' | 'trimestral' | 'semestral' | 'anual'

export type MetricaMeta =
  | 'vendas_insumos_grafica'
  | 'servicos_grafica'
  | 'os_particulares'
  | 'faturamento_gerado'
  | 'atendimentos_concluidos'

export type StatusMeta = 'em_andamento' | 'atingida' | 'nao_atingida' | 'cancelada'

export interface MetaColaborador {
  id: string
  user_id: string
  titulo: string
  periodo: PeriodoMeta
  mes_ano_referencia?: string // Ex: "2025-05"
  data_inicio?: string
  data_fim?: string
  tipo_metrica: MetricaMeta
  valor_objetivo: number
  tipo_comissao?: 'percentual' | 'valor_fixo'
  valor_comissao?: number
  status: StatusMeta
  observacoes?: string
  created: string
  updated: string
  expand?: {
    user_id?: AppUser
  }
}

export interface ConfiguracoesEmpresa {
  id: string
  razao_social: string
  nome_fantasia?: string
  cnpj?: string
  inscricao_estadual?: string
  endereco?: string
  cidade?: string
  uf?: string
  telefone?: string
  email?: string
  website?: string
  whatsapp?: string
  instagram?: string
  facebook?: string
  linkedin?: string
  logo?: string
  mensagem_rodape?: string
  created: string
  updated: string
}

export type TipoSuprimento =
  | 'toner'
  | 'cartucho_tinta'
  | 'cilindro'
  | 'fusor'
  | 'correia'
  | 'peca'
  | 'outro'

export interface Suprimento {
  id: string
  equipamento_id?: string
  data: string
  tipo: TipoSuprimento
  item: string
  quantidade: number
  custo: number
  valor_venda?: number
  estoque_minimo?: number
  observacoes?: string
  created: string
  updated: string
  expand?: {
    equipamento_id?: Equipamento
  }
}

// ----------------------------------------------------
// NOVO MÓDULO: GESTÃO DA GRÁFICA RÁPIDA
// ----------------------------------------------------

export type CategoriaProdutoGrafica =
  | 'papel_sulfite'
  | 'papel_couche'
  | 'adesivo'
  | 'impressao'
  | 'copia'
  | 'scanner'
  | 'plastificacao'
  | 'encadernacao'
  | 'outro'

export interface GraficaProduto {
  id: string
  nome: string
  categoria: CategoriaProdutoGrafica
  formato_tamanho?: string // A4, A3, Carta, etc.
  gramatura?: string // 75g, 90g, 115g, 150g, 250g, etc.
  tipo_cor?: 'mono' | 'color' | 'ambos' | 'nao_se_aplica'
  suprimento_insumo_id?: string
  consumo_insumo_por_unidade?: number
  custo_unitario: number
  preco_venda: number
  estoque_atual?: number
  estoque_minimo?: number
  unidade_medida?: 'folha' | 'resma' | 'metro' | 'unidade' | 'cento' | 'milheiro'
  ativo?: boolean
  created: string
  updated: string
  expand?: {
    suprimento_insumo_id?: Suprimento
  }
}

export interface GraficaConfiguracao {
  id: string
  equipamentos_lotados_ids: string[]
  observacoes?: string
  created: string
  updated: string
  expand?: {
    equipamentos_lotados_ids?: Equipamento[]
  }
}

export interface GraficaCaixa {
  id: string
  data: string
  operador: string
  operador_user_id?: string
  status: 'aberto' | 'fechado'
  data_abertura: string
  data_fechamento?: string
  equipamento_id?: string
  equipamentos_ids?: string[]
  saldo_inicial?: number
  total_entradas?: number
  total_custo_insumos?: number
  lucro_total?: number
  saldo_final_dinheiro?: number
  contador_anterior_mono?: number
  contador_anterior_color?: number
  contador_abertura_mono?: number
  contador_abertura_color?: number
  contador_fechamento_mono?: number
  contador_fechamento_color?: number
  producao_mono?: number
  producao_color?: number
  observacoes_abertura?: string
  observacoes_fechamento?: string
  created: string
  updated: string
  expand?: {
    equipamento_id?: Equipamento
    equipamentos_ids?: Equipamento[]
    operador_user_id?: AppUser
  }
}

export interface GraficaCaixaContador {
  id: string
  caixa_id: string
  equipamento_id: string
  abertura_mono?: number
  abertura_color?: number
  abertura_copias?: number
  abertura_scanner?: number
  abertura_total?: number
  fechamento_mono?: number
  fechamento_color?: number
  fechamento_copias?: number
  fechamento_scanner?: number
  fechamento_total?: number
  delta_mono?: number
  delta_color?: number
  delta_copias?: number
  delta_scanner?: number
  delta_total?: number
  observacoes?: string
  created: string
  updated: string
  expand?: {
    equipamento_id?: Equipamento
    caixa_id?: GraficaCaixa
  }
}

export interface GraficaVenda {
  id: string
  caixa_id: string
  operador_user_id?: string
  data_hora: string
  produto_id?: string
  descricao: string
  quantidade: number
  preco_unitario: number
  valor_total: number
  custo_total?: number
  lucro_total?: number
  forma_pagamento?: 'dinheiro' | 'pix' | 'cartao_debito' | 'cartao_credito' | 'a_prazo' | 'outro'
  suprimento_baixado_id?: string
  quantidade_insumo_baixada?: number
  cliente_nome?: string
  observacoes?: string
  created: string
  updated: string
  expand?: {
    produto_id?: GraficaProduto
    suprimento_baixado_id?: Suprimento
    caixa_id?: GraficaCaixa
    operador_user_id?: AppUser
  }
}
