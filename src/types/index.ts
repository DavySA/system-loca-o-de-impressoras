export type UserRole = 'administrador' | 'tecnico' | 'cliente'

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
  contador_atual?: number
  assinatura_desenho?: string
  parecer_tecnico?: string
  status: 'aberta' | 'em_andamento' | 'aguardando_peca' | 'concluida'
  created: string
  updated: string
  expand?: {
    cliente_id?: Cliente
    equipamento_id?: Equipamento
    servico_id?: Servico
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
  created: string
  updated: string
  expand?: {
    cliente_id?: Cliente
    contrato_id?: Contrato
  }
}

export interface AppUser {
  id: string
  email: string
  name?: string
  avatar?: string
  role?: UserRole
  cliente_id?: string
  expand?: {
    cliente_id?: Cliente
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
  equipamento_id: string
  data: string
  tipo: TipoSuprimento
  item: string
  quantidade: number
  custo: number
  observacoes?: string
  created: string
  updated: string
  expand?: {
    equipamento_id?: Equipamento
  }
}
