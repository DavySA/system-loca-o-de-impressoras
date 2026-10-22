import React, { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  fallbackTitle?: string
  fallbackMessage?: string
  onReset?: () => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturou erro:', error, errorInfo)
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null })
    if (this.props.onReset) {
      this.props.onReset()
    } else {
      window.location.reload()
    }
  }

  private handleGoHome = () => {
    window.location.href = '/dashboard'
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[360px] p-6 flex flex-col items-center justify-center text-center bg-white rounded-2xl border border-red-100 shadow-xs my-4">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 tracking-tight">
            {this.props.fallbackTitle || 'Algo deu errado nesta seção'}
          </h2>
          <p className="text-sm text-gray-500 max-w-md mt-1 mb-4 leading-relaxed">
            {this.props.fallbackMessage ||
              'Ocorreu uma falha inesperada durante a execução. Os dados não foram perdidos.'}
          </p>
          {this.state.error?.message && (
            <div className="text-xs font-mono text-red-700 bg-red-50/70 p-2.5 rounded-lg border border-red-200 max-w-lg overflow-x-auto mb-4 text-left">
              {this.state.error.message}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={this.handleReload}
              className="text-xs flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Tentar Novamente
            </Button>
            <Button
              size="sm"
              onClick={this.handleGoHome}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5"
            >
              <Home className="w-3.5 h-3.5" /> Ir ao Dashboard
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
