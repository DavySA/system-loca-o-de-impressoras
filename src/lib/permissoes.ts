import { ModuloSistema } from '@/types'
import {
  LayoutGrid,
  Users,
  Printer,
  ClipboardList,
  Receipt,
  Package,
  Layers,
  BarChart3,
  Wrench,
  UserCheck,
  Settings,
  FileCheck,
} from 'lucide-react'

export interface ModuloInfo {
  id: ModuloSistema
  nome: string
  descricao: string
  icon: any
  corBadge: string
  grupo: 'operacional' | 'gestao' | 'cliente'
}

export const TODOS_MODULOS: ModuloInfo[] = [
  {
    id: 'dashboard',
    nome: 'Dashboard Executivo',
    descricao: 'Indicadores gerais, faturamento do mês e chamados técnicos',
    icon: LayoutGrid,
    corBadge: 'bg-blue-50 text-blue-700 border-blue-200',
    grupo: 'gestao',
  },
  {
    id: 'clientes',
    nome: 'Clientes',
    descricao: 'Cadastro e consulta de empresas parceiras e contratos',
    icon: Users,
    corBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    grupo: 'operacional',
  },
  {
    id: 'equipamentos',
    nome: 'Equipamentos',
    descricao: 'Parque de impressoras, números de patrimônio e contadores',
    icon: Printer,
    corBadge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    grupo: 'operacional',
  },
  {
    id: 'ordens_servico',
    nome: 'Ordens de Serviço',
    descricao: 'Abertura, acompanhamento, laudos técnicos e controle de peças',
    icon: ClipboardList,
    corBadge: 'bg-amber-50 text-amber-700 border-amber-200',
    grupo: 'operacional',
  },
  {
    id: 'faturamento',
    nome: 'Faturamento',
    descricao: 'Fechamento de leituras mensais, franquias, excedentes e faturas',
    icon: Receipt,
    corBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    grupo: 'gestao',
  },
  {
    id: 'suprimentos',
    nome: 'Suprimentos & Peças',
    descricao: 'Controle de toners, cartuchos, cilindros e fusores',
    icon: Package,
    corBadge: 'bg-purple-50 text-purple-700 border-purple-200',
    grupo: 'operacional',
  },
  {
    id: 'grafica_rapida',
    nome: 'Gráfica Rápida (PDV/Caixa)',
    descricao: 'Abertura/fechamento de caixa, contadores físicos e balcão',
    icon: Layers,
    corBadge: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    grupo: 'operacional',
  },
  {
    id: 'servicos',
    nome: 'Serviços',
    descricao: 'Catálogo de manutenções preventivas, corretivas e tabelas de preço',
    icon: Wrench,
    corBadge: 'bg-teal-50 text-teal-700 border-teal-200',
    grupo: 'operacional',
  },
  {
    id: 'relatorios',
    nome: 'Relatórios Mensais',
    descricao: 'DRE gerencial, lucratividade por cliente e consumo do parque',
    icon: BarChart3,
    corBadge: 'bg-violet-50 text-violet-700 border-violet-200',
    grupo: 'gestao',
  },
  {
    id: 'usuarios',
    nome: 'Gerenciamento de Usuários',
    descricao: 'Criar contas, atribuir permissões e redefinir senhas',
    icon: UserCheck,
    corBadge: 'bg-rose-50 text-rose-700 border-rose-200',
    grupo: 'gestao',
  },
  {
    id: 'personalizar',
    nome: 'Personalizar Sistema',
    descricao: 'Logotipo da empresa, cabeçalho de O.S. e dados institucionais',
    icon: Settings,
    corBadge: 'bg-slate-50 text-slate-700 border-slate-200',
    grupo: 'gestao',
  },
  {
    id: 'meu_contrato',
    nome: 'Meu Contrato (Portal do Cliente)',
    descricao: 'Acesso ao contrato digitalizado, faturamento e chamados próprios',
    icon: FileCheck,
    corBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    grupo: 'cliente',
  },
]

// Presets padrão
export const PRESETS_PERMISSOES = {
  administrador: [
    'dashboard',
    'clientes',
    'equipamentos',
    'ordens_servico',
    'faturamento',
    'suprimentos',
    'grafica_rapida',
    'servicos',
    'relatorios',
    'usuarios',
    'personalizar',
  ] as ModuloSistema[],
  operador: [
    'clientes',
    'equipamentos',
    'ordens_servico',
    'suprimentos',
    'grafica_rapida',
    'servicos',
  ] as ModuloSistema[],
  tecnico: ['ordens_servico'] as ModuloSistema[],
  cliente: ['dashboard', 'ordens_servico', 'faturamento', 'meu_contrato'] as ModuloSistema[],
}

export function resolverPermissoesUsuario(user: {
  role?: string
  permissoes?: ModuloSistema[]
}): ModuloSistema[] {
  if (!user) return []

  // Clientes sempre têm permissões restritas e exclusivas ao seu portal
  if (user.role === 'cliente') {
    return PRESETS_PERMISSOES.cliente
  }

  // Administrador tem sempre todas as permissões
  if (user.role === 'administrador') {
    return PRESETS_PERMISSOES.administrador
  }

  // Se tem permissões explícitas salvas
  if (Array.isArray(user.permissoes) && user.permissoes.length > 0) {
    return user.permissoes
  }

  // Fallbacks de acordo com o papel histórico
  if (user.role === 'operador') {
    return PRESETS_PERMISSOES.operador
  }
  if (user.role === 'tecnico') {
    return PRESETS_PERMISSOES.tecnico
  }

  return ['ordens_servico']
}
