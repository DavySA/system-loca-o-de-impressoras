import React, { useState, useEffect } from 'react'
import {
  Building2,
  Upload,
  CheckCircle2,
  FileText,
  Printer,
  Phone,
  Mail,
  MapPin,
  Globe,
} from 'lucide-react'
import { configuracoesService } from '@/services/configuracoes'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import type { ConfiguracoesEmpresa } from '@/types'

export default function Personalizar() {
  const { toast } = useToast()
  const [config, setConfig] = useState<ConfiguracoesEmpresa | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const [formData, setFormData] = useState({
    razao_social: '',
    nome_fantasia: '',
    cnpj: '',
    inscricao_estadual: '',
    endereco: '',
    cidade: '',
    uf: '',
    telefone: '',
    email: '',
    website: '',
    mensagem_rodape: '',
  })
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      setIsLoading(true)
      const data = await configuracoesService.get()
      if (data) {
        setConfig(data)
        setFormData({
          razao_social: data.razao_social || '',
          nome_fantasia: data.nome_fantasia || '',
          cnpj: data.cnpj || '',
          inscricao_estadual: data.inscricao_estadual || '',
          endereco: data.endereco || '',
          cidade: data.cidade || '',
          uf: data.uf || '',
          telefone: data.telefone || '',
          email: data.email || '',
          website: data.website || '',
          mensagem_rodape: data.mensagem_rodape || '',
        })
        if (data.logo) {
          setLogoPreview(configuracoesService.getLogoUrl(data))
        }
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar configurações',
        description: 'Não foi possível carregar os dados da empresa.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setLogoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.razao_social.trim()) {
      toast({
        variant: 'destructive',
        title: 'Razão Social obrigatória',
        description: 'Informe o nome ou razão social da empresa.',
      })
      return
    }

    setIsSaving(true)
    try {
      const updated = await configuracoesService.save(formData, logoFile || undefined)
      setConfig(updated)
      if (updated.logo) {
        setLogoPreview(configuracoesService.getLogoUrl(updated))
      }
      toast({
        title: 'Cabeçalho e dados salvos com sucesso!',
        description: 'As alterações agora aparecem no cabeçalho das Ordens de Serviço e Faturas.',
      })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: err.message || 'Verifique as informações preenchidas.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          Personalizar Cabeçalho & Empresa
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Defina o logo e os dados da empresa contratada aplicados nos relatórios, Ordens de Serviço
          e Faturas emitidas.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulário Principal */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
          <Card className="border border-gray-200 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" /> Dados Cadastrais da Empresa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="cfg-razao">
                    Razão Social <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="cfg-razao"
                    value={formData.razao_social}
                    onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                    placeholder="Ex: PrintGest Locação e Serviços LTDA"
                    required
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="cfg-fantasia">Nome Fantasia</Label>
                  <Input
                    id="cfg-fantasia"
                    value={formData.nome_fantasia}
                    onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
                    placeholder="Ex: PrintGest Outsourcing de Impressão"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cfg-cnpj">CNPJ</Label>
                  <Input
                    id="cfg-cnpj"
                    value={formData.cnpj}
                    onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                    placeholder="Ex: 12.345.678/0001-99"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cfg-ie">Inscrição Estadual (IE)</Label>
                  <Input
                    id="cfg-ie"
                    value={formData.inscricao_estadual}
                    onChange={(e) =>
                      setFormData({ ...formData, inscricao_estadual: e.target.value })
                    }
                    placeholder="Ex: 123.456.789.000"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="cfg-end">Endereço Completo</Label>
                  <Input
                    id="cfg-end"
                    value={formData.endereco}
                    onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                    placeholder="Ex: Av. Paulista, 1500 - Conjunto 82 - Bela Vista"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cfg-cid">Cidade</Label>
                  <Input
                    id="cfg-cid"
                    value={formData.cidade}
                    onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                    placeholder="Ex: São Paulo"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cfg-uf">Estado (UF)</Label>
                  <Input
                    id="cfg-uf"
                    value={formData.uf}
                    onChange={(e) => setFormData({ ...formData, uf: e.target.value.toUpperCase() })}
                    maxLength={2}
                    placeholder="Ex: SP"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cfg-tel">Telefone / WhatsApp</Label>
                  <Input
                    id="cfg-tel"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    placeholder="Ex: (11) 3322-1100"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cfg-email">E-mail Comercial</Label>
                  <Input
                    id="cfg-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Ex: contato@printgest.com.br"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="cfg-web">Website</Label>
                  <Input
                    id="cfg-web"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="Ex: www.printgest.com.br"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Logo e Mensagem de Rodapé */}
          <Card className="border border-gray-200 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600" /> Logotipo & Rodapé de Impressão
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="cfg-logo">Logotipo da Empresa (PNG, JPG, SVG, WebP)</Label>
                <Input
                  id="cfg-logo"
                  type="file"
                  accept="image/png, image/jpeg, image/webp, image/svg+xml"
                  onChange={handleFileChange}
                  className="cursor-pointer"
                />
                <p className="text-[11px] text-gray-500">
                  Recomendado: imagem com fundo transparente e proporção horizontal (ex: 300x80px).
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cfg-rodape">Mensagem do Rodapé (Opcional)</Label>
                <Textarea
                  id="cfg-rodape"
                  rows={2}
                  value={formData.mensagem_rodape}
                  onChange={(e) => setFormData({ ...formData, mensagem_rodape: e.target.value })}
                  placeholder="Ex: PrintGest — Eficiência, qualidade e tecnologia em outsourcing de impressão."
                />
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>

        {/* Pré-visualização do Cabeçalho Impresso */}
        <div className="space-y-4">
          <Card className="border border-gray-200 shadow-xs sticky top-20">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                <Printer className="w-4 h-4 text-gray-700" /> Prévia do Cabeçalho Impresso
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-xl border border-gray-300 bg-white shadow-xs space-y-3 text-xs">
                {/* Logo e Nome */}
                <div className="flex items-center gap-3 border-b border-gray-200 pb-3">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Logo Prévia"
                      className="h-12 w-auto max-w-[120px] object-contain"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0 border border-blue-200">
                      LOGO
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <h3 className="font-bold text-gray-900 leading-tight truncate">
                      {formData.razao_social || 'Sua Empresa Aqui'}
                    </h3>
                    {formData.nome_fantasia && (
                      <p className="text-[11px] text-gray-500 truncate">{formData.nome_fantasia}</p>
                    )}
                  </div>
                </div>

                {/* Dados */}
                <div className="space-y-1 text-[11px] text-gray-600">
                  <p className="flex items-center gap-1.5 truncate">
                    <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>CNPJ: {formData.cnpj || '00.000.000/0001-00'}</span>
                    {formData.inscricao_estadual && (
                      <span> • IE: {formData.inscricao_estadual}</span>
                    )}
                  </p>
                  <p className="flex items-center gap-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>
                      {formData.endereco || 'Endereço da Empresa'}
                      {formData.cidade ? ` - ${formData.cidade}/${formData.uf}` : ''}
                    </span>
                  </p>
                  <p className="flex items-center gap-1.5 truncate">
                    <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>{formData.telefone || '(00) 0000-0000'}</span>
                  </p>
                  <p className="flex items-center gap-1.5 truncate">
                    <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>{formData.email || 'contato@empresa.com'}</span>
                  </p>
                  {formData.website && (
                    <p className="flex items-center gap-1.5 truncate">
                      <Globe className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span>{formData.website}</span>
                    </p>
                  )}
                </div>

                {/* Rodapé */}
                {formData.mensagem_rodape && (
                  <div className="pt-2 border-t border-gray-100 text-[10px] text-gray-400 italic text-center">
                    "{formData.mensagem_rodape}"
                  </div>
                )}
              </div>

              <div className="p-3 bg-blue-50/70 rounded-lg text-[11px] text-blue-800 space-y-1 border border-blue-100">
                <p className="font-semibold">Onde este cabeçalho é aplicado?</p>
                <ul className="list-disc list-inside space-y-0.5 text-blue-700">
                  <li>
                    Na impressão e ficha técnica de <strong>Ordens de Serviço</strong>;
                  </li>
                  <li>
                    Na impressão e espelho das <strong>Faturas de Locação</strong>.
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
