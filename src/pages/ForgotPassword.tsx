import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Printer, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { requestPasswordReset } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await requestPasswordReset(email)
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
      setSubmitted(true)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-[#1F2937] via-[#1A222F] to-[#111827]">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-100 p-8 transition-all">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 mb-3">
            <Printer className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Recuperação de Senha</h1>
          <p className="text-xs text-gray-500 mt-1 text-center">
            Informe seu e-mail institucional para receber as instruções de recuperação
          </p>
        </div>

        {submitted ? (
          <div className="space-y-6">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              <div className="text-sm text-green-800">
                <p className="font-medium">Solicitação enviada!</p>
                <p className="text-xs text-green-700 mt-1">
                  Se o e-mail existir em nossa base, enviaremos um link de redefinição para{' '}
                  <strong>{email}</strong>.
                </p>
              </div>
            </div>

            <Link to="/login" className="block">
              <Button variant="outline" className="w-full flex items-center justify-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Voltar para o Login
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                E-mail cadastrado
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu.email@empresa.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-10 text-sm focus-visible:ring-blue-600"
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow"
            >
              {isSubmitting ? 'Enviando...' : 'Enviar link de recuperação'}
            </Button>

            <div className="pt-2 text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 font-medium"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Voltar para o Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
