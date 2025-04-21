"use server"; // MARCA TODO O FICHEIRO COMO SERVER-SIDE

import { createClient } from '@supabase/supabase-js' 
import { createServerActionClient } from '@supabase/auth-helpers-nextjs' 
import { cookies } from 'next/headers'

// Função exportada para ser usada em Client Components
export async function associateTeamAction(formData: FormData): Promise<{ success: boolean; message: string; teamName?: string }> {
    
    const cookieStore = cookies()
    const supabaseUserClient = createServerActionClient({ cookies: () => cookieStore }) // Cliente agindo como o user logado

    // 1. Obter dados da sessão e do formulário
    const { data: { session }, error: sessionError } = await supabaseUserClient.auth.getSession();
    if (sessionError || !session?.user) {
        console.error("Server Action: Erro de sessão", sessionError);
        return { success: false, message: "Erro de autenticação." };
    }
    const userId = session.user.id;
    const teamCode = formData.get('teamCode') as string;
    const organizationId = formData.get('organizationId') as string;

    if (!teamCode || !organizationId) {
         return { success: false, message: "Código da equipa ou ID da organização em falta." };
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
            return { success: false, message: "Erro ao verificar código da equipa." };
        }

        if (!teamData) {
            return { success: false, message: "Código da equipa inválido ou equipa não encontrada." };
        }

        if (!teamData.created_by) {
             console.error("Server Action: Erro - Equipa encontrada mas sem created_by ID:", teamData.id);
             return { success: false, message: "Erro interno ao processar dados da equipa." };
        }

        if (teamData.organization_id !== null) {
            if (teamData.organization_id === organizationId) {
                console.warn(`Server Action: Equipa ${teamData.name} já está associada a esta organização (${organizationId}). Garantindo outras ligações...`)
            } else {
                return { success: false, message: `A equipa \"${teamData.name}\" já pertence a outra organização.` };
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
            return { success: false, message: "Erro crítico ao atualizar dados da equipa." };
        }
        console.log("Server Action: UPDATE em teams bem-sucedido.");

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
                 return { success: false, message: "Erro ao registar a ligação da equipa à organização." };
            }
        } else {
             console.log("Server Action: Inserção em organization_teams bem-sucedida.");
        }

        // 6. Insert into organization_members (Admin Client)
        const { error: orgMemberInsertError } = await supabaseAdmin
             .from('organization_members')
             .insert({ organization_id: organizationId, user_id: teamCreatorId, role: 'membro' });

        if (orgMemberInsertError) {
            if (orgMemberInsertError.code === '23505') {
                 console.warn(`Server Action: Criador da equipa (${teamCreatorId}) já é membro da organização (${organizationId}).`);
            } else {
                 console.error("Server Action: Erro ao inserir em organization_members (Admin):", orgMemberInsertError);
                 return { success: false, message: "Erro ao adicionar o chefe de equipa como membro da organização." };
            }
        } else {
             console.log("Server Action: Inserção em organization_members bem-sucedida.");
        }

        console.log(`Server Action: Processo completo para ${teamIdToAssociate}.`);
        return { success: true, message: "Equipa associada com sucesso!", teamName: teamNameToAssociate || 'Equipa' };

    } catch (error) {
        console.error("Server Action: Erro inesperado:", error);
        return { success: false, message: "Ocorreu um erro inesperado." };
    }
}

// Poderia adicionar outras actions do organizador aqui no futuro 