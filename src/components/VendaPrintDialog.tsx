import { useState, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'
import type { GraficaVenda, GraficaCaixa, ConfiguracoesEmpresa, Cliente } from '@/types'
import { VendaCupomRelatorio } from './VendaCupomRelatorio'

interface VendaPrintDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  venda: GraficaVenda | null
  caixa?: GraficaCaixa | null
  configEmpresa: ConfiguracoesEmpresa | null
  clienteGrafica?: Cliente | null
  cabecalhoPersonalizado?: string | null
}

export function VendaPrintDialog({
  open,
  onOpenChange,
  venda,
  caixa,
  configEmpresa,
  clienteGrafica,
  cabecalhoPersonalizado,
}: VendaPrintDialogProps) {
  const [formato, setFormato] = useState<'bobina' | 'a5'>('bobina')
  const printRef = useRef<HTMLDivElement>(null)

  if (!venda) return null

  // Gera uma janela dedicada contendo APENAS o cupom desta venda, com os
  // mesmos estilos da pré-visualização (Tailwind + @page do formato escolhido).
  // Corrige o bug em que window.print() imprimia a página inteira, sem formatação.
  const handlePrint = () => {
    const content = printRef.current?.innerHTML
    if (!content) return

    const printWindow = window.open('', '_blank', 'width=680,height=800')
    if (!printWindow) {
      window.print()
      return
    }

    const pageSizeStyle =
      formato === 'bobina'
        ? `@page { size: 80mm auto; margin: 4mm 4mm; } body { width: 100%; max-width: 80mm; margin: 0 auto; }`
        : `@page { size: A5 portrait; margin: 8mm 8mm; } body { width: 100%; max-width: 148mm; margin: 0 auto; }`

    printWindow.document.open()
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <title>Cupom de Venda ${venda.numero_cupom ? `#${venda.numero_cupom}` : ''} - STD</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            ${pageSizeStyle}
            @media print {
              body {
                font-family: monospace, -apple-system, sans-serif;
                color: #000;
                background-color: #fff;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                padding: 0 !important;
              }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body class="p-2 bg-white flex justify-center">
          <div style="width: 100%;">
            ${content}
          </div>
          <script>
            window.addEventListener('load', () => {
              setTimeout(() => {
                window.focus();
                window.print();
              }, 350);
            });
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[92vh] flex flex-col p-4">
        <DialogHeader className="pb-2 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base flex items-center gap-2 text-blue-900">
              <Printer className="w-4 h-4 text-blue-600" />
              Imprimir Cupom da Venda {venda.numero_cupom ? `#${venda.numero_cupom}` : ''}
            </DialogTitle>
            <div className="flex gap-1 mr-6">
              <Button
                size="sm"
                variant={formato === 'bobina' ? 'default' : 'outline'}
                className="h-7 text-xs px-2.5"
                onClick={() => setFormato('bobina')}
              >
                Bobina 80mm
              </Button>
              <Button
                size="sm"
                variant={formato === 'a5' ? 'default' : 'outline'}
                className="h-7 text-xs px-2.5"
                onClick={() => setFormato('a5')}
              >
                Folha A5
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Pré-visualização do cupom com scroll */}
        <div className="flex-1 overflow-y-auto py-2 bg-gray-100 rounded-md p-2 flex justify-center">
          <div ref={printRef} className="w-full">
            <VendaCupomRelatorio
              venda={venda}
              caixa={caixa}
              configEmpresa={configEmpresa}
              clienteGrafica={clienteGrafica}
              cabecalhoPersonalizado={cabecalhoPersonalizado}
              formato={formato}
            />
          </div>
        </div>

        <DialogFooter className="pt-2 border-t flex justify-between sm:justify-between items-center">
          <p className="text-[11px] text-gray-500">
            Dica: Configure as margens como &quot;Nenhuma&quot; no diálogo do navegador para bobina
            térmica.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
              onClick={handlePrint}
            >
              <Printer className="w-4 h-4" />
              Imprimir Cupom
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
