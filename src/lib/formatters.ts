export function formatCurrency(value?: number | null): string {
  if (value === undefined || value === null || isNaN(value)) {
    return 'R$ 0,00'
  }
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatCompactCurrency(value?: number | null): string {
  if (!value) return 'R$ 0'
  if (value >= 1000) {
    const k = (value / 1000).toFixed(1).replace('.0', '')
    return `R$ ${k}k`
  }
  return formatCurrency(value)
}

export function formatDate(dateString?: string | null): string {
  if (!dateString) return '-'
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return '-'
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return '-'
  }
}

export function formatDateTime(dateString?: string | null): string {
  if (!dateString) return '-'
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return '-'
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '-'
  }
}

export function formatMonthYear(monthStr?: string): string {
  if (!monthStr) return '-'
  // Formato YYYY-MM
  const parts = monthStr.split('-')
  if (parts.length === 2) {
    const [year, month] = parts
    const months = [
      'Jan',
      'Fev',
      'Mar',
      'Abr',
      'Mai',
      'Jun',
      'Jul',
      'Ago',
      'Set',
      'Out',
      'Nov',
      'Dez',
    ]
    const mIdx = parseInt(month, 10) - 1
    if (mIdx >= 0 && mIdx < 12) {
      return `${months[mIdx]}/${year}`
    }
  }
  return monthStr
}

export function formatOSCode(idOrSeq?: string): string {
  if (!idOrSeq) return 'OS-0000'
  // Se for o ID padrão do pocketbase (15 chars), pega os últimos 4 em maiúsculas
  if (idOrSeq.length >= 4) {
    const suffix = idOrSeq.slice(-4).toUpperCase()
    return `OS-${suffix}`
  }
  return `OS-${idOrSeq.padStart(4, '0')}`
}

export function formatCnpjCpf(value: string): string {
  const clean = value.replace(/\D/g, '')
  if (clean.length <= 11) {
    // CPF: 000.000.000-00
    return clean
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
      .slice(0, 14)
  }
  // CNPJ: 00.000.000/0000-00
  return clean
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .slice(0, 18)
}

export function formatPhone(value: string): string {
  const clean = value.replace(/\D/g, '')
  if (clean.length <= 10) {
    // (11) 1234-5678
    return clean
      .replace(/^(\d{2})(\d)/g, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .slice(0, 14)
  }
  // (11) 91234-5678
  return clean
    .replace(/^(\d{2})(\d)/g, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .slice(0, 15)
}
