import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  ShoppingCart,
  Plus,
  Trash2,
  Printer,
  User,
  CreditCard,
  FileText,
  AlertCircle,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { GraficaProduto, GraficaVenda, GraficaItemCupom, GraficaCaixa, Cliente } from '@/types'
import { graficaService } from '@/services/grafica'
import { formatCurrency } from '@/lib/formatters'

interface ModalPdvCupomProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  caixaAberto: GraficaCaixa | null
  produtos: GraficaProduto[]
  clientes?: Cliente[]
  clienteGrafica?: Cliente | null
  clienteGraficaConfigurado?: Cliente | null
  cabecalhoPersonalizado?: string
  operadorUserId?: string
  onVendaConcluida?: (venda: GraficaVenda) => void
  onVendaFinalizada?: (venda: GraficaVenda) => void
}

export function ModalPdvCupom({
  open,
  onOpenChange,
  caixaAberto,
  produtos,
  clientes = [],
  clienteGrafica,
  clienteGraficaConfigurado,
  cabecalhoPersonalizado,
  operadorUserId,
  onVendaConcluida,
  onVendaFinalizada,
}: ModalPdvCupomProps) {
  const { toast } = useToast()

  // Dados do cliente (opcionais)
  const [clienteSelecionadoId, setClienteSelecionadoId] = useState<string>('')
  const [clienteNome, setClienteNome] = useState<string>('')
  const [clienteDocumento, setClienteDocumento] = useState<string>('')
  const [clienteTelefone, setClienteTelefone] = useState<string>('')

  // Itens do cupom
  const [itensCupom, setItensCupom] = useState<GraficaItemCupom[]>([])

  // Formulário de adição de item ao cupom
  const [itemProdutoId, setItemProdutoId] = useState<string>('')
  const [itemDescricao, setItemDescricao] = useState<string>('')
  const [itemQuantidade, setItemQuantidade] = useState<number>(1)
  const [itemPrecoUnit, setItemPrecoUnit] = useState<number>(0)
  const [itemCustoUnit, setItemCustoUnit] = useState<number>(0)

  // Pagamento e observações
  const [formaPagamento, setFormaPagamento] = useState<GraficaVenda['forma_pagamento']>('dinheiro')
  const [observacoes, setObservacoes] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Ao selecionar um cliente cadastrado
  const handleSelecionarClienteCadastrado = (cliId: string) => {
    setClienteSelecionadoId(cliId)
    if (cliId === 'avulso') {
      setClienteNome('')
      setClienteDocumento('')
      setClienteTelefone('')
      return
    }
    const cli = clientes.find((c) => c.id === cliId)
    if (cli) {
      setClienteNome(cli.nome_razao_social)
      setClienteDocumento(cli.documento || '')
      setClienteTelefone(cli.telefone || '')
    }
  }

  // Ao selecionar um produto do catálogo
  const handleSelecionarProduto = (prodId: string) => {
    setItemProdutoId(prodId)
    const prod = produtos.find((p) => p.id === prodId)
    if (prod) {
      setItemDescricao(prod.nome)
      setItemPrecoUnit(prod.preco_venda || 0)
      setItemCustoUnit(prod.custo_unitario || 0)
    }
  }

  // Adicionar item à lista do cupom (antes de finalizar)
  const handleAdicionarItemAoCupom = (e: React.FormEvent) => {
    e.preventDefault()
    if (!itemDescricao.trim()) {
      toast({
        variant: 'destructive',
        title: 'Descrição necessária',
        description: 'Selecione ou digite a descrição do produto/serviço.',
      })
      return
    }

    if (itemQuantidade <= 0) {
      toast({
        variant: 'destructive',
        title: 'Quantidade inválida',
        description: 'Informe uma quantidade maior que zero.',
      })
      return
    }

    const subtotal = Number((itemQuantidade * itemPrecoUnit).toFixed(2))

    const novoItem: GraficaItemCupom = {
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      produto_id: itemProdutoId || undefined,
      descricao: itemDescricao.trim(),
      quantidade: Number(itemQuantidade),
      preco_unitario: Number(itemPrecoUnit),
      custo_unitario: Number(itemCustoUnit),
      subtotal,
      valor_total: subtotal,
      custo_total: Number((itemQuantidade * itemCustoUnit).toFixed(2)),
    }

    setItensCupom((prev) => [...prev, novoItem])

    // Limpar campos de entrada do item
    setItemProdutoId('')
    setItemDescricao('')
    setItemQuantidade(1)
    setItemPrecoUnit(0)
    setItemCustoUnit(0)
  }

  // Remover item do cupom antes de finalizar
  const handleRemoverItem = (itemId: string) => {
    setItensCupom((prev) => prev.filter((i) => i.id !== itemId))
  }

  // Cálculos do cupom
  const totalCupom = itensCupom.reduce((acc, it) => acc + (it.valor_total ?? it.subtotal ?? 0), 0)
  const totalCusto = itensCupom.reduce(
    (acc, it) => acc + (it.custo_total ?? (it.custo_unitario || 0) * it.quantidade),
    0,
  )
  const lucroEstimado = totalCupom - totalCusto

  // Finalizar e emitir cupom
  const handleFinalizarCupom = async () => {
    if (!caixaAberto) {
      toast({
        variant: 'destructive',
        title: 'Caixa Fechado',
        description: 'Abra o caixa do dia antes de emitir cupons de venda.',
      })
      return
    }

    if (itensCupom.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Cupom Vazio',
        description: 'Adicione pelo menos um produto ou serviço ao cupom antes de finalizar.',
      })
      return
    }

    setIsSubmitting(true)
    try {
      const vendaCriada = await graficaService.registrarVendaCupom({
        caixa_id: caixaAberto.id,
        operador_user_id: operadorUserId,
        itens: itensCupom,
        forma_pagamento: formaPagamento,
        cliente_nome: clienteNome.trim() || undefined,
        cliente_documento: clienteDocumento.trim() || undefined,
        cliente_telefone: clienteTelefone.trim() || undefined,
        observacoes: observacoes.trim() || undefined,
        darBaixaInsumo: true,
      })

      toast({
        title: 'Cupom emitido com sucesso!',
        description: `Venda #${vendaCriada.numero_cupom || vendaCriada.id.slice(0, 6)} registrada com ${itensCupom.length} item(ns).`,
      })

      // Resetar estado
      setItensCupom([])
      setClienteSelecionadoId('')
      setClienteNome('')
      setClienteDocumento('')
      setClienteTelefone('')
      setObservacoes('')
      onOpenChange(false)

      // Notificar para abrir impressão
      onVendaConcluida?.(vendaCriada)
      onVendaFinalizada?.(vendaCriada)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao emitir cupom',
        description: err.message || 'Falha ao registrar venda.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] flex flex-col p-4 sm:p-6">
        <DialogHeader className="pb-2 border-b">
          <DialogTitle className="flex items-center justify-between text-blue-900">
            <span className="flex items-center gap-2 text-base font-bold">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
              PDV Gráfica Rápida — Abrir Novo Cupom de Venda
            </span>
            {caixaAberto && (
              <Badge
                variant="outline"
                className="bg-emerald-50 text-emerald-800 border-emerald-300 font-mono text-[11px]"
              >
                Caixa #{caixaAberto.id.slice(0, 6)} Aberto
              </Badge>
            )}
          </DialogTitle>
          <p className="text-xs text-gray-500">
            Adicione múltiplos produtos e serviços no mesmo cupom. Os insumos terão baixa automática
            ao finalizar.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 py-1 text-xs">
          {/* BLOCO 1: DADOS DO CLIENTE (OPCIONAL) */}
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-800 flex items-center gap-1.5">
                <User className="w-4 h-4 text-blue-600" />
                Dados do Cliente (Opcional — saem impressos no cupom)
              </span>
              <span className="text-[11px] text-gray-500">Não bloqueia a venda se vazio</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <div className="sm:col-span-1 space-y-1">
                <Label htmlFor="cli-rapido" className="text-[11px] text-gray-600">
                  Buscar no Cadastro
                </Label>
                <Select
                  value={clienteSelecionadoId || 'avulso'}
                  onValueChange={handleSelecionarClienteCadastrado}
                >
                  <SelectTrigger id="cli-rapido" className="h-8 text-xs bg-white">
                    <SelectValue placeholder="Balcão Avulso" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="avulso">Balcão Avulso / Digitar</SelectItem>
                    {clientes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome_razao_social}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-1 space-y-1">
                <Label htmlFor="cli-nome" className="text-[11px] text-gray-600">
                  Nome do Cliente
                </Label>
                <Input
                  id="cli-nome"
                  placeholder="Ex: João Silva / Balcão"
                  value={clienteNome}
                  onChange={(e) => setClienteNome(e.target.value)}
                  className="h-8 text-xs bg-white"
                />
              </div>

              <div className="sm:col-span-1 space-y-1">
                <Label htmlFor="cli-doc" className="text-[11px] text-gray-600">
                  CNPJ / CPF
                </Label>
                <Input
                  id="cli-doc"
                  placeholder="000.000.000-00"
                  value={clienteDocumento}
                  onChange={(e) => setClienteDocumento(e.target.value)}
                  className="h-8 text-xs bg-white font-mono"
                />
              </div>

              <div className="sm:col-span-1 space-y-1">
                <Label htmlFor="cli-tel" className="text-[11px] text-gray-600">
                  Telefone / WhatsApp
                </Label>
                <Input
                  id="cli-tel"
                  placeholder="(00) 00000-0000"
                  value={clienteTelefone}
                  onChange={(e) => setClienteTelefone(e.target.value)}
                  className="h-8 text-xs bg-white"
                />
              </div>
            </div>
          </div>

          {/* BLOCO 2: ADICIONAR ITENS AO CUPOM */}
          <div className="p-3 bg-blue-50/40 rounded-xl border border-blue-200 space-y-2.5">
            <span className="font-semibold text-blue-900 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-blue-600" />
              Adicionar Produto ou Serviço ao Cupom
            </span>

            <form onSubmit={handleAdicionarItemAoCupom} className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                <div className="sm:col-span-4 space-y-1">
                  <Label htmlFor="pdv-prod" className="text-[11px] text-gray-600">
                    Catálogo de Insumos / Papéis
                  </Label>
                  <Select value={itemProdutoId} onValueChange={handleSelecionarProduto}>
                    <SelectTrigger id="pdv-prod" className="h-8 text-xs bg-white">
                      <SelectValue placeholder="Selecione ou digite ao lado..." />
                    </SelectTrigger>
                    <SelectContent>
                      {produtos.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nome} — {formatCurrency(p.preco_venda)} (Estoque:{' '}
                          {p.estoque_atual || 0})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="sm:col-span-3 space-y-1">
                  <Label htmlFor="pdv-desc" className="text-[11px] text-gray-600">
                    Descrição do Item *
                  </Label>
                  <Input
                    id="pdv-desc"
                    placeholder="Ex: Cópia A4 Mono, Banner 60x90..."
                    value={itemDescricao}
                    onChange={(e) => setItemDescricao(e.target.value)}
                    required
                    className="h-8 text-xs bg-white"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <Label htmlFor="pdv-qtd" className="text-[11px] text-gray-600">
                    Qtd *
                  </Label>
                  <Input
                    id="pdv-qtd"
                    type="number"
                    min="1"
                    value={itemQuantidade}
                    onChange={(e) => setItemQuantidade(Math.max(1, parseInt(e.target.value) || 1))}
                    required
                    className="h-8 w-20 mx-auto text-xs bg-white font-mono font-semibold text-center"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <Label htmlFor="pdv-prc" className="text-[11px] text-gray-600">
                    Preço Un. (R$) *
                  </Label>
                  <Input
                    id="pdv-prc"
                    type="number"
                    step="0.01"
                    min="0"
                    value={itemPrecoUnit}
                    onChange={(e) => setItemPrecoUnit(parseFloat(e.target.value) || 0)}
                    required
                    className="h-8 text-xs bg-white font-mono text-right"
                  />
                </div>

                <div className="sm:col-span-1 flex items-end">
                  <Button
                    type="submit"
                    size="sm"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs"
                    title="Adicionar item ao cupom"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </form>
          </div>

          {/* BLOCO 3: LISTAGEM DE ITENS DO CUPOM */}
          <div className="border rounded-xl bg-white overflow-hidden shadow-2xs">
            <div className="p-2.5 bg-gray-50 border-b flex items-center justify-between">
              <span className="font-semibold text-gray-800 text-xs flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-600" />
                Itens Adicionados a este Cupom ({itensCupom.length})
              </span>
              <span className="text-[11px] text-gray-500">
                Remover item aqui não consome nem altera o estoque.
              </span>
            </div>

            {itensCupom.length === 0 ? (
              <div className="p-6 text-center text-gray-400 space-y-1">
                <ShoppingCart className="w-8 h-8 mx-auto text-gray-300" />
                <p className="text-xs">Nenhum item adicionado ao cupom ainda.</p>
                <p className="text-[11px] text-gray-400">
                  Preencha os campos acima e clique em &quot;+&quot; para adicionar produtos e
                  serviços.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[180px]">
                <Table className="text-xs">
                  <TableHeader className="bg-gray-50/80 sticky top-0">
                    <TableRow>
                      <TableHead className="w-12 text-center">#</TableHead>
                      <TableHead>Produto / Serviço</TableHead>
                      <TableHead className="text-center w-16">Qtd</TableHead>
                      <TableHead className="text-right w-24">Preço Un.</TableHead>
                      <TableHead className="text-right w-24">Subtotal</TableHead>
                      <TableHead className="w-10 text-center"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itensCupom.map((it, idx) => (
                      <TableRow key={it.id || idx} className="hover:bg-blue-50/40">
                        <TableCell className="text-center font-mono text-gray-500">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="font-medium text-gray-900">{it.descricao}</TableCell>
                        <TableCell className="text-center font-mono font-semibold">
                          {it.quantidade}
                        </TableCell>
                        <TableCell className="text-right font-mono text-gray-700">
                          {formatCurrency(it.preco_unitario)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-blue-900">
                          {formatCurrency(it.valor_total ?? it.subtotal ?? 0)}
                        </TableCell>
                        <TableCell className="text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoverItem(it.id!)}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            title="Remover este item do cupom"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Totais do cupom */}
            {itensCupom.length > 0 && (
              <div className="p-3 bg-gray-50 border-t flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-4 text-gray-600">
                  <span>
                    Total de Itens:{' '}
                    <strong>{itensCupom.reduce((a, b) => a + b.quantidade, 0)}</strong>
                  </span>
                  <span>
                    Lucro Estimado:{' '}
                    <strong className="text-emerald-700 font-mono">
                      {formatCurrency(lucroEstimado)}
                    </strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase text-gray-600 font-semibold">
                    Valor Total do Cupom:
                  </span>
                  <span className="text-base font-extrabold text-blue-900 font-mono">
                    {formatCurrency(totalCupom)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* BLOCO 4: FORMA DE PAGAMENTO E OBSERVAÇÕES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <Label
                htmlFor="pdv-pgto"
                className="flex items-center gap-1 text-[11px] text-gray-700"
              >
                <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                Forma de Pagamento
              </Label>
              <Select value={formaPagamento} onValueChange={(val: any) => setFormaPagamento(val)}>
                <SelectTrigger id="pdv-pgto" className="h-8 text-xs bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dinheiro">Dinheiro em Espécie</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                  <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                  <SelectItem value="a_prazo">A Prazo / Faturado</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="pdv-obs" className="text-[11px] text-gray-700">
                Observações do Cupom
              </Label>
              <Input
                id="pdv-obs"
                placeholder="Ex: Entregar com nota, cliente busca amanhã..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="h-8 text-xs bg-white"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2 border-t flex flex-row items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>

          <Button
            type="button"
            size="sm"
            disabled={isSubmitting || itensCupom.length === 0}
            onClick={handleFinalizarCupom}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2 font-semibold"
          >
            <Printer className="w-4 h-4" />
            {isSubmitting
              ? 'Finalizando e Dando Baixa...'
              : `Finalizar Cupom (${formatCurrency(totalCupom)})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
