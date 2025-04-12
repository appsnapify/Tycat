'use client' // ESSENCIAL: Marcar como Client Component

import { useState, useEffect } from 'react';
// import { supabase } from '@/lib/supabase'; // Não é mais necessário buscar aqui
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton'; // Manter para estado de saving
import { toast } from "@/components/ui/use-toast";
import { CalendarIcon, MapPinIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase'; // Importar para salvar

// Interface para os dados do evento recebidos como props
interface EventData {
    id: string;
    title: string;
    description?: string;
    flyer_url?: string;
    date: string;
    time?: string;
    end_date?: string;
    end_time?: string;
    location?: string;
    guest_list_open_datetime?: string;
    guest_list_close_datetime?: string;
    organization_id: string; // Precisamos do ID da organização aqui
    type?: string; // Para saber se mostramos coisas específicas de guest list
    // Adicionar outros campos que foram selecionados no fetchEvent
}

// Interface para equipas
interface Team {
    id: string;
    name: string;
}

interface EventDetailsClientProps {
    event: EventData; 
    teams: Team[]; // Receber a lista de equipas da organização
    initialAssociatedIds: Set<string>; // Receber os IDs já associados
}

export default function EventDetailsClient({ event, teams, initialAssociatedIds }: EventDetailsClientProps) {
    // Estado apenas para a seleção atual na UI e para o estado de salvar
    const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(initialAssociatedIds);
    const [savingAssociations, setSavingAssociations] = useState(false);
    // Não precisamos mais de allTeams, teamsLoading, teamsError, associatedTeamIds (usamos initialAssociatedIds das props)

    const eventId = event.id; 

    // Remover useEffect de busca

    const handleTeamSelectionChange = (teamId: string, checked: boolean | string) => {
        setSelectedTeamIds(prev => {
            const newSelection = new Set(prev);
            if (checked) {
                newSelection.add(teamId);
            } else {
                newSelection.delete(teamId);
            }
            return newSelection;
        });
    };

    const handleSaveAssociations = async () => {
        if (!eventId) {
            toast({ title: "Erro", description: "ID do evento inválido.", variant: "destructive" });
            return;
        }

        setSavingAssociations(true);

        try {
            const currentSelected = selectedTeamIds;
            // Usar initialAssociatedIds (das props) como referência do estado original
            const initiallyAssociated = initialAssociatedIds; 

            const idsToAdd = [...currentSelected].filter(id => !initiallyAssociated.has(id));
            const idsToRemove = [...initiallyAssociated].filter(id => !currentSelected.has(id));

            // Chamadas delete/insert como antes...
             if (idsToRemove.length > 0) {
                const { error: deleteError } = await supabase
                    .from('event_teams')
                    .delete()
                    .eq('event_id', eventId)
                    .in('team_id', idsToRemove);

                if (deleteError) {
                    console.error("Erro ao remover associações:", deleteError);
                    if (deleteError.code === '42P01') { throw new Error("Tabela 'event_teams' não encontrada."); }
                    throw new Error("Falha ao remover associações antigas.");
                }
            }
            if (idsToAdd.length > 0) {
                const newAssociations = idsToAdd.map(team_id => ({ event_id: eventId, team_id }));
                const { error: insertError } = await supabase
                    .from('event_teams')
                    .insert(newAssociations);

                if (insertError) {
                    console.error("Erro ao adicionar associações:", insertError);
                    if (insertError.code === '42P01') { throw new Error("Tabela 'event_teams' não encontrada."); }
                    throw new Error("Falha ao adicionar novas associações.");
                }
            }

            // IMPORTANTE: Não atualizar o estado `initialAssociatedIds` aqui, pois ele vem das props.
            // A atualização visual já acontece através do `selectedTeamIds`.
            // A próxima vez que a página carregar, as props virão atualizadas do servidor.
            // setAssociatedTeamIds(new Set(currentSelected)); // Remover esta linha

            toast({ title: "Sucesso!", description: "Associações de equipas atualizadas." });

        } catch (err) {
            console.error("Erro ao salvar associações:", err);
            toast({ title: "Erro ao Salvar", description: err instanceof Error ? err.message : "Não foi possível salvar.", variant: "destructive" });
        } finally {
            setSavingAssociations(false);
        }
    };

    // Função de formatação movida para cá ou para utils
    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString) return '-';
        try {
            // Tenta criar a data, pode precisar de ajustes dependendo do formato em Supabase
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'Data inválida'; // Verifica se a data é válida
            return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' }); // Especificar UTC se as datas são armazenadas assim
        } catch (e) {
            console.error("Erro ao formatar data:", e);
            return 'Erro data';
        }
    };


    // --- Renderização do Componente Cliente ---
    return (
        <>
            {/* Detalhes do Evento (renderizados com dados das props) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>{event.title}</CardTitle>
                        <CardDescription>{event.type === 'guest-list' ? 'Guest List' : 'Evento Padrão'}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <h3 className="font-semibold text-sm text-gray-500">Descrição</h3>
                            <p>{event.description || 'Sem descrição'}</p>
                        </div>
                        <div className="flex items-center">
                            <CalendarIcon className="w-4 h-4 mr-2 text-gray-500" />
                            <span>{formatDate(event.date)} {event.time || ''}</span>
                        </div>
                         {/* Adicionar data de fim se existir */}
                        {event.end_date && (
                             <div className="flex items-center">
                                <CalendarIcon className="w-4 h-4 mr-2 text-gray-500" />
                                <span>Fim: {formatDate(event.end_date)} {event.end_time || ''}</span>
                            </div>
                        )}
                        {event.location && (
                            <div className="flex items-center">
                                <MapPinIcon className="w-4 h-4 mr-2 text-gray-500" />
                                <span>{event.location}</span>
                            </div>
                        )}
                         {/* Datas da Guest List */}
                         {event.guest_list_open_datetime && (
                              <div className="flex items-center text-xs text-blue-600">
                                 <CalendarIcon className="w-3 h-3 mr-1" />
                                 <span>Lista Abre: {new Date(event.guest_list_open_datetime).toLocaleString('pt-BR')}</span>
                             </div>
                         )}
                         {event.guest_list_close_datetime && (
                              <div className="flex items-center text-xs text-red-600">
                                 <CalendarIcon className="w-3 h-3 mr-1" />
                                 <span>Lista Fecha: {new Date(event.guest_list_close_datetime).toLocaleString('pt-BR')}</span>
                             </div>
                         )}
                    </CardContent>
                </Card>

                {/* Ações específicas de Guest List (se aplicável) */}
                {event.type === 'guest-list' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Ações da Guest List</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-gray-500 mb-4 text-sm">
                                Acesse as funcionalidades de check-in e veja a página pública.
                            </p>
                            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                                {/* Links ajustados para usar event.id */}
                                <a href={`/app/organizador/checkin?event=${event.id}`}> {/* Ajustar este link se necessário */}
                                    <Button variant="outline" className="w-full">Check-in</Button>
                                </a>
                                <a href={`/g/${event.id}`} target="_blank" rel="noopener noreferrer"> {/* Ajustar este link se necessário */}
                                    <Button variant="default" className="w-full">Ver página pública</Button>
                                </a>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Seção de Associação de Equipas (USA DADOS DAS PROPS) */}
            <Card>
                <CardHeader>
                    <CardTitle>Associar Equipas</CardTitle>
                    <CardDescription>Selecione as equipas da sua organização para associar a este evento.</CardDescription>
                </CardHeader>
                <CardContent>
                   {/* Remover lógica de loading/error daqui, pois os dados vêm das props */}
                   {teams.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhuma equipa encontrada nesta organização.</p>
                    ) : (
                        <div className="space-y-3 max-h-60 overflow-y-auto pr-2 border rounded p-3">
                            {teams.map((team) => ( // Mapear `teams` das props
                                <div key={team.id} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`team-${team.id}`}
                                        checked={selectedTeamIds.has(team.id)} // Usa estado local `selectedTeamIds`
                                        onCheckedChange={(checked) => handleTeamSelectionChange(team.id, !!checked)}
                                        disabled={savingAssociations}
                                    />
                                    <Label htmlFor={`team-${team.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                        {team.name}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="mt-4 flex justify-end">
                        <Button
                            onClick={handleSaveAssociations}
                            disabled={savingAssociations || teams.length === 0}
                        >
                            {savingAssociations ? 'Salvando...' : 'Salvar Associações'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Placeholder: Seção de Estatísticas */}
            <Card>
                 <CardHeader>
                     <CardTitle>Estatísticas (Pendente)</CardTitle>
                     <CardDescription>Visão geral do desempenho da guest list.</CardDescription>
                 </CardHeader>
                 <CardContent className="grid gap-4 md:grid-cols-3">
                     <Card>
                         <CardHeader className="p-4"><CardTitle className="text-sm font-medium">Total Convidados</CardTitle></CardHeader>
                         <CardContent className="p-4 pt-0"><p className="text-2xl font-bold">-</p></CardContent>
                     </Card>
                     <Card>
                          <CardHeader className="p-4"><CardTitle className="text-sm font-medium">Top Equipas</CardTitle></CardHeader>
                         <CardContent className="p-4 pt-0"><p className="text-sm text-muted-foreground">(Pendente)</p></CardContent>
                     </Card>
                      <Card>
                          <CardHeader className="p-4"><CardTitle className="text-sm font-medium">Top Promotores</CardTitle></CardHeader>
                         <CardContent className="p-4 pt-0"><p className="text-sm text-muted-foreground">(Pendente)</p></CardContent>
                     </Card>
                 </CardContent>
             </Card>


            {/* Placeholder: Seção Lista Completa de Convidados */}
             <Card>
                 <CardHeader>
                     <CardTitle>Lista de Convidados (Pendente)</CardTitle>
                     <CardDescription>Todos os convidados registrados neste evento.</CardDescription>
                 </CardHeader>
                 <CardContent>
                     <p className="text-sm text-muted-foreground">
                         (Implementação da tabela de convidados pendente)
                     </p>
                 </CardContent>
             </Card>
        </>
    )
} 