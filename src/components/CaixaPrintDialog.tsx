import React, { useRef } from 'react'
import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CaixaCupomRelatorio } from './CaixaCupomRelatorio'
import type {
  GraficaCaixa,
  GraficaCaixaContador,
  GraficaVenda,
  ConfiguracoesEmpresa,
} from '@/types'
import { formatDate } from '@/lib/formatters'

interface CaixaPrintDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  caixa: GraficaCaixa | null
  contadores?: GraficaCaixaContador[]
  vendas?: GraficaVenda[]
  configEmpresa: ConfiguracoesEmpresa | null
}

export function CaixaPrintDialog({
  open,
  onOpenChange,
  caixa,
  contadores = [],
  vendas = [],
  configEmpresa,
}: CaixaPrintDialogProps) {
  const printAreaRef = useRef<HTMLDivElement>(null)
  const [formato, setFormato] = React.useState<'bobina' | 'a5'>('bobina')

  if (!caixa) return null

  const handlePrint = () => {
    const content = printAreaRef.current?.innerHTML
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
          <title>Cupom Fechamento Caixa #${caixa.id.slice(0, 8).toUpperCase()} - STD</title>
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

  const containerMaxWidth = formato === 'bobina' ? 'max-w-[420px]' : 'max-w-[560px]'
  const dialogMaxWidth = formato === 'bobina' ? 'max-w-lg' : 'max-w-2xl'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`${dialogMaxWidth} max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white transition-all`}
      >
        <DialogHeader className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 space-y-0">
          <DialogTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Printer className="w-4 h-4 text-blue-600" /> Cupom de Fechamento de Caixa
          </DialogTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-gray-100 p-0.5 rounded border border-gray-300 text-xs font-medium">
              <button
                type="button"
                onClick={() => setFormato('bobina')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  formato === 'bobina'
                    ? 'bg-white text-blue-700 shadow-xs font-bold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Bobina 80mm
              </button>
              <button
                type="button"
                onClick={() => setFormato('a5')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  formato === 'a5'
                    ? 'bg-white text-blue-700 shadow-xs font-bold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                A5 Ficha
              </button>
            </div>
            <Button
              onClick={handlePrint}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 text-xs h-8"
            >
              <Printer className="w-4 h-4" /> Imprimir
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 bg-gray-100 flex justify-center">
          <div
            ref={printAreaRef}
            className={`bg-white shadow-sm border border-gray-200 rounded p-1 w-full ${containerMaxWidth}`}
          >
            <CaixaCupomRelatorio
              caixa={caixa}
              contadores={contadores}
              vendas={vendas}
              configEmpresa={configEmpresa}
              formato={formato}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default CaixaPrintDialog
