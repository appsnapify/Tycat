"use server"; // MARCA TODO O FICHEIRO COMO SERVER-SIDE

import { createClient } from '@supabase/supabase-js' 
import { createClient as createServerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

// Função exportada para ser usada em Client Components
export async function associateTeamAction(formData: FormData): Promise<{ success: boolean; message: string; teamName?: string }> {
    
    // CORREÇÃO: Usar cliente moderno com await
    const supabaseUserClient = await createServerClient()

    // 1. CORREÇÃO DE SEGURANÇA: Usar getUser() em vez de getSession()
    const { data: { user }, error: userError } = await supabaseUserClient.auth.getUser();
    if (userError || !user) {
        console.error("Server Action: Erro de autenticação", userError);
        return { success: false, message: "Erro de autenticação. Por favor, faça login novamente." };
    }
    const userId = user.id;
    const teamCode = formData.get('teamCode') as string;
    const organizationId = formData.get('organizationId') as string;

    if (!teamCode || !organizationId) {
         return { success: false, message: "Código da equipa ou ID da organização em falta." };
    }

    // NOVA VALIDAÇÃO: Verificar formato do código da equipe
    const teamCodePattern = /^TEAM-[A-Z0-9]{5}$/;
    if (!teamCodePattern.test(teamCode.trim())) {
        return { 
            success: false, 
            message: "Formato do código inválido. O código deve ter o formato TEAM-XXXXX (ex: TEAM-A1B2C)." 
        };
    }

    console.log(`Server Action: Associando ${teamCode} a ${organizationId} por ${userId}`);

    // 2. Criar Cliente Admin (APENAS PARA LEITURA/VALIDAÇÃO)
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!, 
        process.env.SUPABASE_SERVICE_ROLE_KEY! // Chave de Serviço!
    );

    try {
        // 3. Validate Team and get Creator ID (Admin Client)
        const { data: teamData, error: findError } = await supabaseAdmin
            .from('teams')
            .select('id, name, organization_id, created_by')
            .eq('team_code', teamCode.trim())
            .maybeSingle();

        if (findError) {
            console.error("Server Action: Erro ao buscar equipa (Admin):", findError);
            return { 
                success: false, 
                message: "Erro interno ao verificar código da equipa. Tente novamente em alguns instantes." 
            };
        }

        if (!teamData) {
            return { 
                success: false, 
                message: `Código "${teamCode}" não encontrado. Verifique se o código está correto e se a equipa existe.` 
            };
        }

        if (!teamData.created_by) {
             console.error("Server Action: Erro - Equipa encontrada mas sem created_by ID:", teamData.id);
             return { 
                success: false, 
                message: "Erro nos dados da equipa. Contacte o suporte técnico." 
            };
        }

        if (teamData.organization_id !== null) {
            if (teamData.organization_id === organizationId) {
                return { 
                    success: false, 
                    message: `A equipa "${teamData.name}" já está associada a esta organização.` 
                };
            } else {
                return { 
                    success: false, 
                    message: `A equipa "${teamData.name}" já pertence a outra organização e não pode ser transferida.` 
                };
            }
        }

        const teamIdToAssociate = teamData.id;
        const teamNameToAssociate = teamData.name;
        const teamCreatorId = teamData.created_by;

        // 4. Perform Update with Admin Client (Bypass RLS for this step)
        console.log(`Server Action: Tentando UPDATE teams ID ${teamIdToAssociate} com organization_id ${organizationId} (Admin Client)`);
        const { error: updateError } = await supabaseAdmin
            .from('teams')
            .update({ organization_id: organizationId })
            .eq('id', teamIdToAssociate);

        if (updateError) {
            console.error("Server Action: FALHA CRÍTICA ao associar equipa (Admin Client):", updateError);
            return { 
                success: false, 
                message: "Erro crítico ao associar equipa. Contacte o suporte técnico." 
            };
        }
        console.log(`Server Action: UPDATE em teams bem-sucedido.`);

        // 5. Insert into organization_teams (Admin Client)
        const { error: orgTeamInsertError } = await supabaseAdmin
            .from('organization_teams')
            .insert({
                organization_id: organizationId,
                team_id: teamIdToAssociate
                // commission_type is no longer needed/present
             });

        if (orgTeamInsertError) {
            if (orgTeamInsertError.code === '23505') {
                 console.warn(`Server Action: Ligação equipa-org já existe para ${teamIdToAssociate}-${organizationId}.`);
            } else {
                 console.error("Server Action: Erro ao inserir em organization_teams (Admin):", orgTeamInsertError);
                 return { 
                    success: false, 
                    message: "Erro ao registar a ligação da equipa à organização. Contacte o suporte." 
                };
            }
        } else {
             console.log(`Server Action: Inserção em organization_teams bem-sucedida.`);
        }

        // 6. Insert into user_organizations (Admin Client)
        const { error: orgMemberInsertError } = await supabaseAdmin
             .from('user_organizations')
             .insert({ organization_id: organizationId, user_id: teamCreatorId, role: 'member' });

        if (orgMemberInsertError) {
            if (orgMemberInsertError.code === '23505') {
                 console.warn(`Server Action: Criador da equipa (${teamCreatorId}) já é membro da organização (${organizationId}).`);
            } else {
                 console.error("Server Action: Erro ao inserir em user_organizations (Admin):", orgMemberInsertError);
                 return { 
                    success: false, 
                    message: "Erro ao adicionar o chefe de equipa como membro da organização." 
                };
            }
        } else {
             console.log(`Server Action: Inserção em user_organizations bem-sucedida.`);
        }

        console.log(`Server Action: Processo completo para ${teamIdToAssociate}.`);
        return { 
            success: true, 
            message: `Equipa "${teamNameToAssociate}" associada com sucesso à sua organização!`, 
            teamName: teamNameToAssociate || 'Equipa' 
        };

    } catch (error) {
        console.error("Server Action: Erro inesperado:", error);
        return { 
            success: false, 
            message: "Ocorreu um erro inesperado. Tente novamente ou contacte o suporte." 
        };
    }
}

// Poderia adicionar outras actions do organizador aqui no futuro 