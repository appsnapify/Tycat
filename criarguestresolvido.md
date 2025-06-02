# 🚀 PLANO COMPLETO: Seleção de Equipas na Criação de Eventos

## 📋 ANÁLISE TÉCNICA COMPLETA

### 🔍 SITUAÇÃO ATUAL
- **Localização:** `app/app/organizador/evento/criar/guest-list/page.tsx`
- **Problema:** Todas as equipas da organização acedem automaticamente a todos os eventos via `organization_teams`
- **Estrutura Existente:** Tabela `event_promoters` já existe e funciona
- **Verificação de Acesso:** `app/promo/actions.ts` - função `processPromoParams`

### 🎯 OBJETIVO
- **Durante criação do evento:** Organizador seleciona equipas específicas
- **Por defeito:** Todas equipas marcadas ✅
- **Flexibilidade:** Pode desmarcar as que não quer
- **Resultado:** Só equipas selecionadas podem promover o evento

## 🛠️ PLANO DE IMPLEMENTAÇÃO

### FASE 1: Interface de Seleção de Equipas
**Ficheiro:** `app/app/organizador/evento/criar/guest-list/page.tsx`
**Risco:** 🟢 BAIXO

#### 1.1 Adicionar Estado
```typescript
// Adicionar após outros estados existentes
const [selectedTeams, setSelectedTeams] = useState<string[]>([]) // IDs das equipas selecionadas
const [availableTeams, setAvailableTeams] = useState<Team[]>([]) // Equipas disponíveis
const [loadingTeams, setLoadingTeams] = useState(false)

// Tipo para Team
interface Team {
  id: string
  name: string
  team_code: string
  organization_id: string
}
```

#### 1.2 Adicionar ao Schema de Validação
```typescript
// Modificar o schema existente
const guestListFormSchema = z.object({
  // ... campos existentes ...
  selectedTeams: z.array(z.string()).min(1, {
    message: "Deve selecionar pelo menos uma equipa",
  }),
})
```

#### 1.3 Carregar Equipas da Organização
```typescript
// Nova função para carregar equipas
const loadOrganizationTeams = async () => {
  if (!currentOrganization?.id) return
  
  setLoadingTeams(true)
  try {
    const { data: teams, error } = await supabase
      .from('teams')
      .select(`
        id,
        name,
        team_code,
        organization_id
      `)
      .eq('organization_id', currentOrganization.id)
      .order('name')
    
    if (error) throw error
    
    setAvailableTeams(teams || [])
    
    // Selecionar todas por defeito
    const allTeamIds = teams?.map(team => team.id) || []
    setSelectedTeams(allTeamIds)
    form.setValue('selectedTeams', allTeamIds)
    
  } catch (error) {
    console.error('Erro ao carregar equipas:', error)
    toast({
      title: "Erro",
      description: "Não foi possível carregar as equipas da organização",
      variant: "destructive"
    })
  } finally {
    setLoadingTeams(false)
  }
}

// Adicionar ao useEffect existente
useEffect(() => {
  if (currentOrganization?.id) {
    loadOrganizationTeams()
  }
}, [currentOrganization?.id])
```

#### 1.4 Nova Seção no Formulário
```tsx
{/* Nova seção após "Configurações Adicionais" */}
<div className="space-y-4">
  <h3 className="text-lg font-medium border-b pb-2">Equipas Autorizadas</h3>
  <FormField
    control={form.control}
    name="selectedTeams"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Equipas que podem promover este evento</FormLabel>
        <FormDescription>
          Selecione as equipas que terão acesso para promover este evento. 
          Por defeito, todas as equipas estão selecionadas.
        </FormDescription>
        
        {loadingTeams ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : availableTeams.length > 0 ? (
          <div className="space-y-3 max-h-48 overflow-y-auto border rounded-md p-3">
            {/* Botão para selecionar/deselecionar todas */}
            <div className="flex items-center space-x-2 pb-2 border-b">
              <Checkbox
                id="select-all-teams"
                checked={selectedTeams.length === availableTeams.length}
                onCheckedChange={(checked) => {
                  if (checked) {
                    const allIds = availableTeams.map(team => team.id)
                    setSelectedTeams(allIds)
                    field.onChange(allIds)
                  } else {
                    setSelectedTeams([])
                    field.onChange([])
                  }
                }}
              />
              <Label 
                htmlFor="select-all-teams" 
                className="text-sm font-medium cursor-pointer"
              >
                Selecionar todas ({availableTeams.length})
              </Label>
            </div>
            
            {/* Lista de equipas */}
            {availableTeams.map((team) => (
              <div key={team.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`team-${team.id}`}
                  checked={selectedTeams.includes(team.id)}
                  onCheckedChange={(checked) => {
                    let newSelected: string[]
                    if (checked) {
                      newSelected = [...selectedTeams, team.id]
                    } else {
                      newSelected = selectedTeams.filter(id => id !== team.id)
                    }
                    setSelectedTeams(newSelected)
                    field.onChange(newSelected)
                  }}
                />
                <Label 
                  htmlFor={`team-${team.id}`} 
                  className="text-sm cursor-pointer flex-1"
                >
                  {team.name}
                  <span className="text-muted-foreground ml-2">({team.team_code})</span>
                </Label>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>Nenhuma equipa encontrada nesta organização.</p>
            <p className="text-sm mt-1">
              Crie equipas primeiro para poder selecioná-las.
            </p>
          </div>
        )}
        
        <FormMessage />
      </FormItem>
    )}
  />
</div>
```

### FASE 2: Lógica de Salvamento
**Ficheiro:** `app/app/organizador/evento/criar/guest-list/page.tsx`
**Risco:** 🟡 MÉDIO

#### 2.1 Modificar Função onSubmitGuestList
```typescript
// Adicionar após a criação/update do evento, antes do sucesso
if (eventResult?.id) {
  console.log("Criando associações de equipas para o evento:", eventResult.id)
  
  // Criar associações para as equipas selecionadas
  await createEventTeamAssociations(eventResult.id, data.selectedTeams)
}
```

#### 2.2 Nova Função para Criar Associações
```typescript
const createEventTeamAssociations = async (eventId: string, teamIds: string[]) => {
  try {
    console.log("Criando associações para equipas:", teamIds)
    
    // Buscar todos os promotores das equipas selecionadas
    const { data: teamMembers, error: membersError } = await supabase
      .from('team_members')
      .select(`
        user_id,
        team_id,
        role,
        teams!inner(name, team_code)
      `)
      .in('team_id', teamIds)
    
    if (membersError) {
      console.error('Erro ao buscar membros das equipas:', membersError)
      throw new Error('Erro ao buscar membros das equipas')
    }
    
    // Criar associações na tabela event_promoters
    const associations = teamMembers?.map(member => ({
      event_id: eventId,
      promoter_id: member.user_id,
      team_id: member.team_id,
      promoter_code: `${member.teams.team_code}-${member.user_id.slice(0, 8)}`,
      commission_percentage: 5.0, // Valor padrão ou buscar da configuração
      created_at: new Date().toISOString()
    })) || []
    
    if (associations.length > 0) {
      const { error: insertError } = await supabase
        .from('event_promoters')
        .insert(associations)
      
      if (insertError) {
        console.error('Erro ao criar associações:', insertError)
        throw new Error('Erro ao criar associações de equipas')
      }
      
      console.log(`Criadas ${associations.length} associações com sucesso`)
    } else {
      console.warn('Nenhuma associação criada - equipas sem membros?')
    }
    
  } catch (error) {
    console.error('Erro ao criar associações de equipas:', error)
    toast({
      title: "Aviso",
      description: "Evento criado, mas houve um problema ao configurar as equipas. Pode configurar depois.",
      variant: "destructive"
    })
  }
}
```

### FASE 3: Atualizar Verificação de Acesso
**Ficheiro:** `app/promo/actions.ts`
**Risco:** 🔴 ALTO

#### 3.1 Remover/Modificar Fallback via Organização
```typescript
// Na função processPromoParams, REMOVER esta secção:
/*
// 3. Verificar se a equipa está vinculada à organização do evento
if (!eventData.organization_id) {
  console.log('[DEBUG] Evento não tem organization_id definido')
} else {
  const { data: orgAssociation, error: orgError } = await supabase
    .from('organization_teams')
    .select('organization_id')
    .eq('team_id', teamId)
    .eq('organization_id', eventData.organization_id)
    .maybeSingle();

  if (orgError) {
    console.error('[ERROR] Erro ao verificar associação equipa-organização:', orgError);
  }

  if (orgAssociation) {
    hasAssociation = true;
    console.log('[DEBUG] Associação via organização encontrada');
  } else {
    console.log('[DEBUG] Equipa não está vinculada à organização do evento');
  }
}
*/

// MANTER APENAS:
// 1. Verificação de associação direta na tabela event_promoters
// 2. Verificação se promotor é membro da equipa
// 3. Verificação se a equipa está associada ao evento via event_promoters
```

### FASE 4: Interface de Gestão (Futura)
**Ficheiro:** `/app/organizador/eventos/[id]/equipas` (NOVO)
**Risco:** 🟢 BAIXO

#### 4.1 Página para Editar Associações
- Permite adicionar/remover equipas após criação
- Lista equipas atuais vs disponíveis
- Interface similar à de criação

## 🎯 BENEFÍCIOS DA SOLUÇÃO

### ✅ Vantagens
- **Controle Granular:** Organizador escolhe por evento
- **UX Intuitiva:** Durante criação, tudo num sítio
- **Flexível:** Pode selecionar todas ou algumas
- **Escalável:** Funciona com muitas equipas
- **Seguro:** Apenas equipas explicitamente autorizadas

### 📊 IMPACTO NO SISTEMA

#### ✅ Compatibilidade Mantida
- URLs de promo existentes continuam a funcionar
- Equipas já associadas via `event_promoters` mantêm acesso
- Sistema atual de verificação mantido (apenas remove fallback)

#### ⚠️ Migração Necessária
- **Eventos existentes:** Associar todas as equipas da organização
- **Script de migração:** Popular `event_promoters` para eventos antigos

```sql
-- Script de migração para eventos existentes
INSERT INTO event_promoters (event_id, promoter_id, team_id, promoter_code, commission_percentage)
SELECT DISTINCT
  e.id as event_id,
  tm.user_id as promoter_id,
  tm.team_id,
  CONCAT(t.team_code, '-', LEFT(tm.user_id::text, 8)) as promoter_code,
  5.0 as commission_percentage
FROM events e
INNER JOIN organization_teams ot ON ot.organization_id = e.organization_id
INNER JOIN team_members tm ON tm.team_id = ot.team_id
INNER JOIN teams t ON t.id = tm.team_id
WHERE e.type = 'guest-list'
  AND e.organization_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM event_promoters ep 
    WHERE ep.event_id = e.id 
    AND ep.promoter_id = tm.user_id 
    AND ep.team_id = tm.team_id
  );
```

## 🚦 PRÓXIMOS PASSOS

### 1. **Implementação por Fases**
1. ✅ Fase 1: Interface (Baixo risco)
2. ⚠️ Fase 2: Lógica de salvamento (Médio risco)
3. 🔴 Fase 3: Atualização verificação (Alto risco)
4. 🟢 Fase 4: Interface de gestão (Baixo risco)

### 2. **Testes Necessários**
- ✅ Criação de evento com equipas selecionadas
- ✅ Verificação de acesso via URLs de promo
- ✅ Migração de dados existentes
- ✅ Compatibilidade com sistema atual

### 3. **Considerações de Segurança**
- 🔒 Verificar políticas RLS em `event_promoters`
- 🔒 Validar permissões do organizador
- 🔒 Testar com diferentes cenários de acesso
- 🔒 Backup antes da migração

## 📝 NOTAS IMPORTANTES

### ⚠️ ALERTAS
1. **Não implementar Fase 3 sem backup completo**
2. **Testar migração em ambiente de desenvolvimento primeiro**
3. **Comunicar mudanças aos utilizadores existentes**
4. **Manter logs detalhados durante a implementação**

### 🎯 CRITÉRIOS DE SUCESSO
- [ ] Organizador consegue selecionar equipas específicas
- [ ] URLs de promo existentes continuam funcionais
- [ ] Apenas equipas selecionadas acedem aos eventos
- [ ] Migração de dados existentes bem-sucedida
- [ ] Performance mantida ou melhorada

---

**📅 Criado:** Janeiro 2025  
**👤 Responsável:** Desenvolvimento Snap  
**🎯 Objetivo:** Controle granular de acesso de equipas por evento  
**⏱️ Estimativa:** 2-3 dias de implementação + 1 dia de testes 