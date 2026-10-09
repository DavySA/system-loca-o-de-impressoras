import React, { useRef } from 'react'
import { Printer, Download, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { OrdemServicoRelatorio } from './OrdemServicoRelatorio'
import type { OrdemServico, ConfiguracoesEmpresa } from '@/types'
import { formatOSCode } from '@/lib/formatters'

interface OrdemServicoPrintDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ordem: OrdemServico | null
  configEmpresa: ConfiguracoesEmpresa | null
  ultimosAtendimentos: OrdemServico[]
}

export function OrdemServicoPrintDialog({
  open,
  onOpenChange,
  ordem,
  configEmpresa,
  ultimosAtendimentos,
}: OrdemServicoPrintDialogProps) {
  const printAreaRef = useRef<HTMLDivElement>(null)

  if (!ordem) return null

  const handlePrint = () => {
    // Abrir janela dedicada de impressão isolada contendo APENAS o relatório
    const content = printAreaRef.current?.innerHTML
    if (!content) return

    const printWindow = window.open('', '_blank', 'width=900,height=750')
    if (!printWindow) {
      // Fallback para window.print
      window.print()
      return
    }

    printWindow.document.open()
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <title>Ordem de Serviço ${formatOSCode(ordem.id)} - STD</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @page {
              size: A4;
              margin: 12mm 15mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              color: #111827;
              background-color: #fff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            @media print {
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body class="p-4 bg-white">
          ${content}
          <script>
            window.addEventListener('load', () => {
              setTimeout(() => {
                window.focus();
                window.print();
              }, 400);
            });
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white">
        <DialogHeader className="p-4 border-b border-gray-200 flex flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Printer className="w-5 h-5 text-blue-600" /> Relatório de Impressão — O.S.{' '}
            <span className="font-mono text-blue-700">{formatOSCode(ordem.id)}</span>
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 text-xs h-8"
            >
              <Printer className="w-4 h-4" /> Imprimir Documento
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50/50">
          <div
            ref={printAreaRef}
            className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden"
          >
            <OrdemServicoRelatorio
              ordem={ordem}
              configEmpresa={configEmpresa}
              ultimosAtendimentos={ultimosAtendimentos}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
export default OrdemServicoPrintDialog
