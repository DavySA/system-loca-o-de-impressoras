import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  BadgeCheck,
  CalendarClock,
  FileWarning,
  KeyRound,
  Loader2,
  Lock,
  Save,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  fiscalService,
  type FiscalCertificadoStatus,
  type FiscalConfiguracao,
} from '@/services/fiscal'

const fiscalSchema = z.object({
  razao_social: z.string().max(200).optional().or(z.literal('')),
  cnpj: z.string().max(20).optional().or(z.literal('')),
  inscricao_estadual: z.string().max(30).optional().or(z.literal('')),
  regime_tributario: z.string().max(60).optional().or(z.literal('')),
  cnae: z.string().max(20).optional().or(z.literal('')),
  endereco_logradouro: z.string().max(200).optional().or(z.literal('')),
  endereco_numero: z.string().max(20).optional().or(z.literal('')),
  endereco_complemento: z.string().max(100).optional().or(z.literal('')),
  endereco_bairro: z.string().max(100).optional().or(z.literal('')),
  endereco_municipio: z.string().max(100).optional().or(z.literal('')),
  endereco_uf: z.string().max(2).optional().or(z.literal('')),
  endereco_cep: z.string().max(12).optional().or(z.literal('')),
  telefone: z.string().max(30).optional().or(z.literal('')),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  serie_nota: z.string().max(10).optional().or(z.literal('')),
  numero_proxima_nota: z.any().optional(),
  ambiente: z.enum(['homologacao', 'producao']).optional(),
  cfop_padrao_servico: z.string().max(10).optional().or(z.literal('')),
  cfop_padrao_mercadoria: z.string().max(10).optional().or(z.literal('')),
})

type FiscalForm = z.infer<typeof fiscalSchema>

const REGIMES = [
  'Simples Nacional',
  'Simples Nacional — Excesso de Sublimite',
  'Lucro Presumido',
  'Lucro Real',
  'MEI',
]

const UFS = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
]

export default function ModuloFiscal() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [certStatus, setCertStatus] = useState<FiscalCertificadoStatus | null>(null)
  const [arquivoPfx, setArquivoPfx] = useState<File | null>(null)
  const [senhaCert, setSenhaCert] = useState('')
  const [validadeCert, setValidadeCert] = useState('')
  const [enviandoCert, setEnviandoCert] = useState(false)
  const [removendoCert, setRemovendoCert] = useState(false)
  const inputPfxRef = useRef<HTMLInputElement>(null)

  const form = useForm<FiscalForm>({
    resolver: zodResolver(fiscalSchema),
    defaultValues: {
      razao_social: '',
      cnpj: '',
      inscricao_estadual: '',
      regime_tributario: '',
      cnae: '',
      endereco_logradouro: '',
      endereco_numero: '',
      endereco_complemento: '',
      endereco_bairro: '',
      endereco_municipio: '',
      endereco_uf: '',
      endereco_cep: '',
      telefone: '',
      email: '',
      serie_nota: '1',
      numero_proxima_nota: 1,
      ambiente: 'homologacao',
      cfop_padrao_servico: '',
      cfop_padrao_mercadoria: '',
    },
  })

  useEffect(() => {
    const carregar = async () => {
      setLoading(true)
      try {
        const [cfg, cert] = await Promise.all([
          fiscalService.getConfiguracao(),
          fiscalService.getStatusCertificado(),
        ])
        setCertStatus(cert)
        if (cfg) {
          form.reset({
            razao_social: cfg.razao_social || '',
            cnpj: cfg.cnpj || '',
            inscricao_estadual: cfg.inscricao_estadual || '',
            regime_tributario: cfg.regime_tributario || '',
            cnae: cfg.cnae || '',
            endereco_logradouro: cfg.endereco_logradouro || '',
            endereco_numero: cfg.endereco_numero || '',
            endereco_complemento: cfg.endereco_complemento || '',
            endereco_bairro: cfg.endereco_bairro || '',
            endereco_municipio: cfg.endereco_municipio || '',
            endereco_uf: cfg.endereco_uf || '',
            endereco_cep: cfg.endereco_cep || '',
            telefone: cfg.telefone || '',
            email: cfg.email || '',
            serie_nota: cfg.serie_nota || '1',
            numero_proxima_nota: cfg.numero_proxima_nota ?? 1,
            ambiente: cfg.ambiente || 'homologacao',
            cfop_padrao_servico: cfg.cfop_padrao_servico || '',
            cfop_padrao_mercadoria: cfg.cfop_padrao_mercadoria || '',
          })
        }
      } catch (err: any) {
        toast({
          variant: 'destructive',
          title: 'Erro ao carregar dados fiscais',
          description: err.message || 'Tente recarregar a página.',
        })
      } finally {
        setLoading(false)
      }
    }
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSalvarFiscal = async (values: FiscalForm) => {
    setSalvando(true)
    try {
      await fiscalService.salvarConfiguracao({
        ...values,
        numero_proxima_nota: values.numero_proxima_nota ?? 1,
      })
      toast({
        title: 'Dados fiscais salvos com sucesso!',
        description: 'As informações da empresa emitente foram atualizadas.',
      })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar dados fiscais',
        description: err.message || 'Verifique os campos e tente novamente.',
      })
    } finally {
      setSalvando(false)
    }
  }

  const handleEnviarCertificado = async () => {
    if (!arquivoPfx) {
      toast({
        variant: 'destructive',
        title: 'Arquivo necessário',
        description: 'Selecione o arquivo .pfx do certificado digital A1.',
      })
      return
    }
    if (!senhaCert) {
      toast({
        variant: 'destructive',
        title: 'Senha necessária',
        description: 'Informe a senha do certificado digital A1.',
      })
      return
    }
    setEnviandoCert(true)
    try {
      await fiscalService.enviarCertificado(arquivoPfx, senhaCert, validadeCert || undefined)
      const st = await fiscalService.getStatusCertificado()
      setCertStatus(st)
      setArquivoPfx(null)
      setSenhaCert('')
      setValidadeCert('')
      if (inputPfxRef.current) inputPfxRef.current.value = ''
      toast({
        title: 'Certificado salvo com sucesso',
        description: 'O arquivo .pfx e a senha foram armazenados com segurança no servidor.',
      })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao enviar certificado',
        description: err.message || 'Verifique o arquivo e a senha.',
      })
    } finally {
      setEnviandoCert(false)
    }
  }

  const handleRemoverCertificado = async () => {
    setRemovendoCert(true)
    try {
      await fiscalService.removerCertificado()
      setCertStatus({ temCertificado: false, statusTexto: 'Nenhum certificado enviado' })
      toast({ title: 'Certificado removido com sucesso' })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao remover certificado',
        description: err.message,
      })
    } finally {
      setRemovendoCert(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-2 text-sm text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
        Carregando Módulo Fiscal...
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-4xl space-y-4 p-4 pb-10">
      {/* Aviso de status da emissão (padrão Cora: preparado, não ativo) */}
      <div className="flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
        <FileWarning className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          <strong>Emissão de notas: aguardando certificado e provedor.</strong> A transmissão real
          de NF-e à SEFAZ exige certificado digital A1 válido, credenciamento na SEFAZ e um provedor
          de NF-e (Foco, NFe.io, PlugNotas etc.). Esta tela prepara todos os dados; a emissão será
          ativada após a configuração do provedor de NF-e.
        </span>
      </div>

      {/* CERTIFICADO DIGITAL A1 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-blue-900">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            Certificado Digital A1
          </CardTitle>
          <CardDescription className="text-xs">
            Envie o arquivo .pfx e a senha. A senha é armazenada apenas no servidor e nunca é
            exibida novamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Status atual */}
          <div
            className={`flex items-center justify-between gap-3 rounded-lg border p-3 text-xs ${
              certStatus?.temCertificado
                ? certStatus.vencido
                  ? 'border-red-300 bg-red-50'
                  : 'border-emerald-300 bg-emerald-50'
                : 'border-gray-300 bg-gray-50'
            }`}
          >
            {certStatus?.temCertificado ? (
              <>
                <div className="space-y-0.5">
                  <span className="flex items-center gap-1.5 font-semibold text-gray-900">
                    {certStatus.vencido ? (
                      <FileWarning className="h-4 w-4 text-red-600" />
                    ) : (
                      <BadgeCheck className="h-4 w-4 text-emerald-600" />
                    )}
                    {certStatus.statusTexto}
                  </span>
                  <span className="block font-mono text-[11px] text-gray-600">
                    Arquivo: {certStatus.nomeArquivo}
                  </span>
                  {certStatus.validade && (
                    <span className="flex items-center gap-1 text-[11px] text-gray-600">
                      <CalendarClock className="h-3 w-3" />
                      Válido até {new Date(certStatus.validade).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-red-300 text-red-700 hover:bg-red-50"
                  onClick={handleRemoverCertificado}
                  disabled={removendoCert}
                >
                  {removendoCert ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  Remover
                </Button>
              </>
            ) : (
              <span className="text-gray-500">Nenhum certificado enviado.</span>
            )}
          </div>

          {/* Formulário de upload */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="cert-arquivo" className="text-xs text-gray-700">
                Arquivo .pfx *
              </Label>
              <Input
                id="cert-arquivo"
                ref={inputPfxRef}
                type="file"
                accept=".pfx,application/x-pkcs12"
                onChange={(e) => setArquivoPfx(e.target.files?.[0] || null)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cert-senha" className="text-xs text-gray-700">
                Senha do certificado *
              </Label>
              <Input
                id="cert-senha"
                type="password"
                autoComplete="new-password"
                placeholder="Senha do .pfx"
                value={senhaCert}
                onChange={(e) => setSenhaCert(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cert-validade" className="text-xs text-gray-700">
                Válido até (opcional)
              </Label>
              <Input
                id="cert-validade"
                type="date"
                value={validadeCert}
                onChange={(e) => setValidadeCert(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            className="gap-1.5 bg-blue-600 hover:bg-blue-700"
            onClick={handleEnviarCertificado}
            disabled={enviandoCert}
          >
            {enviandoCert ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            Enviar certificado
          </Button>
        </CardContent>
      </Card>

      {/* DADOS FISCAIS DA EMPRESA EMITENTE */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-blue-900">
            <Lock className="h-5 w-5 text-blue-600" />
            Dados Fiscais da Empresa Emitente
          </CardTitle>
          <CardDescription className="text-xs">
            Informações usadas na emissão de nota fiscal de serviço e de venda de mercadoria.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(handleSalvarFiscal)} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="f-razao" className="text-xs text-gray-700">
                  Razão Social
                </Label>
                <Input id="f-razao" {...form.register('razao_social')} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="f-cnpj" className="text-xs text-gray-700">
                  CNPJ
                </Label>
                <Input
                  id="f-cnpj"
                  inputMode="numeric"
                  placeholder="00.000.000/0000-00"
                  {...form.register('cnpj')}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="f-ie" className="text-xs text-gray-700">
                  Inscrição Estadual
                </Label>
                <Input
                  id="f-ie"
                  inputMode="numeric"
                  {...form.register('inscricao_estadual')}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="f-regime" className="text-xs text-gray-700">
                  Regime Tributário
                </Label>
                <Select
                  value={form.watch('regime_tributario') || ''}
                  onValueChange={(v) => form.setValue('regime_tributario', v)}
                >
                  <SelectTrigger id="f-regime" className="h-8 text-xs">
                    <SelectValue placeholder="Selecione o regime" />
                  </SelectTrigger>
                  <SelectContent>
                    {REGIMES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="f-cnae" className="text-xs text-gray-700">
                  CNAE
                </Label>
                <Input
                  id="f-cnae"
                  inputMode="numeric"
                  placeholder="0000-0/00"
                  {...form.register('cnae')}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Endereço
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
                <div className="space-y-1 sm:col-span-3">
                  <Label htmlFor="f-log" className="text-xs text-gray-700">
                    Logradouro
                  </Label>
                  <Input
                    id="f-log"
                    {...form.register('endereco_logradouro')}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1 sm:col-span-1">
                  <Label htmlFor="f-num" className="text-xs text-gray-700">
                    Número
                  </Label>
                  <Input id="f-num" {...form.register('endereco_numero')} className="h-8 text-xs" />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="f-comp" className="text-xs text-gray-700">
                    Complemento
                  </Label>
                  <Input
                    id="f-comp"
                    {...form.register('endereco_complemento')}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="f-bairro" className="text-xs text-gray-700">
                    Bairro
                  </Label>
                  <Input
                    id="f-bairro"
                    {...form.register('endereco_bairro')}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="f-mun" className="text-xs text-gray-700">
                    Município
                  </Label>
                  <Input
                    id="f-mun"
                    {...form.register('endereco_municipio')}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="f-uf" className="text-xs text-gray-700">
                    UF
                  </Label>
                  <Select
                    value={form.watch('endereco_uf') || ''}
                    onValueChange={(v) => form.setValue('endereco_uf', v)}
                  >
                    <SelectTrigger id="f-uf" className="h-8 text-xs">
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      {UFS.map((uf) => (
                        <SelectItem key={uf} value={uf}>
                          {uf}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="f-cep" className="text-xs text-gray-700">
                    CEP
                  </Label>
                  <Input
                    id="f-cep"
                    inputMode="numeric"
                    autoComplete="postal-code"
                    {...form.register('endereco_cep')}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="f-tel" className="text-xs text-gray-700">
                  Telefone
                </Label>
                <Input
                  id="f-tel"
                  type="tel"
                  autoComplete="tel"
                  {...form.register('telefone')}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="f-email" className="text-xs text-gray-700">
                  E-mail
                </Label>
                <Input
                  id="f-email"
                  type="email"
                  autoComplete="email"
                  {...form.register('email')}
                  className="h-8 text-xs"
                />
                {form.formState.errors.email && (
                  <p className="text-[11px] text-red-600">{form.formState.errors.email.message}</p>
                )}
              </div>
            </div>

            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Parametrização da Nota
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label htmlFor="f-serie" className="text-xs text-gray-700">
                    Série da Nota
                  </Label>
                  <Input
                    id="f-serie"
                    {...form.register('serie_nota')}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="f-numero" className="text-xs text-gray-700">
                    Número da Próxima Nota
                  </Label>
                  <Input
                    id="f-numero"
                    type="number"
                    min="1"
                    inputMode="numeric"
                    {...form.register('numero_proxima_nota')}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="f-ambiente" className="text-xs text-gray-700">
                    Ambiente
                  </Label>
                  <Select
                    value={form.watch('ambiente') || 'homologacao'}
                    onValueChange={(v) =>
                      form.setValue('ambiente', v as 'homologacao' | 'producao')
                    }
                  >
                    <SelectTrigger id="f-ambiente" className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="homologacao">Homologação (testes)</SelectItem>
                      <SelectItem value="producao">Produção</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="f-cfop-serv" className="text-xs text-gray-700">
                    CFOP Padrão — Serviço
                  </Label>
                  <Input
                    id="f-cfop-serv"
                    placeholder="Ex: 5933"
                    inputMode="numeric"
                    {...form.register('cfop_padrao_servico')}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="f-cfop-merc" className="text-xs text-gray-700">
                    CFOP Padrão — Mercadoria
                  </Label>
                  <Input
                    id="f-cfop-merc"
                    placeholder="Ex: 5102"
                    inputMode="numeric"
                    {...form.register('cfop_padrao_mercadoria')}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              {form.formState.isDirty && (
                <span className="flex items-center gap-1 text-[11px] text-amber-700">
                  <KeyRound className="h-3 w-3" />
                  Alterações não salvas
                </span>
              )}
              <Button
                type="submit"
                size="sm"
                className="gap-1.5 bg-blue-600 hover:bg-blue-700"
                disabled={salvando}
              >
                {salvando ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Salvar dados fiscais
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
