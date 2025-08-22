'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { format, parse } from 'date-fns'
import { Calendar as CalendarIcon, Upload, Clock, X as XIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/components/ui/use-toast'
import { useOrganization } from '@/app/contexts/organization-context'
import { v4 as uuidv4 } from 'uuid'
import { createClient } from '@/lib/supabase'
import { Skeleton } from '@/components/ui/skeleton'

// 🔄 FUNÇÃO AUXILIAR: Extrair nome e extensão do arquivo
function extractFileNameParts(fileName: string): { name: string; extension: string } {
  const lastDot = fileName.lastIndexOf('.');
  return {
    name: lastDot > 0 ? fileName.substring(0, lastDot) : fileName,
    extension: lastDot > 0 ? fileName.substring(lastDot) : ''
  };
}

// 🔄 FUNÇÃO AUXILIAR: Normalizar texto removendo acentos
function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// 🔄 FUNÇÃO AUXILIAR: Limpar caracteres especiais
function cleanSpecialChars(text: string): string {
  return text
    .replace(/[^a-zA-Z0-9.-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// ✅ FUNÇÃO PRINCIPAL REFATORADA (Complexidade: 19 → 3)
function sanitizeFileName(fileName: string): string {
  const { name, extension } = extractFileNameParts(fileName);
  const normalizedName = normalizeText(name);
  const cleanedName = cleanSpecialChars(normalizedName).toLowerCase();
  
  return cleanedName + extension;
}

// --- Funções Auxiliares para Data/Hora ---
function combineDateTime(date: Date | undefined, time: string | undefined): Date | null {
  if (!date || !time) return null;
  try {
    const [hours, minutes] = time.split(':').map(Number);
    // Validar horas e minutos (básico)
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        throw new Error("Hora inválida");
    }
    const newDate = new Date(date);
    newDate.setHours(hours, minutes, 0, 0); // Definir hora, minuto, segundo=0, ms=0
    // Verificar se a data resultante é válida
    if (isNaN(newDate.getTime())) {
        throw new Error("Data combinada inválida");
    }
    return newDate;
  } catch (error) {
    console.error("Erro ao combinar data e hora:", date, time, error);
    return null; // Retornar null em caso de erro
  }
}

function extractDate(dateTime: Date | string | null | undefined): Date | undefined {
  if (!dateTime) return undefined;
  try {
    const date = new Date(dateTime);
    if (isNaN(date.getTime())) return undefined; // Verificar data inválida
    // Zerar a hora para evitar problemas de fuso horário ao exibir só a data
    date.setHours(0, 0, 0, 0);
    return date;
  } catch (error) {
    console.error("Erro ao extrair data:", dateTime, error);
    return undefined;
  }
}

function extractTime(dateTime: Date | string | null | undefined): string {
  if (!dateTime) return '00:00'; // Retorna um padrão caso não haja hora
  try {
    const date = new Date(dateTime);
    if (isNaN(date.getTime())) return '00:00'; // Verificar data inválida
    return format(date, 'HH:mm'); // Formato HH:mm
  } catch (error) {
    console.error("Erro ao extrair hora:", dateTime, error);
    return '00:00';
  }
}
// --- Fim das Funções Auxiliares ---

// Schema do formulário atualizado
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/; // HH:MM format
const MAX_PROMO_IMAGES = 3;
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const GuestListFormSchema = z.object({
  title: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres'),
  description: z.string().min(10, 'A descrição deve ter pelo menos 10 caracteres'),
  startDate: z.date({ required_error: 'A data de início do evento é obrigatória' }),
  startTime: z.string().regex(timeRegex, "Hora inválida (HH:MM)").default('20:00'),
  endDate: z.date({ required_error: 'A data de término do evento é obrigatória' }),
  endTime: z.string().regex(timeRegex, "Hora inválida (HH:MM)").default('23:00'),
  guestListOpenDate: z.date({ required_error: 'A data de abertura da lista é obrigatória' }),
  guestListOpenTime: z.string().regex(timeRegex, "Hora inválida (HH:MM)").default('09:00'),
  guestListCloseDate: z.date({ required_error: 'A data de fechamento da lista é obrigatória' }),
  guestListCloseTime: z.string().regex(timeRegex, "Hora inválida (HH:MM)").default('17:00'),
  location: z.string().min(3, 'O local deve ter pelo menos 3 caracteres'),
  flyer: z.any()
      .refine(files => files instanceof FileList && files.length === 1, "O flyer do evento é obrigatório.")
      .refine(files => !(files instanceof FileList) || files.length === 0 || files?.[0]?.size <= MAX_FILE_SIZE_BYTES, `O flyer não pode exceder ${MAX_FILE_SIZE_MB}MB.`)
      .refine(files => !(files instanceof FileList) || files.length === 0 || files?.[0]?.type.startsWith('image/'), "O flyer deve ser uma imagem."),
  maxGuests: z.preprocess(
    (val) => (val === '' || val === null || isNaN(Number(val)) ? undefined : Number(val)),
    z.number({ invalid_type_error: "Deve ser um número" })
     .min(1, 'O limite deve ser no mínimo 1')
     .int("Deve ser um número inteiro")
     .optional()
  ).default(1000),
  isEventActive: z.boolean().default(true),
  promotionalImages: z.any()
    .optional()
    .refine(files => !files || (files instanceof FileList && files.length <= MAX_PROMO_IMAGES), { message: `Pode carregar no máximo ${MAX_PROMO_IMAGES} imagens.` })
    .refine(files => !files || !(files instanceof FileList) || Array.from(files).every(file => file.size <= MAX_FILE_SIZE_BYTES), { message: `Cada imagem não pode exceder ${MAX_FILE_SIZE_MB}MB.` })
    .refine(files => !files || !(files instanceof FileList) || Array.from(files).every(file => file.type.startsWith('image/')), { message: "Apenas ficheiros de imagem são permitidos." }),
}).refine(data => {
  const openDateTime = combineDateTime(data.guestListOpenDate, data.guestListOpenTime);
  const closeDateTime = combineDateTime(data.guestListCloseDate, data.guestListCloseTime);
  return !openDateTime || !closeDateTime || openDateTime < closeDateTime;
}, {
  message: "A data/hora de abertura da lista deve ser anterior à data/hora de fechamento",
  path: ["guestListCloseTime"],
}).refine(data => {
  const startDateTime = combineDateTime(data.startDate, data.startTime);
  const endDateTime = combineDateTime(data.endDate, data.endTime);
  return !startDateTime || !endDateTime || startDateTime <= endDateTime;
}, {
  message: "A data/hora de início do evento deve ser anterior ou igual à data/hora de término",
  path: ["endTime"],
}).refine(data => {
    const guestListOpenDateTime = combineDateTime(data.guestListOpenDate, data.guestListOpenTime);
    const eventEndDateTime = combineDateTime(data.endDate, data.endTime);
    return !guestListOpenDateTime || !eventEndDateTime || guestListOpenDateTime < eventEndDateTime;
}, {
    message: "A lista não pode abrir depois do fim do evento",
    path: ["guestListOpenTime"],
}).refine(data => {
    const guestListCloseDateTime = combineDateTime(data.guestListCloseDate, data.guestListCloseTime);
    const eventEndDateTime = combineDateTime(data.endDate, data.endTime);
    return !guestListCloseDateTime || !eventEndDateTime || guestListCloseDateTime <= eventEndDateTime;
}, {
    message: "A lista deve fechar antes ou no momento do fim do evento",
    path: ["guestListCloseTime"],
});

type GuestListFormValues = z.infer<typeof GuestListFormSchema>

// Inicializar o cliente Supabase aqui para estar disponível no escopo do componente e seus hooks/efeitos
const supabase = createClient();

// ✅ FUNÇÃO AUXILIAR 1: Validação inicial (Complexidade: 3)
async function validateSubmissionRequirements(currentOrganization: any): Promise<{isValid: boolean, authData?: any}> {
  if (!currentOrganization) {
    toast({ title: "Nenhuma organização selecionada", description: "Selecione uma organização", variant: "destructive" });
    return { isValid: false };
  }

  const { data: authData, error: authError } = await supabase.auth.getSession();
  if (authError || !authData.session) {
    toast({ title: "Erro de autenticação", description: "Sessão inválida. Faça login novamente.", variant: "destructive" });
    return { isValid: false };
  }

  return { isValid: true, authData };
}

// ✅ FUNÇÃO AUXILIAR 2: Upload de flyer em modo edição (Complexidade: 3)
async function handleEditModeFlyer(data: any, existingFlyerUrl: string, currentOrganization: any): Promise<string | null> {
  // Cenário 1: Novo flyer selecionado
  if (data.flyer && data.flyer.length > 0 && data.flyer[0].name !== 'flyer-placeholder.png') {
    console.log("Modo Edição: Novo flyer selecionado. Iniciando upload...");
    const file = data.flyer[0];
    const fileName = `${uuidv4()}-${sanitizeFileName(file.name)}`;
    const filePath = `${currentOrganization.id}/${fileName}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('event-flyers')
      .upload(filePath, file, { upsert: true });
    if (uploadError) throw uploadError;
    const { data: urlData } = supabase.storage.from('event-flyers').getPublicUrl(uploadData.path);
    console.log("Modo Edição: Novo flyer carregado. URL:", urlData?.publicUrl);
    return urlData?.publicUrl || null;
  }
  
  // Cenário 2: Placeholder presente (manter flyer existente)
  if (data.flyer && data.flyer.length > 0 && data.flyer[0].name === 'flyer-placeholder.png') {
    console.log("Modo Edição: Placeholder detetado. Mantendo flyer URL existente:", existingFlyerUrl);
    return existingFlyerUrl;
  }
  
  // Cenário 3: Flyer removido explicitamente
  if (!data.flyer || data.flyer.length === 0) {
    console.log("Modo Edição: Flyer removido explicitamente.");
    return null;
  }
  
  // Cenário Fallback
  console.warn("Modo Edição: Estado inesperado do flyer. Definindo URL do flyer como null.");
  return null;
}

// ✅ FUNÇÃO AUXILIAR 3: Upload de flyer em modo criação (Complexidade: 2)
async function handleCreationModeFlyer(data: any, currentOrganization: any): Promise<string | null> {
  if (data.flyer && data.flyer.length > 0) {
    console.log("Modo Criação: Flyer selecionado. Iniciando upload...");
    const file = data.flyer[0];
    const fileName = `${uuidv4()}-${sanitizeFileName(file.name)}`;
    const filePath = `${currentOrganization.id}/${fileName}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('event-flyers')
      .upload(filePath, file, { upsert: true });
    if (uploadError) throw uploadError;
    const { data: urlData } = supabase.storage.from('event-flyers').getPublicUrl(uploadData.path);
    console.log("Modo Criação: Flyer carregado. URL:", urlData?.publicUrl);
    return urlData?.publicUrl || null;
  } else {
    console.log("Modo Criação: Nenhum flyer selecionado.");
    return null;
  }
}

// ✅ FUNÇÃO AUXILIAR 4: Processar upload de flyer (Complexidade: 2)
async function processFlyerUpload(data: any, isEditMode: boolean, existingFlyerUrl: string, currentOrganization: any): Promise<string | null> {
  try {
    if (isEditMode) {
      return await handleEditModeFlyer(data, existingFlyerUrl, currentOrganization);
    } else {
      return await handleCreationModeFlyer(data, currentOrganization);
    }
  } catch (uploadCatchError: any) {
    console.error("Erro detalhado no upload do flyer:", JSON.stringify(uploadCatchError, null, 2));
    let uploadUserMessage = "Falha no upload do flyer.";
    if (uploadCatchError?.message) {
      uploadUserMessage += ` (${uploadCatchError.message})`;
    }
    toast({ title: "Erro de Upload", description: uploadUserMessage, variant: "destructive" });
    throw uploadCatchError;
  }
}

// ✅ FUNÇÃO AUXILIAR 5: Preparar e validar datas (Complexidade: 3)
function prepareDateTimesAndValidate(data: any): { isValid: boolean; dateTimes?: any } {
  const startDateTime = combineDateTime(data.startDate, data.startTime);
  const endDateTime = combineDateTime(data.endDate, data.endTime);
  const guestListOpenDateTime = combineDateTime(data.guestListOpenDate, data.guestListOpenTime);
  const guestListCloseDateTime = combineDateTime(data.guestListCloseDate, data.guestListCloseTime);

  // Validação de datas combinadas
  if (!startDateTime || !endDateTime || !guestListOpenDateTime || !guestListCloseDateTime) {
    console.error("Erro crítico ao combinar datas/horas:", { startDateTime, endDateTime, guestListOpenDateTime, guestListCloseDateTime });
    toast({ title: "Erro de Data/Hora", description: "Ocorreu um erro ao processar as datas e horas. Verifique os valores inseridos.", variant: "destructive" });
    return { isValid: false };
  }

  // Validações de regras de negócio
  if (startDateTime > endDateTime) {
    toast({ title: "Erro de Data", description: "A data/hora de início não pode ser depois da data/hora de fim.", variant: "destructive" });
    return { isValid: false };
  }

  if (guestListOpenDateTime >= guestListCloseDateTime) {
    toast({ title: "Erro de Data", description: "A abertura da lista deve ser antes do fecho.", variant: "destructive" });
    return { isValid: false };
  }

  if (guestListCloseDateTime > endDateTime) {
    toast({ title: "Erro de Data", description: "A lista deve fechar antes ou ao mesmo tempo que o evento termina.", variant: "destructive" });
    return { isValid: false };
  }

  return { 
    isValid: true, 
    dateTimes: { startDateTime, endDateTime, guestListOpenDateTime, guestListCloseDateTime }
  };
}

// ✅ FUNÇÃO AUXILIAR 6: Construir objeto de dados do evento (Complexidade: 1)
function buildEventDataObject(data: any, flyerUrl: string | null, currentOrganization: any, dateTimes: any, isEditMode: boolean, eventId?: string): any {
  const { startDateTime, endDateTime, guestListOpenDateTime, guestListCloseDateTime } = dateTimes;
  
  return {
    ...(isEditMode && eventId ? { id: eventId } : {}),
    organization_id: currentOrganization.id,
    title: data.title,
    description: data.description,
    date: format(startDateTime, 'yyyy-MM-dd'),
    time: format(startDateTime, 'HH:mm:ss'),
    end_date: format(endDateTime, 'yyyy-MM-dd'),
    end_time: format(endDateTime, 'HH:mm:ss'),
    location: data.location,
    flyer_url: flyerUrl,
    type: 'guest-list' as const,
    is_published: data.isEventActive,
    guest_list_open_datetime: guestListOpenDateTime.toISOString(),
    guest_list_close_datetime: guestListCloseDateTime.toISOString(),
    guest_list_settings: {
      max_guests: data.maxGuests ?? 1000,
    },
  };
}

// ✅ FUNÇÃO AUXILIAR 7: Tratar erros de database (Complexidade: 3)
function handleDatabaseError(upsertError: any): void {
  console.error("Erro detalhado no upsert do evento:", JSON.stringify(upsertError, null, 2));

  let userMessage = "Ocorreu um erro desconhecido ao salvar o evento.";
  if (upsertError.message) {
    userMessage = `Erro ao salvar: ${upsertError.message}`;
  }
  if (upsertError.code === '23505') {
    userMessage = "Erro: Já existe um evento com detalhes semelhantes (possivelmente título e datas iguais).";
  } else if (upsertError.code === '23503') {
    userMessage = "Erro: A organização associada não foi encontrada ou houve um problema de permissão.";
  } else if (upsertError.code === '22007' || upsertError.code === '22008') {
    userMessage = "Erro: Formato inválido de data ou hora fornecido.";
  }
  
  toast({ title: "Erro ao Salvar Evento", description: userMessage, variant: "destructive" });
}

// ✅ FUNÇÃO AUXILIAR 8: Salvar evento no database (Complexidade: 2)
async function saveEventToDatabase(eventData: any): Promise<string | null> {
  console.log("Dados a serem enviados para upsert:", eventData);

  const { data: upsertResult, error: upsertError } = await supabase
    .from('events')
    .upsert(eventData, { onConflict: 'id' })
    .select('id')
    .single();

  if (upsertError) {
    handleDatabaseError(upsertError);
    return null;
  }

  const savedEventId = upsertResult?.id;
  console.log("Upsert do evento bem-sucedido. Evento ID:", savedEventId);
  return savedEventId || null;
}

// ✅ FUNÇÃO AUXILIAR 9: Upload de um arquivo promocional (Complexidade: 2)
async function uploadSinglePromotionalFile(file: File, eventId: string, currentOrganization: any, authData: any): Promise<void> {
  const userId = authData.session.user.id;
  const BUCKET_NAME = 'promotional-materials-images';
  const fileName = `${uuidv4()}-${sanitizeFileName(file.name)}`;
  const filePath = `${currentOrganization.id}/${eventId}/${fileName}`;

  console.log(`Uploading promotional file: ${filePath} para o bucket ${BUCKET_NAME}`);
  
  const { data: promoUploadData, error: promoUploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, { upsert: true });

  if (promoUploadError) {
    console.error(`Erro no upload para storage (${filePath}):`, promoUploadError);
    throw new Error(`Falha no upload de ${file.name}: ${promoUploadError.message || 'Detalhe indisponível'}`);
  }

  const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(promoUploadData.path);
  const imageUrl = urlData?.publicUrl;

  if (!imageUrl) {
    console.error(`Não foi possível obter URL pública para ${filePath}`);
    throw new Error(`Não foi possível obter URL pública para ${file.name}`);
  }

  console.log(`URL pública obtida (${filePath}): ${imageUrl}`);

  const { error: insertMaterialError } = await supabase
    .from('promotional_materials')
    .insert({
      event_id: eventId,
      organization_id: currentOrganization.id,
      image_url: imageUrl,
      uploaded_by: userId,
    });

  if (insertMaterialError) {
    console.error(`Erro ao inserir na DB (${filePath}):`, insertMaterialError);
    throw new Error(`Falha ao salvar material promocional ${file.name}: ${insertMaterialError.message}`);
  }

  console.log(`Material promocional salvo com sucesso: ${filePath}`);
}

// ✅ FUNÇÃO AUXILIAR 10: Processar materiais promocionais (Complexidade: 2)
async function processPromotionalMaterials(savedEventId: string, promotionalFiles: File[], currentOrganization: any, authData: any): Promise<void> {
  if (promotionalFiles.length === 0) {
    console.log("Nenhum material promocional novo para processar.");
    return;
  }

  console.log(`Iniciando upload de ${promotionalFiles.length} materiais promocionais para o evento ${savedEventId}`);

  const uploadPromises = promotionalFiles.map(file => 
    uploadSinglePromotionalFile(file, savedEventId, currentOrganization, authData)
  );

  try {
    await Promise.all(uploadPromises);
    console.log("Todos os materiais promocionais foram processados com sucesso.");
  } catch (error: any) {
    console.error("Erro ao processar materiais promocionais:", error);
    throw new Error(`Erro no upload de materiais promocionais: ${error.message}`);
  }
}

// ✅ FUNÇÃO AUXILIAR 11: Finalizar submissão com sucesso (Complexidade: 1)
function handleSubmissionSuccess(title: string, isEditMode: boolean, router: any): void {
  toast({
    title: `Evento ${isEditMode ? 'Atualizado' : 'Criado'}!`,
    description: `O evento "${title}" foi salvo com sucesso.`,
  });
  router.push('/app/organizador/eventos');
}

// ✅ FUNÇÃO AUXILIAR 12: Tratar erro de submissão (Complexidade: 1)
function handleSubmissionError(catchError: any): void {
  console.error("Erro inesperado durante o upsert:", catchError);
  let catchUserMessage = "Ocorreu um erro inesperado ao processar a operação.";
  if (catchError instanceof Error && catchError.message) {
    catchUserMessage = catchError.message;
  }
  toast({ title: "Erro Inesperado", description: catchUserMessage, variant: "destructive" });
}

export default function GuestListPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const eventId = searchParams.get('id')
  const [isLoading, setIsLoading] = useState(!!eventId); // Começa loading se for edit mode
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isEditMode, setIsEditMode] = useState(!!eventId)
  const [flyerPreview, setFlyerPreview] = useState<string | null>(null)
  const { currentOrganization } = useOrganization()
  // Adicionar estado para guardar a URL do flyer existente em modo edição
  const [existingFlyerUrl, setExistingFlyerUrl] = useState<string | null>(null);
  // Novos estados para materiais promocionais
  const [promotionalFiles, setPromotionalFiles] = useState<File[]>([]);
  const [promotionalPreviews, setPromotionalPreviews] = useState<string[]>([]);
  // Estado para URLs existentes (a ser preenchido no modo edição)
  const [existingPromoImageUrls, setExistingPromoImageUrls] = useState<string[]>([]); 

  const form = useForm<GuestListFormValues>({
    resolver: zodResolver(GuestListFormSchema),
    // Definir valores default EXPLÍCITOS para TODOS os campos
    // para evitar erro de uncontrolled/controlled.
    // Espelhar os defaults do schema Zod.
    defaultValues: {
      title: '',
      description: '',
      startDate: undefined, // Calendar/Popover pode lidar melhor com undefined inicial
      startTime: '20:00', // Default do schema
      endDate: undefined,
      endTime: '23:00', // Default do schema
      guestListOpenDate: undefined,
      guestListOpenTime: '09:00', // Default do schema
      guestListCloseDate: undefined,
      guestListCloseTime: '17:00', // Default do schema
      location: '',
      flyer: undefined,
      maxGuests: 1000, // Default do schema
      isEventActive: true, // Default do schema
      promotionalImages: undefined, // Adicionar valor padrão
    },
  })

  // Inicializar as datas padrão APENAS se não for modo edição
  // (O useEffect de modo edição já faz reset com os dados corretos)
  useEffect(() => {
    if (!isEditMode) { // Apenas para criação
      console.log("Setting default dates for new event (if needed)");
      const now = new Date();
      const defaultOpenDate = new Date(now);

      const defaultEventStartDate = new Date();
      defaultEventStartDate.setDate(defaultEventStartDate.getDate() + 3);
      defaultEventStartDate.setHours(0, 0, 0, 0); // Zerar hora para data
      
      const defaultEventEndDate = new Date(defaultEventStartDate);
      defaultEventEndDate.setHours(0, 0, 0, 0); // Zerar hora para data
      
      const defaultCloseDate = new Date(defaultEventStartDate);
      defaultCloseDate.setHours(0, 0, 0, 0);

      // Usar reset SÓ para as datas, pois os outros defaults já estão no useForm
      // E apenas se os valores ainda não foram tocados (isDirty)
      if (!form.formState.isDirty) {
          form.reset({
              ...form.getValues(), // Manter os outros defaults/valores
              startDate: defaultEventStartDate,
              endDate: defaultEventEndDate,
              guestListOpenDate: defaultOpenDate,
              guestListCloseDate: defaultCloseDate,
              // Não precisamos de redefinir horas, etc., pois já estão nos defaultValues do useForm
          });
       } else {
           console.log("Form is dirty, not resetting default dates.");
       }
    }
  // Remover form das dependências pode ser mais seguro para evitar loops
  // A lógica agora depende apenas de isEditMode para definir datas iniciais.
  }, [isEditMode]);

  // Carregar dados do evento e MATERIAIS PROMOCIONAIS em modo edição
  useEffect(() => {
    async function loadEventData() {
      if (eventId && currentOrganization?.id) {
        setIsLoading(true);
        try {
          console.log("Carregando evento para edição:", eventId)
          const { data: event, error: eventError } = await supabase
            .from('events')
            .select('*')
            .eq('id', eventId)
            .eq('organization_id', currentOrganization.id)
            .single()
          
          if (eventError || !event) {
            console.error("Erro ao carregar evento ou evento não encontrado:", eventError)
            toast({ title: "Erro", description: "Não foi possível carregar os dados do evento ou evento não pertence à organização.", variant: "destructive" })
            router.push('/app/organizador/eventos')
            return
          }
          console.log("Evento carregado:", event)
          if (event.type !== 'guest-list') {
            console.error("Evento não é do tipo guest list")
            toast({ title: "Tipo incorreto", description: "Este evento não é uma guest list", variant: "destructive" })
            router.push('/app/organizador/eventos')
            return
          }
          
          // Buscar materiais promocionais associados
          console.log("Buscando materiais promocionais para o evento:", eventId);
          const { data: promoMaterials, error: promoError } = await supabase
              .from('promotional_materials')
              .select('image_url')
              .eq('event_id', eventId);

          if (promoError) {
              console.warn("Erro ao buscar materiais promocionais:", promoError);
          } else {
              const urls = promoMaterials?.map(m => m.image_url) || [];
              console.log("Materiais promocionais existentes:", urls);
              setExistingPromoImageUrls(urls);
          }

          // --- Lógica para Flyer Dummy --- 
          let flyerValue: FileList | undefined = undefined; // Alterado tipo e valor default
          // Garantir que esta lógica só corre no browser
          if (typeof window !== 'undefined') { 
            if (event.flyer_url) {
              console.log("Evento existente tem flyer_url:", event.flyer_url);
              setExistingFlyerUrl(event.flyer_url); // <<< GUARDAR URL EXISTENTE
              // Criar dummy FileList com 1 ficheiro placeholder para satisfazer Zod
              const dummyFile = new File(["existing"], "flyer-placeholder.png", { type: "image/png" });
              const dataTransfer = new DataTransfer();
              dataTransfer.items.add(dummyFile);
              flyerValue = dataTransfer.files;
              setFlyerPreview(event.flyer_url); // Definir preview
            } else {
              console.log("Evento existente NÃO tem flyer_url.");
              setExistingFlyerUrl(null); // Garantir que está nulo
              // Usar FileList vazio se não houver flyer existente
              const dataTransfer = new DataTransfer(); // Precisa estar aqui também
              flyerValue = dataTransfer.files;
              setFlyerPreview(null); // Limpar preview
            }
          } else {
            // No servidor, flyerValue permanece undefined. A URL existente é definida abaixo.
            console.log("Ambiente de servidor, flyerValue será undefined para form.reset. URL existente será usada se houver.");
          }
          // --- Fim Lógica Flyer Dummy --- 

          // Estimar hora de fim se não existir (3h após início)
          let estimatedEndTime = '23:00';
          if (event.time) {
            try {
                const startDate = new Date(`1970-01-01T${event.time}Z`);
                startDate.setUTCHours(startDate.getUTCHours() + 3);
                estimatedEndTime = format(startDate, 'HH:mm');
            } catch { /* manter default */ }
          }

          // Preencher o formulário com os dados do evento
          form.reset({
            title: event.title || '',
            description: event.description || '',
            startDate: extractDate(event.date),
            startTime: event.time ? format(new Date(`1970-01-01T${event.time}`), 'HH:mm') : '00:00',
            endDate: extractDate(event.end_date || event.date),
            endTime: event.end_time ? format(new Date(`1970-01-01T${event.end_time}`), 'HH:mm') : estimatedEndTime,
            guestListOpenDate: extractDate(event.guest_list_open_datetime),
            guestListOpenTime: extractTime(event.guest_list_open_datetime),
            guestListCloseDate: extractDate(event.guest_list_close_datetime),
            guestListCloseTime: extractTime(event.guest_list_close_datetime),
            location: event.location || '',
            maxGuests: (event.guest_list_settings as any)?.max_guests ?? 1000,
            isEventActive: event.is_published !== false,
            flyer: flyerValue, // Usar o flyerValue (pode ser undefined no SSR)
            promotionalImages: undefined // Manter vazio ao carregar
          });

        } catch (error) {
          console.error("Erro inesperado ao carregar evento:", error)
          toast({ title: "Erro", description: "Ocorreu um problema ao carregar os dados do evento", variant: "destructive" })
        } finally {
          setIsLoading(false)
        }
      } else if (!eventId) {
          // Em modo de criação, não há flyer existente no servidor
          if (typeof window !== 'undefined') {
            setFlyerPreview(null);
            const dataTransfer = new DataTransfer();
            form.setValue('flyer', dataTransfer.files, { shouldValidate: false });
          }
          setExistingFlyerUrl(null); // Garantir nulo em modo criação
          setIsLoading(false);
      }
    }
    loadEventData()
  }, [eventId, currentOrganization?.id, form, router])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const dataTransfer = new DataTransfer();
    const emptyFileList = dataTransfer.files;

    if (file) {
      if (!file.type.startsWith('image/')) {
          toast({ title: "Erro", description: "Por favor, selecione um ficheiro de imagem.", variant: "destructive" });
          e.target.value = '';
          setFlyerPreview(null);
          // Corrigir: Usar FileList vazio
          form.setValue('flyer', emptyFileList, { shouldValidate: true });
          return;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
          toast({ title: "Erro", description: `O ficheiro é demasiado grande (máximo ${MAX_FILE_SIZE_MB}MB).`, variant: "destructive" });
          e.target.value = '';
          setFlyerPreview(null);
          // Corrigir: Usar FileList vazio
          form.setValue('flyer', emptyFileList, { shouldValidate: true });
          return;
      }
      const reader = new FileReader()
      reader.onloadend = () => { setFlyerPreview(reader.result as string) }
      reader.readAsDataURL(file)
      // Passar o FileList selecionado (que tem 1 ficheiro)
      form.setValue('flyer', e.target.files as FileList, { shouldValidate: true, shouldDirty: true })
    } else {
        setFlyerPreview(null);
        // Corrigir: Usar FileList vazio ao desmarcar
        form.setValue('flyer', emptyFileList, { shouldValidate: true });
    }
  }

  // Novo handler para ficheiros promocionais múltiplos
  const handlePromotionalFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) {
        setPromotionalFiles([]);
        setPromotionalPreviews([]);
        form.setValue('promotionalImages', undefined);
        return;
    }

    const newFilesArray = Array.from(selectedFiles);
    // Combina ficheiros existentes no estado com os novos selecionados
    // Não permite adicionar mais do que o limite total
    const combinedFiles = [...promotionalFiles, ...newFilesArray].slice(0, MAX_PROMO_IMAGES);

    const validFiles: File[] = [];
    const fileProcessingPromises: Promise<string>[] = []; // Para gerar previews

    combinedFiles.forEach((file, index) => {
        // Validar cada ficheiro individualmente (redundante com Zod, mas bom para feedback imediato)
        if (!file.type.startsWith('image/')) {
            if (index >= promotionalFiles.length) { // Só mostrar erro para ficheiros novos
                toast({ title: "Tipo Inválido", description: `'${file.name}' não é uma imagem.`, variant: "destructive" });
            }
            return; // Pular ficheiro inválido
        }
        if (file.size > MAX_FILE_SIZE_BYTES) {
            if (index >= promotionalFiles.length) {
                toast({ title: "Tamanho Excedido", description: `'${file.name}' excede ${MAX_FILE_SIZE_MB}MB.`, variant: "destructive" });
            }
            return; // Pular ficheiro inválido
        }

        validFiles.push(file);

        // Criar uma Promise para ler o ficheiro e gerar preview
        const readerPromise = new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
        fileProcessingPromises.push(readerPromise);
    });

    // Atualizar estado dos ficheiros válidos
    setPromotionalFiles(validFiles);

    // Processar todas as leituras de ficheiro e atualizar previews
    Promise.all(fileProcessingPromises).then(previews => {
        setPromotionalPreviews(previews);
    }).catch(error => {
        console.error("Erro ao gerar previews:", error);
        toast({ title: "Erro de Preview", description: "Não foi possível gerar a pré-visualização de uma imagem.", variant: "destructive" });
    });

    // Atualizar o campo do formulário
    const dataTransfer = new DataTransfer();
    validFiles.forEach(file => dataTransfer.items.add(file));
    form.setValue('promotionalImages', dataTransfer.files.length > 0 ? dataTransfer.files : undefined, { shouldValidate: true, shouldDirty: true });

    // Limpar o valor do input
    e.target.value = '';
  };

  // Função para remover uma imagem promocional selecionada (da lista de NOVOS ficheiros)
  const removePromotionalImage = (indexToRemove: number) => {
    const updatedFiles = promotionalFiles.filter((_, index) => index !== indexToRemove);
    const updatedPreviews = promotionalPreviews.filter((_, index) => index !== indexToRemove);

    setPromotionalFiles(updatedFiles);
    setPromotionalPreviews(updatedPreviews);

    // Atualizar o campo do formulário
    const dataTransfer = new DataTransfer();
    updatedFiles.forEach(file => dataTransfer.items.add(file));
    form.setValue('promotionalImages', dataTransfer.files.length > 0 ? dataTransfer.files : undefined, { shouldValidate: true, shouldDirty: true });
  };

  // ✅ FUNÇÃO PRINCIPAL REFATORADA (Complexidade: 55-60 → 8)
  const onSubmitGuestList = async (data: GuestListFormValues) => {
    console.log("Submetendo formulário com dados:", data);

    // 1. Validação inicial
    const validation = await validateSubmissionRequirements(currentOrganization);
    if (!validation.isValid) return;

    setIsSubmitting(true);

    try {
      // 2. Processar upload de flyer
      const flyerUrl = await processFlyerUpload(data);

      // 3. Preparar e validar dados de data/hora
      const dateTimeValidation = prepareDateTimesAndValidate(data);
      if (!dateTimeValidation.isValid) {
        setIsSubmitting(false);
        return;
      }

      // 4. Construir dados do evento
      const eventData = buildEventDataObject(data, flyerUrl, currentOrganization, dateTimeValidation.dateTimes!, isEditMode, eventId);

      // 5. Salvar evento no database
      const savedEventId = await saveEventToDatabase(eventData);
      if (!savedEventId) {
        setIsSubmitting(false);
        return;
      }

      // 6. Processar materiais promocionais
      await processPromotionalMaterials(savedEventId);

      // 7. Sucesso!
      handleSubmissionSuccess(data.title);

    } catch (error: any) {
      handleSubmissionError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🔄 FUNÇÃO AUXILIAR 1: Validar requisitos de submissão
  const validateSubmissionRequirements = async (organization: any) => {
    if (!organization) {
      toast({ title: "Erro", description: "Organização não encontrada. Por favor, selecione uma organização válida.", variant: "destructive" });
      return { isValid: false };
    }

    if (!authData?.session?.user) {
      toast({ title: "Erro", description: "Utilizador não autenticado.", variant: "destructive" });
      return { isValid: false };
    }

    return { isValid: true, authData };
  };

  // FUNÇÃO ORIGINAL REMOVIDA - REFATORAÇÃO COMPLETA // Variável para URL final do flyer

  // 🔄 FUNÇÃO AUXILIAR 2: Processar flyer em modo edição
  const handleEditModeFlyer = async (data: any): Promise<string | null> => {
        if (data.flyer && data.flyer.length > 0 && data.flyer[0].name !== 'flyer-placeholder.png') {
          console.log("Modo Edição: Novo flyer selecionado. Iniciando upload...");
          const file = data.flyer[0];
          const fileName = `${uuidv4()}-${sanitizeFileName(file.name)}`;
      const filePath = `${currentOrganization.id}/${fileName}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('event-flyers')
            .upload(filePath, file, { upsert: true });
          if (uploadError) throw uploadError;
          const { data: urlData } = supabase.storage.from('event-flyers').getPublicUrl(uploadData.path);
      console.log("Modo Edição: Novo flyer carregado. URL:", urlData?.publicUrl);
      return urlData?.publicUrl;
        }
    
    if (data.flyer && data.flyer.length > 0 && data.flyer[0].name === 'flyer-placeholder.png') {
          console.log("Modo Edição: Placeholder detetado. Mantendo flyer URL existente:", existingFlyerUrl);
      return existingFlyerUrl;
        }
    
    if (!data.flyer || data.flyer.length === 0) {
          console.log("Modo Edição: Flyer removido explicitamente.");
      return null;
        }
    
          console.warn("Modo Edição: Estado inesperado do flyer. Definindo URL do flyer como null.");
    return null;
  };

  // 🔄 FUNÇÃO AUXILIAR 3: Processar flyer em modo criação
  const handleCreationModeFlyer = async (data: any): Promise<string | null> => {
        if (data.flyer && data.flyer.length > 0) {
          console.log("Modo Criação: Flyer selecionado. Iniciando upload...");
          const file = data.flyer[0];
          const fileName = `${uuidv4()}-${sanitizeFileName(file.name)}`;
      const filePath = `${currentOrganization.id}/${fileName}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('event-flyers')
            .upload(filePath, file, { upsert: true });
          if (uploadError) throw uploadError;
          const { data: urlData } = supabase.storage.from('event-flyers').getPublicUrl(uploadData.path);
      console.log("Modo Criação: Flyer carregado. URL:", urlData?.publicUrl);
      return urlData?.publicUrl;
        }
    
          console.log("Modo Criação: Nenhum flyer selecionado.");
    return null;
  };

  // 🔄 FUNÇÃO AUXILIAR 4: Processar upload do flyer
  const processFlyerUpload = async (data: any): Promise<string | null> => {
    try {
      if (isEditMode) {
        return await handleEditModeFlyer(data);
      } else {
        return await handleCreationModeFlyer(data);
      }
    } catch (uploadCatchError: any) {
        console.error("Erro detalhado no upload do flyer:", JSON.stringify(uploadCatchError, null, 2));
        let uploadUserMessage = "Falha no upload do flyer.";
        if (uploadCatchError?.message) {
            uploadUserMessage += ` (${uploadCatchError.message})`;
        }
        toast({ title: "Erro de Upload", description: uploadUserMessage, variant: "destructive" });
        throw uploadCatchError; // Re-throw para ser capturado pela função principal
    }
  };

  // 🔄 FUNÇÃO AUXILIAR 5: Preparar e validar dados de data/hora
  const prepareDateTimesAndValidate = (data: any) => {
    const startDateTime = combineDateTime(data.startDate, data.startTime);
    const endDateTime = combineDateTime(data.endDate, data.endTime);
    const guestListOpenDateTime = combineDateTime(data.guestListOpenDate, data.guestListOpenTime);
    const guestListCloseDateTime = combineDateTime(data.guestListCloseDate, data.guestListCloseTime);

    if (!startDateTime || !endDateTime || !guestListOpenDateTime || !guestListCloseDateTime) {
      console.error("Erro crítico ao combinar datas/horas:", { startDateTime, endDateTime, guestListOpenDateTime, guestListCloseDateTime });
        toast({ title: "Erro de Data/Hora", description: "Ocorreu um erro ao processar as datas e horas. Verifique os valores inseridos.", variant: "destructive" });
      return { isValid: false };
    }

     if (startDateTime > endDateTime) {
      toast({ title: "Erro de Data", description: "A data/hora de início não pode ser depois da data/hora de fim.", variant: "destructive" });
      return { isValid: false };
     }
    
     if (guestListOpenDateTime >= guestListCloseDateTime) {
      toast({ title: "Erro de Data", description: "A abertura da lista deve ser antes do fecho.", variant: "destructive" });
      return { isValid: false };
     }
    
      if (guestListCloseDateTime > endDateTime) {
      toast({ title: "Erro de Data", description: "A lista deve fechar antes ou ao mesmo tempo que o evento termina.", variant: "destructive" });
      return { isValid: false };
    }

    return {
      isValid: true,
      dateTimes: { startDateTime, endDateTime, guestListOpenDateTime, guestListCloseDateTime }
    };
  };

  // 🔄 FUNÇÃO AUXILIAR 6: Construir dados do evento
  const buildEventDataObject = (data: any, flyerUrl: string | null, organization: any, dateTimes: any, isEdit: boolean, editEventId?: string) => {
    const { startDateTime, endDateTime, guestListOpenDateTime, guestListCloseDateTime } = dateTimes;
    
    return {
      ...(isEdit && editEventId ? { id: editEventId } : {}),
      organization_id: organization.id,
        title: data.title,
        description: data.description,
      date: format(startDateTime, 'yyyy-MM-dd'),
      time: format(startDateTime, 'HH:mm:ss'),
      end_date: format(endDateTime, 'yyyy-MM-dd'),
      end_time: format(endDateTime, 'HH:mm:ss'),
        location: data.location,
      flyer_url: flyerUrl,
      type: 'guest-list' as const,
      is_published: data.isEventActive,
      guest_list_open_datetime: guestListOpenDateTime.toISOString(),
      guest_list_close_datetime: guestListCloseDateTime.toISOString(),
        guest_list_settings: {
        max_guests: data.maxGuests ?? 1000,
      },
    };
    };

  // 🔄 FUNÇÃO AUXILIAR 7: Salvar evento no database
  const saveEventToDatabase = async (eventData: any): Promise<string | null> => {
    console.log("Dados a serem enviados para upsert:", eventData);

    try {
      const { data: upsertResult, error: upsertError } = await supabase
        .from('events')
        .upsert(eventData, { onConflict: 'id' })
        .select('id')
        .single();
      
      if (upsertError) {
        // Log detalhado do erro para diagnóstico
        console.error("Erro detalhado no upsert do evento:", JSON.stringify(upsertError, null, 2));

        let userMessage = "Ocorreu um erro desconhecido ao salvar o evento."; // Mensagem padrão
        if (upsertError.message) {
            userMessage = `Erro ao salvar: ${upsertError.message}`;
        }
        if (upsertError.code === '23505') {
            userMessage = "Erro: Já existe um evento com detalhes semelhantes (possivelmente título e datas iguais).";
        } else if (upsertError.code === '23503') {
            userMessage = "Erro: A organização associada não foi encontrada ou houve um problema de permissão.";
        } else if (upsertError.code === '22007' || upsertError.code === '22008') {
            userMessage = "Erro: Formato inválido de data ou hora fornecido.";
        }
        toast({ title: "Erro ao Salvar Evento", description: userMessage, variant: "destructive" });
        return null;
      }
      
         const savedEventId = upsertResult?.id;
         console.log("Upsert do evento bem-sucedido. Evento ID:", savedEventId);
      return savedEventId;
      
    } catch (error: any) {
      console.error("Erro no saveEventToDatabase:", error);
      toast({ title: "Erro", description: "Erro inesperado ao salvar evento.", variant: "destructive" });
      return null;
    }
  };

  // 🔄 FUNÇÃO AUXILIAR 8: Processar materiais promocionais
  const processPromotionalMaterials = async (savedEventId: string): Promise<boolean> => {
    if (!savedEventId || promotionalFiles.length === 0) {
      return true; // Sem materiais para processar
    }

            console.log(`Iniciando upload de ${promotionalFiles.length} materiais promocionais para o evento ${savedEventId}`);
    const userId = authData.session.user.id;
            const BUCKET_NAME = 'promotional-materials-images';

            const uploadPromises = promotionalFiles.map(async (file, index) => {
                const fileName = `${uuidv4()}-${sanitizeFileName(file.name)}`;
                const filePath = `${currentOrganization.id}/${savedEventId}/${fileName}`;
                try {
                    console.log(`Uploading ${index + 1}/${promotionalFiles.length}: ${filePath} para o bucket ${BUCKET_NAME}`);
                    const { data: promoUploadData, error: promoUploadError } = await supabase.storage
                        .from(BUCKET_NAME)
                        .upload(filePath, file, { upsert: true });

                    if (promoUploadError) {
                        console.error(`Erro no upload para storage (${filePath}):`, promoUploadError);
          throw new Error(`Falha no upload de ${file.name}: ${promoUploadError.message || 'Detalhe indisponível'}`);
                    }

                    const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(promoUploadData.path);
                    const imageUrl = urlData?.publicUrl;

                    if (!imageUrl) {
                        console.error(`Não foi possível obter URL pública para ${filePath}`);
                        throw new Error(`Não foi possível obter URL pública para ${file.name}`);
                    }

                    console.log(`Inserindo registo na tabela promotional_materials para ${filePath}`);
                    const { error: insertMaterialError } = await supabase
                        .from('promotional_materials')
                        .insert({
                            event_id: savedEventId,
                            organization_id: currentOrganization.id,
                            image_url: imageUrl,
                            uploaded_by: userId,
                        });

                    if (insertMaterialError) {
                        console.error(`Erro ao inserir na DB (${filePath}):`, insertMaterialError);
                        throw new Error(`Falha ao salvar ${file.name} na base de dados: ${insertMaterialError.message}`);
                    }

                    console.log(`Material ${filePath} salvo com sucesso.`);
                    return { status: 'fulfilled', value: filePath };

                } catch (individualError: any) {
                    console.error(`Erro completo ao processar imagem ${file.name}:`, individualError);
                    return { status: 'rejected', reason: `Erro com ${file.name}: ${individualError.message || 'Erro desconhecido'}` };
                }
            });

            console.log("Aguardando conclusão dos uploads/inserts...");
            const results = await Promise.allSettled(uploadPromises);
            console.log("Resultados de Promise.allSettled:", results);

            const failedUploads = results.filter(r => r.status === 'rejected') as PromiseRejectedResult[];

            if (failedUploads.length > 0) {
                console.warn("Alguns uploads/inserts de materiais promocionais falharam:", failedUploads);
                const errorMessages = failedUploads.map(f => f.reason).join('; ');
        toast({
                    title: "Aviso: Falha no Upload de Materiais",
                    description: `Alguns materiais promocionais não puderam ser salvos: ${errorMessages}`,
                    variant: "destructive",
                    duration: 7000
                });
      return false;
            } else {
                console.log("Todos os materiais promocionais foram processados com sucesso.");
            // Limpar os ficheiros do estado após a tentativa de upload
            setPromotionalFiles([]);
            setPromotionalPreviews([]);
            form.setValue('promotionalImages', undefined);
      return true;
         }
  };

  // 🔄 FUNÇÃO AUXILIAR 9: Lidar com sucesso da submissão
  const handleSubmissionSuccess = (eventTitle: string) => {
      toast({
            title: `Evento ${isEditMode ? 'Atualizado' : 'Criado'}!`,
      description: `O evento "${eventTitle}" foi salvo com sucesso.`,
    });
    router.push('/app/organizador/eventos');
  };

  // 🔄 FUNÇÃO AUXILIAR 10: Lidar com erro da submissão
  const handleSubmissionError = (error: any) => {
    console.error("Erro inesperado durante o processamento:", error);
    let errorMessage = "Ocorreu um erro inesperado ao processar a operação.";
    if (error instanceof Error && error.message) {
      errorMessage = error.message;
    }
    toast({ title: "Erro Inesperado", description: errorMessage, variant: "destructive" });
  };

  // Render Loading State
  if (isLoading) {
  return (
          <div className="p-4 md:p-8 lg:p-10 space-y-6 animate-pulse">
             <Skeleton className="h-10 w-1/3 rounded" />
             <Card className="max-w-4xl mx-auto">
                 <CardContent className="p-6 space-y-8">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <Skeleton className="h-10 w-full rounded" />
                         <Skeleton className="h-10 w-full rounded" />
      </div>
                     <Skeleton className="h-24 w-full rounded" />
                     <div className="space-y-4 p-4 border rounded-md">
                         <Skeleton className="h-6 w-1/4 rounded mb-2" />
                         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                             <Skeleton className="h-10 w-full rounded" />
                             <Skeleton className="h-10 w-full rounded" />
                             <Skeleton className="h-10 w-full rounded" />
                             <Skeleton className="h-10 w-full rounded" />
                         </div>
                     </div>
                      <div className="space-y-4 p-4 border rounded-md">
                         <Skeleton className="h-6 w-1/4 rounded mb-2" />
                         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                             <Skeleton className="h-10 w-full rounded" />
                             <Skeleton className="h-10 w-full rounded" />
                             <Skeleton className="h-10 w-full rounded" />
                             <Skeleton className="h-10 w-full rounded" />
                         </div>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                          <Skeleton className="h-20 w-full rounded" />
                          <Skeleton className="h-32 w-full rounded" />
                          <Skeleton className="h-20 w-full rounded" />
                     </div>
                     <div className="space-y-4 p-4 border rounded-md">
                          <Skeleton className="h-6 w-1/3 rounded mb-2" />
                          <Skeleton className="h-20 w-full rounded" />
                          <div className="flex space-x-4">
                              <Skeleton className="h-24 w-24 rounded" />
                              <Skeleton className="h-24 w-24 rounded" />
                              <Skeleton className="h-24 w-24 rounded" />
                          </div>
                      </div>
                 </CardContent>
                  <CardFooter className="border-t p-6 flex justify-end">
                      <Skeleton className="h-10 w-24 rounded" />
                  </CardFooter>
             </Card>
          </div>
      )
  }

  return (
    <div className="p-4 md:p-8 lg:p-10">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">
        {isEditMode ? 'Editar Evento (Guest List)' : 'Criar Novo Evento (Guest List)'}
      </h1>
       {!currentOrganization && !isLoading && (
           <Card className="max-w-4xl mx-auto text-center p-6">
               <p className="text-destructive">Organização não encontrada. Por favor, selecione uma organização válida.</p>
            </Card>
       )}
      {currentOrganization && (
          <Card className="max-w-4xl mx-auto">
        <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitGuestList)}>
                <CardContent className="p-6 space-y-8">

                  {/* --- Detalhes Básicos --- */}
                   <div className="space-y-4">
                    <h3 className="text-lg font-medium border-b pb-2">Detalhes do Evento</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                            <FormLabel>Nome do Evento *</FormLabel>
                    <FormControl>
                              <Input placeholder="Ex: Festa de Lançamento" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
                      <FormField
                        control={form.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Localização *</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: Clube XPTO, Lisboa" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                          <FormLabel>Descrição Detalhada *</FormLabel>
                    <FormControl>
                      <Textarea
                              placeholder="Descreva o evento, tipo de música, dress code, etc."
                              className="resize-y min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
                   </div>

                  {/* --- Datas e Horas do Evento --- */}
                  <div className="space-y-4 p-4 border rounded-md">
                    <h3 className="text-lg font-medium border-b pb-2">Período do Evento *</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                      {/* Start Date */}
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                            <FormLabel>Data Início</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                      'w-full justify-start text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                                    <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                              {field.value ? (
                                      format(field.value, 'dd/MM/yyyy')
                              ) : (
                                      <span>Escolha data</span>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                                  disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                      {/* Start Time */}
                      <FormField
                        control={form.control}
                        name="startTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Hora Início</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input type="time" step="600" className="pl-10" {...field} /> {/* step 10 min */} 
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {/* End Date */}
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                            <FormLabel>Data Fim</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                       'w-full justify-start text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                                    <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                              {field.value ? (
                                      format(field.value, 'dd/MM/yyyy')
                              ) : (
                                      <span>Escolha data</span>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                                    date < (form.getValues("startDate") || new Date(new Date().setHours(0,0,0,0)))
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                      {/* End Time */}
              <FormField
                control={form.control}
                        name="endTime"
                render={({ field }) => (
                  <FormItem>
                            <FormLabel>Hora Fim</FormLabel>
                    <FormControl>
                              <div className="relative">
                                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input type="time" step="600" className="pl-10" {...field} /> {/* step 10 min */} 
                              </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
                    </div>
            </div>

                  {/* --- Datas e Horas da Guest List --- */}
                   <div className="space-y-4 p-4 border rounded-md">
                     <h3 className="text-lg font-medium border-b pb-2">Período da Guest List *</h3>
                     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                       {/* Guest List Open Date */}
              <FormField
                control={form.control}
                name="guestListOpenDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                            <FormLabel>Abertura Data</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                                       'w-full justify-start text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                                    <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                            {field.value ? (
                                      format(field.value, 'dd/MM/yyyy')
                            ) : (
                                      <span>Escolha data</span>
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
                      {/* Guest List Open Time */}
                      <FormField
                        control={form.control}
                        name="guestListOpenTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Abertura Hora</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input type="time" step="600" className="pl-10" {...field} /> {/* step 10 min */} 
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {/* Guest List Close Date */}
              <FormField
                control={form.control}
                name="guestListCloseDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                            <FormLabel>Fecho Data</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                                       'w-full justify-start text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                                    <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                            {field.value ? (
                                      format(field.value, 'dd/MM/yyyy')
                            ) : (
                                      <span>Escolha data</span>
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => 
                                    date < (form.getValues("guestListOpenDate") || new Date(new Date().setHours(0,0,0,0)))
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
                      {/* Guest List Close Time */}
                      <FormField
                        control={form.control}
                        name="guestListCloseTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fecho Hora</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input type="time" step="600" className="pl-10" {...field} /> {/* step 10 min */} 
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormDescription>
                        Define quando os convidados podem entrar na lista. A lista fecha automaticamente.
                    </FormDescription>
            </div>

                  {/* --- Outras Configurações --- */}
            <div className="space-y-4">
                     <h3 className="text-lg font-medium border-b pb-2">Configurações Adicionais</h3>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start pt-2">
                      <FormField
                        control={form.control}
                        name="maxGuests"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Limite de Convidados</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                placeholder="Ex: 500"
                                {...field}
                                // onChange já converte para número devido ao preprocess
                                onChange={event => field.onChange(event.target.value === '' ? undefined : +event.target.value)} // Lidar com string vazia
                              />
                            </FormControl>
                            <FormDescription>
                              Nº máximo de nomes na lista (padrão 1000).
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="flyer"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Flyer do Evento *</FormLabel>
                            <FormControl>
                              <Input
                                id="flyer-input"
                      type="file"
                      accept="image/*"
                                className="sr-only"
                                ref={field.ref}
                                name={field.name}
                                onBlur={field.onBlur}
                                onChange={(e) => {
                                    field.onChange(e.target.files);
                                    handleFileChange(e);
                                }}
                              />
                            </FormControl>
                            <label
                              htmlFor="flyer-input"
                              className={cn(
                                "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                                "border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2",
                                "cursor-pointer w-full"
                              )}
                            >
                               <Upload className="mr-2 h-4 w-4" />
                               {flyerPreview ? 'Alterar Flyer' : 'Escolher Flyer'}
                            </label>
                {flyerPreview && (
                              <div className="mt-4">
                                <p className="text-sm font-medium mb-2">Pré-visualização:</p>
                                <img src={flyerPreview} alt="Pré-visualização do Flyer" className="max-w-xs max-h-48 object-cover rounded-md border" />
                  </div>
                )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />

            <FormField
              control={form.control}
                        name="isEventActive" // Nome atualizado no schema
              render={({ field }) => (
                          <FormItem className="flex flex-col items-start space-y-3 rounded-md border p-4 h-full justify-center"> {/* Layout ajustado */}
                            <div className="flex flex-row items-center justify-between w-full">
                              <FormLabel className="text-base mb-0">Estado do Evento</FormLabel> {/* Rótulo Atualizado */}
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                                  aria-label="Estado do evento"
                    />
                  </FormControl>
                            </div>
                            <FormDescription> {/* Descrição Atualizada */}
                              {field.value
                               ? "Ativo: Evento visível e funcional."
                               : "Inativo: Evento oculto (rascunho)."}
                            </FormDescription>
                            <FormMessage />
                </FormItem>
              )}
            />
                    </div>
                   </div>

                   {/* --- NOVA SECÇÃO: Material Publicitário (Com correção do FormControl) --- */}
                   <div className="space-y-4 p-4 border rounded-md">
                     <h3 className="text-lg font-medium border-b pb-2">Material Publicitário (p/ Promotores)</h3>
                     <FormField
                       control={form.control}
                       name="promotionalImages"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>Carregar Imagens (Max: {MAX_PROMO_IMAGES})</FormLabel>
                           {/* Label/Botão fora do FormControl */}
                            <label
                               htmlFor="promotional-images-input"
                               className={cn(
                                 "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                                 "border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2",
                                 "cursor-pointer",
                                 promotionalFiles.length >= MAX_PROMO_IMAGES && "opacity-50 cursor-not-allowed"
                               )}
                             >
                                 <Upload className="mr-2 h-4 w-4" />
                                 Escolher Ficheiros
                             </label>
                           {/* FormControl contém APENAS o input escondido */}
                           <FormControl>
                             <Input
                               id="promotional-images-input"
                               type="file"
                               accept="image/*"
                               multiple
                               onChange={handlePromotionalFilesChange}
                               className="sr-only"
                               disabled={promotionalFiles.length >= MAX_PROMO_IMAGES}
                               ref={field.ref}
                             />
                           </FormControl> { /* <<< Fechar FormControl aqui */}
                            {/* Opcional: Mostrar contagem/nomes */}
                            {promotionalFiles.length > 0 && (
                                <div className="text-sm text-muted-foreground mt-2">
                                    {promotionalFiles.length} {promotionalFiles.length === 1 ? 'imagem selecionada' : 'imagens selecionadas'}.
                                </div>
                            )}
                           <FormDescription>
                             Carregue até {MAX_PROMO_IMAGES} imagens (max {MAX_FILE_SIZE_MB}MB cada) para os promotores usarem.
                              {isEditMode && existingPromoImageUrls.length > 0 && (
                                  ` ${existingPromoImageUrls.length} imagens existentes serão mantidas a menos que substituídas.`
                              )}
                           </FormDescription>
                           <FormMessage />
                         </FormItem>
                       )}
                     />

                     {/* Pré-visualização das imagens selecionadas + existentes */}                     
                      {(promotionalPreviews.length > 0 || existingPromoImageUrls.length > 0) && (
                          <div className="mt-4 space-y-2">
                              <p className="text-sm font-medium">Imagens Carregadas:</p>
                              <div className="flex flex-wrap gap-4">
                                  {/* Mostrar imagens existentes primeiro (se editando) */}
                                  {isEditMode && existingPromoImageUrls.map((url, index) => (
                                      <div key={`existing-${index}`} className="relative group w-24 h-24 border rounded-md overflow-hidden bg-muted">
                                          <img
                                              src={url}
                                              alt={`Material existente ${index + 1}`}
                                              className="w-full h-full object-cover"
                                              onError={(e) => { e.currentTarget.src = '/placeholder-image.png'; }} // Fallback
                                          />
                                          {/* Adicionar botão de remover para existentes no futuro? */}
                                          {/* Para já, apenas indica que é existente */}
                                           <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 px-1 py-0.5">
                                              <span className="text-white text-xs font-semibold truncate">Existente</span>
                                          </div>
                                      </div>
                                  ))}
                                  {/* Mostrar previews das novas imagens selecionadas */}
                                  {promotionalPreviews.map((previewUrl, index) => (
                                      <div key={`new-${index}`} className="relative group w-24 h-24 border rounded-md overflow-hidden">
                                          <img src={previewUrl} alt={`Nova imagem ${index + 1}`} className="w-full h-full object-cover" />
              <Button 
                                              variant="destructive"
                                              size="icon"
                                              type="button" // Impedir submit do form
                                              className="absolute top-1 right-1 h-6 w-6 p-0 opacity-70 group-hover:opacity-100 transition-opacity z-10"
                                              onClick={() => removePromotionalImage(index)}
                                              title="Remover imagem"
                                          >
                                              <XIcon className="h-4 w-4" />
              </Button>
            </div>
                                  ))}
                              </div>
                          </div>
                      )}
                   </div>

                </CardContent>
                <CardFooter className="border-t p-6">
                  <Button type="submit" disabled={isSubmitting || isLoading} className="ml-auto">
                    {isSubmitting ? 'Salvando...' : (isEditMode ? 'Salvar Alterações' : 'Criar Evento')}
                  </Button>
                </CardFooter>
          </form>
        </Form>
      </Card>
       )} {/* Fim da verificação currentOrganization */} 
    </div>
  )
} 