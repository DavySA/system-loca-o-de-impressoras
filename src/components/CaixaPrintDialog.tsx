import React, { useRef } from 'react'
import { Printer, Download } from 'lucide-react'
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

  if (!caixa) return null

  const handlePrint = () => {
    const content = printAreaRef.current?.innerHTML
    if (!content) return

    const printWindow = window.open('', '_blank', 'width=520,height=750')
    if (!printWindow) {
      window.print()
      return
    }

    printWindow.document.open()
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <title>Cupom Fechamento Caixa #${caixa.id.slice(0, 8).toUpperCase()} - TD Technology System ERP</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @page {
              size: 80mm auto;
              margin: 4mm 4mm;
            }
            @media print {
              body {
                font-family: monospace, -apple-system, sans-serif;
                color: #000;
                background-color: #fff;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                padding: 0 !important;
                margin: 0 !important;
              }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body class="p-2 bg-white flex justify-center">
          <div style="width: 100%; max-width: 80mm;">
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
      <DialogContent className="max-w-md max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white">
        <DialogHeader className="p-4 border-b border-gray-200 flex flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Printer className="w-4 h-4 text-blue-600" /> Cupom de Fechamento de Caixa
          </DialogTitle>
          <Button
            onClick={handlePrint}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 text-xs h-8"
          >
            <Printer className="w-4 h-4" /> Imprimir Cupom
          </Button>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 bg-gray-100 flex justify-center">
          <div
            ref={printAreaRef}
            className="bg-white shadow-sm border border-gray-200 rounded p-1 w-full max-w-[400px]"
          >
            <CaixaCupomRelatorio
              caixa={caixa}
              contadores={contadores}
              vendas={vendas}
              configEmpresa={configEmpresa}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default CaixaPrintDialog
