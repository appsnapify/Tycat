'use client'

import { useEffect, useState } from 'react'
import { useForm, SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Link from 'next/link'

import { useAuth } from '@/app/app/_providers/auth-provider'
import { useOrganization } from '@/app/contexts/organization-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/components/ui/use-toast'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// Define the list of countries with flags and dial codes
const countries = [
  { name: 'Portugal', code: 'PT', flag: '🇵🇹', dial_code: '+351' },
  { name: 'Espanha', code: 'ES', flag: '🇪🇸', dial_code: '+34' },
  { name: 'França', code: 'FR', flag: '🇫🇷', dial_code: '+33' },
  { name: 'Reino Unido', code: 'GB', flag: '🇬🇧', dial_code: '+44' },
  { name: 'Brasil', code: 'BR', flag: '🇧🇷', dial_code: '+55' },
  { name: 'Estados Unidos', code: 'US', flag: '🇺🇸', dial_code: '+1' },
  // Add more countries as needed
];

// Define the schema for form validation using Zod
const formSchema = z.object({
  business_name: z.string().min(1, 'Nome da empresa é obrigatório').optional().or(z.literal('')),
  vat_number: z.string().optional().or(z.literal('')), // Consider more specific VAT validation if needed
  billing_address_line1: z.string().optional().or(z.literal('')),
  billing_address_line2: z.string().optional().or(z.literal('')),
  billing_postal_code: z.string().optional().or(z.literal('')),
  billing_city: z.string().optional().or(z.literal('')),
  billing_country: z.string().optional().or(z.literal('')),
  admin_contact_email: z.string().email('Email inválido').optional().or(z.literal('')),
  admin_contact_phone: z.string()
    .optional()
    .refine(value => {
      if (!value || value.trim() === '') return true; // Empty or just whitespace is valid for an optional field
      return /^(\+?[0-9]{1,4}[\s-]?)?([0-9][\s-]*){6,14}$/.test(value);
    }, {
      message: 'Número de telemóvel inválido. Verifique o formato (ex: +351 9XX XXX XXX ou 9XX XXX XXX) e o número de dígitos (geralmente 9 dígitos sem indicativo).'
    }),
  iban: z.string().optional().or(z.literal('')), // Consider IBAN validation
  iban_proof_url: z.string().url('URL inválida').optional().or(z.literal('')),
})

type FormData = z.infer<typeof formSchema>

export default function ConfiguracoesPage() {
  const supabase = createClientComponentClient()
  const { user, isLoading: authLoading } = useAuth()
  const userId = user?.id
  const { currentOrganization, isLoading: orgLoading, hasOrganizations } = useOrganization()
  
  const [isFetchingDetails, setIsFetchingDetails] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [initialData, setInitialData] = useState<FormData | null>(null)
  const [ibanProofFile, setIbanProofFile] = useState<File | null>(null)
  const [selectedCountryDialCode, setSelectedCountryDialCode] = useState<string>('');

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      business_name: '',
      vat_number: '',
      billing_address_line1: '',
      billing_address_line2: '',
      billing_postal_code: '',
      billing_city: '',
      billing_country: '',
      admin_contact_email: '',
      admin_contact_phone: '',
      iban: '',
      iban_proof_url: '',
    },
  })

  const watchedCountry = watch('billing_country');

  useEffect(() => {
    if (watchedCountry) {
      const countryData = countries.find(c => c.name === watchedCountry);
      if (countryData) {
        setSelectedCountryDialCode(countryData.dial_code);
      } else {
        setSelectedCountryDialCode('');
      }
    } else {
      if (initialData?.billing_country) {
        const initialCountryData = countries.find(c => c.name === initialData.billing_country);
        if (initialCountryData) {
          setSelectedCountryDialCode(initialCountryData.dial_code);
        }
      } else {
        setSelectedCountryDialCode('');
      }
    }
  }, [watchedCountry, initialData?.billing_country]);

  useEffect(() => {
    if (authLoading || orgLoading) {
      setIsFetchingDetails(true)
      return
    }

    if (!userId) {
      setIsFetchingDetails(false)
      return
    }

    if (!hasOrganizations && !currentOrganization) {
        setIsFetchingDetails(false)
        return;
    }

    // ✅ FUNÇÃO AUXILIAR: Buscar dados do negócio
    const fetchBusinessData = async () => {
      console.log('Fetching business details for userId:', userId);
      const { data, error } = await supabase
        .from('organizer_business_details')
        .select('*')
        .eq('user_id', userId)
      
      return { data: Array.isArray(data) && data.length > 0 ? data[0] : null, error };
    }

    // ✅ FUNÇÃO AUXILIAR: Obter valor seguro
    const getSafeValue = (data: any, field: string): string => data?.[field] ?? '';

    // ✅ FUNÇÃO AUXILIAR: Mapear dados para formulário (Complexidade: 12 → <8)
    const mapDataToForm = (singleData: any): FormData => {
      const getValue = (field: string) => getSafeValue(singleData, field);
      
      return {
        business_name: getValue('business_name'),
        vat_number: getValue('vat_number'),
        billing_address_line1: getValue('billing_address_line1'),
        billing_address_line2: getValue('billing_address_line2'),
        billing_postal_code: getValue('billing_postal_code'),
        billing_city: getValue('billing_city'),
        billing_country: getValue('billing_country'),
        admin_contact_email: getValue('admin_contact_email'),
        admin_contact_phone: getValue('admin_contact_phone'),
        iban: getValue('iban'),
        iban_proof_url: getValue('iban_proof_url'),
      };
    }

    // ✅ FUNÇÃO AUXILIAR: Resetar formulário vazio
    const resetToEmptyForm = () => {
      const emptyData = {
        business_name: '', vat_number: '', billing_address_line1: '',
        billing_address_line2: '', billing_postal_code: '', billing_city: '',
        billing_country: '', admin_contact_email: '', admin_contact_phone: '',
        iban: '', iban_proof_url: '',
      };
      setInitialData(null);
      reset(emptyData);
    }

    // ✅ FUNÇÃO PRINCIPAL REFATORADA (Complexidade: 19 → <8)
    const fetchBusinessDetails = async () => {
      setIsFetchingDetails(true)
      
      try {
        const { data: singleData, error } = await fetchBusinessData();

        if (error && error.code !== 'PGRST116') {
          console.error('Erro ao carregar detalhes da empresa:', error)
          toast({
            title: 'Erro',
            description: 'Não foi possível carregar os detalhes da sua empresa.',
            variant: 'destructive',
          })
        } else if (singleData) {
          const mappedData = mapDataToForm(singleData)
          setInitialData(mappedData)
          reset(mappedData)
        } else {
          console.log('No business details found for this user (PGRST116), form will be empty.');
          resetToEmptyForm();
        }
      } finally {
        setIsFetchingDetails(false)
      }
    }

    // Added a more specific condition to call fetchBusinessDetails
    if (userId && !authLoading && !orgLoading) {
        console.log('Calling fetchBusinessDetails now...');
        fetchBusinessDetails();
    } else {
        // If not calling, ensure fetching details is false if not already loading
        if (!authLoading && !orgLoading) {
            setIsFetchingDetails(false);
        }
    }
  }, [userId, authLoading, orgLoading, supabase, reset]) // Removed hasOrganizations and currentOrganization as they are not directly used for fetching user-specific business details here, simplifying dependencies

  const handleIbanProofChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setIbanProofFile(file);
  };

  const onSubmit: SubmitHandler<FormData> = async (formData) => {
    if (!userId) {
      toast({ title: 'Erro de Autenticação', description: 'Utilizador não autenticado. Por favor, faça login novamente.', variant: 'destructive' })
      return
    }
    // if (!currentOrganization && !hasOrganizations) { // This check might be too restrictive if a user can exist without an org initially
    //     toast({ title: 'Erro de Contexto', description: 'Nenhuma organização ativa para associar a ação.', variant: 'destructive' })
    //     return
    // }

    setIsSaving(true)
    let ibanProofUrlToSave = initialData?.iban_proof_url || '';

    try {
      if (ibanProofFile) {
        toast({ title: 'A Carregar Ficheiro', description: 'O seu comprovativo de IBAN está a ser carregado...' });
        const fileExt = ibanProofFile.name.split('.').pop();
        const filePath = `public/${userId}/iban-proof-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('ibanproofs')
          .upload(filePath, ibanProofFile, {
            cacheControl: '3600',
            upsert: true, // Use upsert to overwrite if the user uploads a new file with the same generated name (though unlikely due to timestamp) or for retries
          });

        if (uploadError) {
          console.error('Falha ao carregar o comprovativo de IBAN:', uploadError)
          throw new Error(`Falha ao carregar o comprovativo de IBAN: ${uploadError.message}`);
        }

        const { data: urlData } = supabase.storage
          .from('ibanproofs')
          .getPublicUrl(filePath);
        
        if (!urlData?.publicUrl) {
          console.error('Não foi possível obter a URL pública do comprovativo de IBAN após o upload.')
          throw new Error('Não foi possível obter a URL pública do comprovativo de IBAN após o upload.');
        }
        ibanProofUrlToSave = urlData.publicUrl;
        toast({ title: 'Upload Concluído', description: 'Comprovativo de IBAN carregado com sucesso.' });
      }

      const dataToSave = {
        ...formData,
        iban_proof_url: ibanProofUrlToSave, 
        user_id: userId,
        updated_at: new Date().toISOString(),
      };

      let dbError = null;
      let savedData = null;
      let operationType = '';


      if (initialData) { // If initialData exists, it means we are updating
        operationType = 'update';
        const { data, error } = await supabase
          .from('organizer_business_details')
          .update(dataToSave)
          .eq('user_id', userId)
          .select()
          .single();
        dbError = error;
        savedData = data;
      } else { // Otherwise, we are inserting
        operationType = 'insert';
        const { data, error } = await supabase
          .from('organizer_business_details')
          .insert([{ ...dataToSave, created_at: new Date().toISOString() }]) // created_at only on insert
          .select()
          .single();
        dbError = error;
        savedData = data;
      }

      if (dbError) {
        console.error(`Erro ao ${operationType === 'insert' ? 'inserir' : 'atualizar'} detalhes da empresa:`, dbError)
        throw new Error(`Erro ao ${operationType === 'insert' ? 'inserir' : 'atualizar'} detalhes da empresa: ${dbError.message}`);
      }

      if (savedData) {
        // Update initialData with the newly saved data to reflect the current state
        const mappedSavedData: FormData = {
          business_name: savedData.business_name || '',
          vat_number: savedData.vat_number || '',
          billing_address_line1: savedData.billing_address_line1 || '',
          billing_address_line2: savedData.billing_address_line2 || '',
          billing_postal_code: savedData.billing_postal_code || '',
          billing_city: savedData.billing_city || '',
          billing_country: savedData.billing_country || '',
          admin_contact_email: savedData.admin_contact_email || '',
          admin_contact_phone: savedData.admin_contact_phone || '',
          iban: savedData.iban || '',
          iban_proof_url: savedData.iban_proof_url || '',
        };
        setInitialData(mappedSavedData);
        reset(mappedSavedData); // Reset form with new data to clear dirty state
        setIbanProofFile(null); // Clear the selected file state
      }
      
      console.log('Attempting to show success toast. Saved data:', savedData); // Diagnostic log
      toast({
        title: 'Sucesso!',
        description: 'Os seus dados foram guardados com sucesso.',
        variant: 'default', // Or 'success' if you have that variant
      });

    } catch (error: any) {
      console.error('Erro no processo de submissão:', error);
      toast({
        title: 'Erro ao Guardar',
        description: error.message || 'Ocorreu um erro inesperado ao tentar guardar os seus dados.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || orgLoading || isFetchingDetails) {
    return <div>A carregar configurações...</div>
  }

  if (!currentOrganization && hasOrganizations) {
    return <div>Por favor, selecione uma organização para gerir as configurações.</div>
  }
  if (!hasOrganizations && !currentOrganization) {
    return <div>É necessário criar ou selecionar uma organização.</div>
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Configurações da Empresa</h1>
      <Card className="border-l-4 border-l-lime-500">
        <CardHeader>
          <CardTitle>Detalhes do Negócio</CardTitle>
          <CardDescription>
            Forneça as informações fiscais e de contacto da sua empresa.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="business_name">Nome da Empresa/Negócio</Label>
                <Input id="business_name" {...register('business_name')} placeholder="Ex: A Minha Empresa Fantástica Lda" />
                {errors.business_name && <p className="text-sm text-red-500">{errors.business_name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="vat_number">NIF / VAT Number</Label>
                <Input id="vat_number" {...register('vat_number')} placeholder="Ex: 500100200" />
                {errors.vat_number && <p className="text-sm text-red-500">{errors.vat_number.message}</p>}
                <p className="text-sm text-muted-foreground mt-1">Indique o Número de Identificação Fiscal da sua empresa.</p>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-fuchsia-600 pt-4 pb-2">Morada de Faturação</h3>
            <div className="space-y-2">
              <Label htmlFor="billing_address_line1">Linha 1 da Morada</Label>
              <Input id="billing_address_line1" {...register('billing_address_line1')} placeholder="Ex: Rua Principal, 123" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="billing_address_line2">Linha 2 da Morada (Opcional)</Label>
              <Input id="billing_address_line2" {...register('billing_address_line2')} placeholder="Ex: Bloco A, 2º Esquerdo" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="billing_postal_code">Código Postal</Label>
                <Input id="billing_postal_code" {...register('billing_postal_code')} placeholder="Ex: 4750-000" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billing_city">Cidade</Label>
                <Input id="billing_city" {...register('billing_city')} placeholder="Ex: Barcelos" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billing_country">País</Label>
                <Select
                  value={watchedCountry || ''}
                  onValueChange={(value) => setValue('billing_country', value, { shouldValidate: true })}
                >
                  <SelectTrigger id="billing_country" className="w-full">
                    <SelectValue placeholder="Selecione o país" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((country) => (
                      <SelectItem key={country.code} value={country.name}>
                        <span className="mr-2">{country.flag}</span>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" {...register('billing_country')} />
                {errors.billing_country && <p className="text-sm text-red-500">{errors.billing_country.message}</p>}
              </div>
            </div>

            <h3 className="text-lg font-semibold text-fuchsia-600 pt-4 pb-2">Contacto Administrativo</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="admin_contact_email">Email de Contacto</Label>
                <Input id="admin_contact_email" type="email" {...register('admin_contact_email')} placeholder="Ex: contacto@empresa.pt" />
                {errors.admin_contact_email && <p className="text-sm text-red-500">{errors.admin_contact_email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin_contact_phone">Telemóvel de Contacto</Label>
                <Input 
                  id="admin_contact_phone" 
                  {...register('admin_contact_phone')} 
                  placeholder={`${selectedCountryDialCode || '+XXX'} 9XX XXX XXX`} 
                />
                {errors.admin_contact_phone && <p className="text-sm text-red-500">{errors.admin_contact_phone.message}</p>}
              </div>
            </div>
            
            <h3 className="text-lg font-semibold text-fuchsia-600 pt-4 pb-2">Detalhes Bancários</h3>
             <div className="space-y-2">
              <Label htmlFor="iban">IBAN</Label>
              <Input id="iban" {...register('iban')} placeholder="Ex: PT50000000000000000000000" />
              {errors.iban && <p className="text-sm text-red-500">{errors.iban.message}</p>}
              <p className="text-sm text-muted-foreground mt-1">Introduza o seu IBAN completo, incluindo o código do país (ex: PT50...).</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="iban_proof_file">Comprovativo de IBAN (PDF, PNG, JPG)</Label>
              <Input 
                id="iban_proof_file" 
                type="file" 
                accept=".pdf,.png,.jpg,.jpeg" 
                onChange={handleIbanProofChange} 
                className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-foreground file:text-primary hover:file:bg-primary/90"
              />
              {ibanProofFile && (
                <p className="text-sm text-muted-foreground">Ficheiro selecionado: {ibanProofFile.name}</p>
              )}
              {!ibanProofFile && initialData?.iban_proof_url && (
                <div className="text-sm">
                  <p className="text-muted-foreground">Comprovativo existente: 
                    <Link href={initialData.iban_proof_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1">
                      Ver Comprovativo
                    </Link>
                  </p>
                </div>
              )}
              {errors.iban_proof_url && <p className="text-sm text-red-500">{errors.iban_proof_url.message}</p>}
            </div>

          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full md:w-auto" disabled={isSaving}>
              {isSaving ? 'A Guardar...' : 'Guardar alterações'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
} 