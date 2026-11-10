import { useState, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Printer, Download } from 'lucide-react'
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

  const handlePrint = () => {
    window.print()
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
