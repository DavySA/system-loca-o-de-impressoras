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
  CreditCard,
  Key,
  Info,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { configuracoesService } from '@/services/configuracoes'
import { coraService } from '@/services/cora'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import type { ConfiguracoesEmpresa, IntegracaoCoraConfig } from '@/types'

export default function Personalizar() {
  const { toast } = useToast()
  const [config, setConfig] = useState<ConfiguracoesEmpresa | null>(null)
  const [coraConfig, setCoraConfig] = useState<IntegracaoCoraConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isSavingCora, setIsSavingCora] = useState(false)

  const [coraFormData, setCoraFormData] = useState({
    ativo: false,
    ambiente: 'sandbox' as 'sandbox' | 'producao',
    client_id: '',
    client_secret: '',
    chave_pix: '',
    certificado_nome: '',
    instrucoes_padrao: 'Não receber após o vencimento sem os devidos acréscimos legais.',
    juros_mensal_percentual: 1.0,
    multa_percentual: 2.0,
  })

  const [formData, setFormData] = useState({
    razao_social: '',
    nome_fantasia: '',
    cnpj: '',
    inscricao_estadual: '',
    telefone: '',
    email: '',
    website: '',
    whatsapp: '',
    instagram: '',
    facebook: '',
    linkedin: '',
    endereco: '',
    cidade: '',
    uf: '',
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
      const [data, cora] = await Promise.all([configuracoesService.get(), coraService.getConfig()])

      if (data) {
        setConfig(data)
        setFormData({
          razao_social: data.razao_social || '',
          nome_fantasia: data.nome_fantasia || '',
          cnpj: data.cnpj || '',
          inscricao_estadual: data.inscricao_estadual || '',
          telefone: data.telefone || '',
          email: data.email || '',
          website: data.website || '',
          whatsapp: data.whatsapp || '',
          instagram: data.instagram || '',
          facebook: data.facebook || '',
          linkedin: data.linkedin || '',
          endereco: data.endereco || '',
          cidade: data.cidade || '',
          uf: data.uf || '',
          mensagem_rodape: data.mensagem_rodape || '',
        })
        if (data.logo) {
          setLogoPreview(configuracoesService.getLogoUrl(data))
        }
      }

      if (cora) {
        setCoraConfig(cora)
        setCoraFormData({
          ativo: !!cora.ativo,
          ambiente: cora.ambiente || 'sandbox',
          client_id: cora.client_id || '',
          client_secret: cora.client_secret || '',
          chave_pix: cora.chave_pix || '',
          certificado_nome: cora.certificado_nome || '',
          instrucoes_padrao:
            cora.instrucoes_padrao ||
            'Não receber após o vencimento sem os devidos acréscimos legais.',
          juros_mensal_percentual: cora.juros_mensal_percentual ?? 1.0,
          multa_percentual: cora.multa_percentual ?? 2.0,
        })
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar configurações',
        description: 'Não foi possível carregar os dados.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveCora = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingCora(true)
    try {
      const saved = await coraService.saveConfig(coraFormData)
      setCoraConfig(saved)
      toast({
        title: 'Integração Cora atualizada!',
        description: saved.ativo
          ? 'Configurações de emissão de boletos salvas.'
          : 'Configuração salva no estado [Não configurado/Inativo].',
      })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar integração Cora',
        description: err.message || 'Verifique as informações preenchidas.',
      })
    } finally {
      setIsSavingCora(false)
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

      <Tabs defaultValue="empresa" className="w-full">
        <TabsList className="bg-gray-100 p-1 mb-6">
          <TabsTrigger value="empresa" className="flex items-center gap-1.5 text-xs font-semibold">
            <Building2 className="w-4 h-4" /> Dados da Empresa & Logo
          </TabsTrigger>
          <TabsTrigger value="cora" className="flex items-center gap-1.5 text-xs font-semibold">
            <CreditCard className="w-4 h-4 text-purple-600" /> Integração Cora (Boletos & Cobrança)
            <Badge
              variant="outline"
              className={
                coraConfig?.ativo && coraConfig?.client_id
                  ? 'ml-1.5 bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px]'
                  : 'ml-1.5 bg-amber-50 text-amber-700 border-amber-300 text-[10px]'
              }
            >
              {coraConfig?.ativo && coraConfig?.client_id ? 'Ativa' : 'Pendente'}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="empresa">
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
                        placeholder="Ex: TD Technology System LTDA"
                        required
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="cfg-fantasia">Nome Fantasia</Label>
                      <Input
                        id="cfg-fantasia"
                        value={formData.nome_fantasia}
                        onChange={(e) =>
                          setFormData({ ...formData, nome_fantasia: e.target.value })
                        }
                        placeholder="Ex: STD"
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
                        onChange={(e) =>
                          setFormData({ ...formData, uf: e.target.value.toUpperCase() })
                        }
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
                        placeholder="Ex: contato@tdtechnology.com.br"
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="cfg-web">Website</Label>
                      <Input
                        id="cfg-web"
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        placeholder="Ex: tdtechnology.com.br"
                      />
                    </div>
                  </div>

                  {/* Redes Sociais e Contatos para o Rodapé */}
                  <div className="pt-4 border-t border-gray-100">
                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Contatos e Redes Sociais do Rodapé
                    </h4>
                    <p className="text-xs text-gray-500 mb-3">
                      Estes dados são exibidos no rodapé inferior do sistema e permitem contato
                      rápido com a TD Technology.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="cfg-wpp">WhatsApp (com DDD)</Label>
                        <Input
                          id="cfg-wpp"
                          value={formData.whatsapp}
                          onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                          placeholder="Ex: (11) 99999-9999"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="cfg-insta">Instagram</Label>
                        <Input
                          id="cfg-insta"
                          value={formData.instagram}
                          onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                          placeholder="Ex: @tdtechnology"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="cfg-fb">Facebook / LinkedIn</Label>
                        <Input
                          id="cfg-fb"
                          value={formData.facebook}
                          onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                          placeholder="Ex: tdtechnology.oficial"
                        />
                      </div>
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
                      Recomendado: imagem com fundo transparente e proporção horizontal (ex:
                      300x80px).
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="cfg-rodape">Mensagem do Rodapé (Opcional)</Label>
                    <Textarea
                      id="cfg-rodape"
                      rows={2}
                      value={formData.mensagem_rodape}
                      onChange={(e) =>
                        setFormData({ ...formData, mensagem_rodape: e.target.value })
                      }
                      placeholder="Ex: STD — Eficiência, qualidade e tecnologia em outsourcing de impressão."
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

            {/* Pré-visualização do Cabeçalho Impresso e Rodapé */}
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
                          <p className="text-[11px] text-gray-500 truncate">
                            {formData.nome_fantasia}
                          </p>
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

              {/* Prévia do Rodapé */}
              <Card className="border border-gray-200 shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-gray-700" /> Prévia do Rodapé do Sistema
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs space-y-2 text-gray-600">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-2">
                      <span className="font-semibold text-gray-800">© 2025 STD</span>
                      <span className="text-[11px] text-blue-600 font-mono">
                        {formData.website || 'tdtechnology.com.br'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[11px]">
                      {(formData.telefone || formData.whatsapp) && (
                        <span className="flex items-center gap-1 text-gray-700">
                          <Phone className="w-3 h-3 text-emerald-600" />
                          {formData.whatsapp || formData.telefone}
                        </span>
                      )}
                      {formData.email && (
                        <span className="flex items-center gap-1 text-gray-700">
                          <Mail className="w-3 h-3 text-blue-600" />
                          {formData.email}
                        </span>
                      )}
                      {formData.instagram && (
                        <span className="flex items-center gap-1 text-pink-600 font-medium">
                          Instagram: {formData.instagram}
                        </span>
                      )}
                      {formData.facebook && (
                        <span className="flex items-center gap-1 text-blue-700 font-medium">
                          {formData.facebook}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="cora">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <form onSubmit={handleSaveCora} className="lg:col-span-2 space-y-6">
              <Card className="border border-gray-200 shadow-xs">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-purple-600" /> Banco Cora — Emissão de
                        Boletos Híbridos
                      </CardTitle>
                      <CardDescription className="text-xs text-gray-500 mt-0.5">
                        Configure as credenciais da API Cora PJ para emissão e conciliação de
                        faturas.
                      </CardDescription>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        coraFormData.ativo && coraFormData.client_id
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold'
                          : 'bg-amber-50 text-amber-700 border-amber-300 font-semibold'
                      }
                    >
                      {coraFormData.ativo && coraFormData.client_id
                        ? 'INTEGRAÇÃO ATIVA'
                        : 'NÃO CONFIGURADO'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-lg text-xs space-y-1.5 text-amber-900">
                    <div className="flex items-center gap-1.5 font-bold text-amber-950">
                      <Info className="w-4 h-4 text-amber-700" /> Estado Atual da Integração
                    </div>
                    <p className="leading-relaxed">
                      A estrutura técnica do ERP está 100% preparada. Para ativar a emissão real de
                      boletos, você precisa ter uma <strong>Conta Cora PJ</strong> com acesso
                      habilitado à API e informar o<strong> Client ID</strong> e{' '}
                      <strong>Client Secret</strong> fornecidos pelo painel da Cora.
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="space-y-0.5">
                      <Label htmlFor="cora-ativo" className="text-sm font-semibold text-gray-800">
                        Ativar Integração no Faturamento
                      </Label>
                      <p className="text-xs text-gray-500">
                        Quando ativo, o botão "Gerar Boleto" ficará disponível nas faturas do
                        sistema.
                      </p>
                    </div>
                    <Switch
                      id="cora-ativo"
                      checked={coraFormData.ativo}
                      onCheckedChange={(checked) =>
                        setCoraFormData({ ...coraFormData, ativo: checked })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="cora-amb">Ambiente da API</Label>
                      <select
                        id="cora-amb"
                        value={coraFormData.ambiente}
                        onChange={(e) =>
                          setCoraFormData({
                            ...coraFormData,
                            ambiente: e.target.value as 'sandbox' | 'producao',
                          })
                        }
                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="sandbox">Sandbox (Ambiente de Testes da Cora)</option>
                        <option value="producao">Produção (Conta Cora Real)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="cora-pix">Chave PIX da Conta Cora (Opcional)</Label>
                      <Input
                        id="cora-pix"
                        value={coraFormData.chave_pix}
                        onChange={(e) =>
                          setCoraFormData({ ...coraFormData, chave_pix: e.target.value })
                        }
                        placeholder="CNPJ, E-mail ou Chave Aleatória"
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="cora-client-id">Client ID (Cora API)</Label>
                      <Input
                        id="cora-client-id"
                        value={coraFormData.client_id}
                        onChange={(e) =>
                          setCoraFormData({ ...coraFormData, client_id: e.target.value })
                        }
                        placeholder="Ex: client-id-cora-abc123xyz"
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="cora-secret">Client Secret / Token de Acesso</Label>
                      <Input
                        id="cora-secret"
                        type="password"
                        value={coraFormData.client_secret}
                        onChange={(e) =>
                          setCoraFormData({ ...coraFormData, client_secret: e.target.value })
                        }
                        placeholder="••••••••••••••••••••••••••••••••"
                      />
                      <p className="text-[11px] text-gray-500">
                        Armazenado com segurança restrita exclusivamente a administradores.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="cora-juros">Juros Mensal (%)</Label>
                      <Input
                        id="cora-juros"
                        type="number"
                        step="0.01"
                        value={coraFormData.juros_mensal_percentual}
                        onChange={(e) =>
                          setCoraFormData({
                            ...coraFormData,
                            juros_mensal_percentual: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="cora-multa">Multa por Atraso (%)</Label>
                      <Input
                        id="cora-multa"
                        type="number"
                        step="0.01"
                        value={coraFormData.multa_percentual}
                        onChange={(e) =>
                          setCoraFormData({
                            ...coraFormData,
                            multa_percentual: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="cora-instrucoes">Instruções Padrão no Boleto</Label>
                      <Textarea
                        id="cora-instrucoes"
                        rows={2}
                        value={coraFormData.instrucoes_padrao}
                        onChange={(e) =>
                          setCoraFormData({ ...coraFormData, instrucoes_padrao: e.target.value })
                        }
                        placeholder="Instruções impressas no corpo do boleto bancário"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button
                      type="submit"
                      disabled={isSavingCora}
                      className="bg-purple-700 hover:bg-purple-800 text-white flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {isSavingCora ? 'Salvando...' : 'Salvar Configuração Cora'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </form>

            <div className="space-y-4">
              <Card className="border border-purple-200 bg-purple-50/40 shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-purple-900 flex items-center gap-2">
                    <Key className="w-4 h-4 text-purple-700" /> Como obter as credenciais?
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs text-purple-950">
                  <ol className="list-decimal list-inside space-y-2 leading-relaxed">
                    <li>
                      Acesse a conta da sua empresa no{' '}
                      <strong>Internet Banking do Banco Cora</strong>.
                    </li>
                    <li>
                      Acesse <strong>Configurações &gt; Integrações &gt; API Cora</strong>.
                    </li>
                    <li>
                      Crie uma nova aplicação com escopo de{' '}
                      <strong>Boletos e Cobranças (Invoices)</strong>.
                    </li>
                    <li>
                      Copie o <strong>Client ID</strong> e o <strong>Client Secret</strong> e cole
                      nos campos ao lado.
                    </li>
                    <li>
                      Marque <strong>Ativar Integração</strong> e clique em{' '}
                      <em>Salvar Configuração Cora</em>.
                    </li>
                  </ol>
                  <div className="pt-2 border-t border-purple-200 text-[11px] text-purple-800">
                    Enquanto não configurado, o botão de boleto no faturamento indicará claramente
                    que aguarda a inclusão das credenciais.
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
